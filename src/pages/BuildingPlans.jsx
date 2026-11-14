import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import useCurrentUser from "../lib/useCurrentUser";
import { ROLES } from "../lib/roles";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_MB,
  PLANS_BUCKET,
  PLANS_TABLE,
  PLAN_STATUSES,
  PLAN_TYPES,
  formatDate,
  formatFileSize,
  getFileExtension,
  getStatusClass,
  validatePlanFile,
} from "../lib/buildingPlans";
import "./BuildingPlans.css";

const emptyForm = {
  project_id: "",
  plan_title: "",
  plan_type: PLAN_TYPES[0],
  floor_level: "",
  revision: "R0",
  status: "Draft",
  description: "",
};

const MANAGER_ROLES = [ROLES.ENGINEER, ROLES.CONTRACTOR];

function BuildingPlans() {
  const { loading: userLoading, authUser, profile } = useCurrentUser();

  const canManage = MANAGER_ROLES.includes(profile?.role);

  const [plans, setPlans] = useState([]);
  const [projects, setProjects] = useState([]);
  const [uploaders, setUploaders] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  // -----------------------------------------
  // LOAD DATA
  // -----------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [plansResult, projectsResult] = await Promise.all([
      supabase
        .from(PLANS_TABLE)
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("project_id, project_name")
        .order("project_name", { ascending: true }),
    ]);

    if (plansResult.error) {
      setError(
        plansResult.error.message.includes("building_plans")
          ? "The building plans table was not found. Run supabase/civil_engineer_module.sql in the Supabase SQL editor first."
          : plansResult.error.message
      );
      setPlans([]);
    } else {
      setPlans(plansResult.data || []);
    }

    if (projectsResult.error) {
      setError((previous) => previous || projectsResult.error.message);
      setProjects([]);
    } else {
      setProjects(projectsResult.data || []);
    }

    // Best effort: show who uploaded each plan (may be hidden by RLS).
    const uploaderIds = [
      ...new Set(
        (plansResult.data || []).map((plan) => plan.uploaded_by).filter(Boolean)
      ),
    ];

    if (uploaderIds.length > 0) {
      const { data: userRows } = await supabase
        .from("users")
        .select("user_id, full_name")
        .in("user_id", uploaderIds);

      const map = {};
      (userRows || []).forEach((row) => {
        map[row.user_id] = row.full_name;
      });
      setUploaders(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -----------------------------------------
  // HELPERS
  // -----------------------------------------

  const projectNameById = useMemo(() => {
    const map = {};
    projects.forEach((project) => {
      map[String(project.project_id)] = project.project_name;
    });
    return map;
  }, [projects]);

  const filteredPlans = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return plans.filter((plan) => {
      const projectName = projectNameById[String(plan.project_id)] || "";

      const matchesSearch =
        !term ||
        [
          plan.plan_title,
          plan.plan_type,
          plan.floor_level,
          plan.revision,
          plan.description,
          plan.original_name,
          projectName,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesProject =
        projectFilter === "All" ||
        String(plan.project_id) === String(projectFilter);

      const matchesType = typeFilter === "All" || plan.plan_type === typeFilter;

      const matchesStatus =
        statusFilter === "All" || plan.status === statusFilter;

      return matchesSearch && matchesProject && matchesType && matchesStatus;
    });
  }, [plans, searchTerm, projectFilter, typeFilter, statusFilter, projectNameById]);

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4000);
  };

  // -----------------------------------------
  // MODAL
  // -----------------------------------------

  const openAddModal = () => {
    setEditingPlan(null);
    setFormData({
      ...emptyForm,
      project_id: projectFilter !== "All" ? String(projectFilter) : "",
    });
    setSelectedFile(null);
    setFileInputKey((key) => key + 1);
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      project_id: String(plan.project_id ?? ""),
      plan_title: plan.plan_title || "",
      plan_type: plan.plan_type || PLAN_TYPES[0],
      floor_level: plan.floor_level || "",
      revision: plan.revision || "R0",
      status: plan.status || "Draft",
      description: plan.description || "",
    });
    setSelectedFile(null);
    setFileInputKey((key) => key + 1);
    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingPlan(null);
    setSelectedFile(null);
    setFormError("");
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (file) {
      const problem = validatePlanFile(file);

      if (problem) {
        setFormError(problem);
        setSelectedFile(null);
        setFileInputKey((key) => key + 1);
        return;
      }
    }

    setFormError("");
    setSelectedFile(file);
  };

  // -----------------------------------------
  // SAVE (CREATE / UPDATE)
  // -----------------------------------------

  const uploadFile = async (file, projectId) => {
    const extension = getFileExtension(file.name);
    const storagePath = `${projectId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(PLANS_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    return storagePath;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!canManage) {
      setFormError("You do not have permission to manage building plans.");
      return;
    }

    if (!formData.project_id) {
      setFormError("Please select a project.");
      return;
    }

    if (!formData.plan_title.trim()) {
      setFormError("Please enter a plan title.");
      return;
    }

    if (!editingPlan && !selectedFile) {
      setFormError("Please choose a plan file to upload.");
      return;
    }

    if (selectedFile) {
      const problem = validatePlanFile(selectedFile);
      if (problem) {
        setFormError(problem);
        return;
      }
    }

    setSaving(true);

    let newPath = null;

    try {
      const payload = {
        project_id: formData.project_id,
        plan_title: formData.plan_title.trim(),
        plan_type: formData.plan_type,
        floor_level: formData.floor_level.trim() || null,
        revision: formData.revision.trim() || "R0",
        status: formData.status,
        description: formData.description.trim() || null,
      };

      if (selectedFile) {
        newPath = await uploadFile(selectedFile, formData.project_id);

        payload.storage_path = newPath;
        payload.original_name = selectedFile.name;
        payload.mime_type = selectedFile.type || null;
        payload.size_bytes = selectedFile.size;
      }

      if (editingPlan) {
        const { error: updateError } = await supabase
          .from(PLANS_TABLE)
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("plan_id", editingPlan.plan_id);

        if (updateError) throw updateError;

        // The file was replaced: remove the previous one.
        if (newPath && editingPlan.storage_path) {
          await supabase.storage
            .from(PLANS_BUCKET)
            .remove([editingPlan.storage_path]);
        }

        showNotice("Building plan updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from(PLANS_TABLE)
          .insert({ ...payload, uploaded_by: authUser?.id });

        if (insertError) throw insertError;

        showNotice("Building plan uploaded successfully.");
      }

      setShowModal(false);
      setEditingPlan(null);
      setSelectedFile(null);
      await loadData();
    } catch (err) {
      // Do not leave an orphaned file behind if saving the record failed.
      if (newPath) {
        await supabase.storage.from(PLANS_BUCKET).remove([newPath]);
      }

      setFormError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------
  // VIEW / DOWNLOAD / DELETE
  // -----------------------------------------

  const openPlanFile = async (plan, download = false) => {
    setBusyId(plan.plan_id);
    setError("");

    const { data, error: urlError } = await supabase.storage
      .from(PLANS_BUCKET)
      .createSignedUrl(
        plan.storage_path,
        120,
        download ? { download: plan.original_name || true } : undefined
      );

    setBusyId(null);

    if (urlError || !data?.signedUrl) {
      setError(urlError?.message || "Unable to open this file.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleDelete = async (plan) => {
    const confirmed = window.confirm(
      `Delete "${plan.plan_title}"? The uploaded file will be removed permanently.`
    );

    if (!confirmed) return;

    setBusyId(plan.plan_id);
    setError("");

    const { error: deleteError } = await supabase
      .from(PLANS_TABLE)
      .delete()
      .eq("plan_id", plan.plan_id);

    if (deleteError) {
      setError(deleteError.message);
      setBusyId(null);
      return;
    }

    if (plan.storage_path) {
      const { error: removeError } = await supabase.storage
        .from(PLANS_BUCKET)
        .remove([plan.storage_path]);

      if (removeError) {
        console.error("Plan record deleted but file removal failed:", removeError);
      }
    }

    setBusyId(null);
    showNotice("Building plan deleted.");
    await loadData();
  };

  // -----------------------------------------
  // RENDER
  // -----------------------------------------

  const isImage = (plan) =>
    ["png", "jpg", "jpeg", "webp"].includes(getFileExtension(plan.original_name));

  return (
    <div className="bp-page">
      <div className="bp-header">
        <div>
          <p className="bp-label">CIVIL ENGINEERING</p>
          <h1>Building Plans</h1>
          <p className="bp-subtitle">
            Upload, organise and share drawings, layouts and construction
            plans for every project.
          </p>
        </div>

        {canManage && (
          <button type="button" className="bp-primary-btn" onClick={openAddModal}>
            + Upload Plan
          </button>
        )}
      </div>

      {!userLoading && profile && !canManage && (
        <div className="bp-info">
          You have read-only access to building plans.
        </div>
      )}

      {error && (
        <div className="bp-alert bp-alert--error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="bp-alert bp-alert--success" role="status">
          {notice}
        </div>
      )}

      <div className="bp-toolbar">
        <input
          type="search"
          className="bp-search"
          placeholder="Search plans, floors, revisions..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          aria-label="Search building plans"
        />

        <select
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          aria-label="Filter by project"
        >
          <option value="All">All projects</option>
          {projects.map((project) => (
            <option key={project.project_id} value={project.project_id}>
              {project.project_name}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          aria-label="Filter by plan type"
        >
          <option value="All">All types</option>
          {PLAN_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by status"
        >
          <option value="All">All statuses</option>
          {PLAN_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <p className="bp-count">
        {loading
          ? "Loading plans..."
          : `${filteredPlans.length} of ${plans.length} plan${plans.length === 1 ? "" : "s"}`}
      </p>

      {!loading && filteredPlans.length === 0 && (
        <div className="bp-empty">
          <div className="bp-empty__icon" aria-hidden="true">
            📐
          </div>
          <h3>{plans.length === 0 ? "No building plans yet" : "No plans match your filters"}</h3>
          <p>
            {plans.length === 0
              ? canManage
                ? "Upload the first drawing to get started."
                : "Plans uploaded by the civil engineer will appear here."
              : "Try changing or clearing the search and filters."}
          </p>
        </div>
      )}

      <div className="bp-grid">
        {filteredPlans.map((plan) => (
          <article className="bp-card" key={plan.plan_id}>
            <div className="bp-card__top">
              <span className="bp-type">{plan.plan_type || "Plan"}</span>
              <span className={getStatusClass(plan.status)}>
                {plan.status || "Draft"}
              </span>
            </div>

            <h3 className="bp-card__title">{plan.plan_title}</h3>

            <p className="bp-card__project">
              {projectNameById[String(plan.project_id)] || "Unknown project"}
            </p>

            {plan.description && (
              <p className="bp-card__description">{plan.description}</p>
            )}

            <dl className="bp-meta">
              <div>
                <dt>Floor / Area</dt>
                <dd>{plan.floor_level || "-"}</dd>
              </div>
              <div>
                <dt>Revision</dt>
                <dd>{plan.revision || "-"}</dd>
              </div>
              <div>
                <dt>File</dt>
                <dd>
                  {getFileExtension(plan.original_name).toUpperCase() || "-"} ·{" "}
                  {formatFileSize(plan.size_bytes)}
                </dd>
              </div>
              <div>
                <dt>Uploaded</dt>
                <dd>{formatDate(plan.created_at)}</dd>
              </div>
            </dl>

            <p className="bp-card__footer">
              {plan.original_name}
              {uploaders[plan.uploaded_by] ? ` · by ${uploaders[plan.uploaded_by]}` : ""}
            </p>

            <div className="bp-actions">
              <button
                type="button"
                className="bp-btn"
                disabled={busyId === plan.plan_id}
                onClick={() => openPlanFile(plan, false)}
              >
                {isImage(plan) || getFileExtension(plan.original_name) === "pdf"
                  ? "View"
                  : "Open"}
              </button>

              <button
                type="button"
                className="bp-btn"
                disabled={busyId === plan.plan_id}
                onClick={() => openPlanFile(plan, true)}
              >
                Download
              </button>

              {canManage && (
                <>
                  <button
                    type="button"
                    className="bp-btn"
                    disabled={busyId === plan.plan_id}
                    onClick={() => openEditModal(plan)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="bp-btn bp-btn--danger"
                    disabled={busyId === plan.plan_id}
                    onClick={() => handleDelete(plan)}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>

      {showModal && (
        <div className="bp-overlay" onMouseDown={closeModal}>
          <div
            className="bp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bp-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="bp-modal__header">
              <h2 id="bp-modal-title">
                {editingPlan ? "Edit Building Plan" : "Upload Building Plan"}
              </h2>
              <button
                type="button"
                className="bp-close"
                onClick={closeModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="bp-form">
              {formError && (
                <div className="bp-alert bp-alert--error" role="alert">
                  {formError}
                </div>
              )}

              <label className="bp-field">
                <span>Project *</span>
                <select
                  name="project_id"
                  value={formData.project_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.project_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="bp-field">
                <span>Plan title *</span>
                <input
                  type="text"
                  name="plan_title"
                  value={formData.plan_title}
                  onChange={handleInputChange}
                  placeholder="e.g. Ground Floor Layout"
                  maxLength={150}
                  required
                />
              </label>

              <div className="bp-row">
                <label className="bp-field">
                  <span>Plan type</span>
                  <select
                    name="plan_type"
                    value={formData.plan_type}
                    onChange={handleInputChange}
                  >
                    {PLAN_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="bp-field">
                  <span>Status</span>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    {PLAN_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="bp-row">
                <label className="bp-field">
                  <span>Floor / Area</span>
                  <input
                    type="text"
                    name="floor_level"
                    value={formData.floor_level}
                    onChange={handleInputChange}
                    placeholder="e.g. Ground Floor, Block B"
                    maxLength={80}
                  />
                </label>

                <label className="bp-field">
                  <span>Revision</span>
                  <input
                    type="text"
                    name="revision"
                    value={formData.revision}
                    onChange={handleInputChange}
                    placeholder="R0"
                    maxLength={20}
                  />
                </label>
              </div>

              <label className="bp-field">
                <span>Description / notes</span>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  maxLength={500}
                  placeholder="Optional notes for the team"
                />
              </label>

              <label className="bp-field">
                <span>
                  {editingPlan ? "Replace file (optional)" : "Plan file *"}
                </span>
                <input
                  key={fileInputKey}
                  type="file"
                  accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
                  onChange={handleFileChange}
                />
                <small>
                  {ALLOWED_EXTENSIONS.join(", ").toUpperCase()} · up to{" "}
                  {MAX_FILE_SIZE_MB} MB
                  {editingPlan?.original_name
                    ? ` · current: ${editingPlan.original_name}`
                    : ""}
                </small>
              </label>

              <div className="bp-form__actions">
                <button
                  type="button"
                  className="bp-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="bp-primary-btn" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingPlan
                      ? "Save Changes"
                      : "Upload Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BuildingPlans;

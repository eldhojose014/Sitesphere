import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./SupervisorMaterialRequests.css";

const SupervisorMaterialRequests = () => {
  const [projects, setProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    project_id: "",
    material_id: "",
    request_by: "",
    quantity: "",
    request_date: new Date().toISOString().split("T")[0],
  });

  // --------------------------------------------------
  // LOAD FORM DATA
  // --------------------------------------------------

  useEffect(() => {
    fetchFormData();
    fetchRequests();
  }, []);

  const fetchFormData = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        projectsResult,
        materialsResult,
        usersResult,
      ] = await Promise.all([
        // PROJECTS
        supabase
          .from("projects")
          .select("project_id, project_name")
          .order("project_name", {
            ascending: true,
          }),

        // MATERIALS
        supabase
          .from("materials")
          .select(
            "material_id, material_name, unit, quantity, unit_price, supplier"
          )
          .order("material_name", {
            ascending: true,
          }),

        // SITE SUPERVISORS
        // Only use columns known to exist.
        supabase
          .from("users")
          .select("user_id, role")
          .eq("role", "Site Supervisor")
          .order("user_id", {
            ascending: true,
          }),
      ]);

      if (projectsResult.error) {
        throw new Error(
          `Projects: ${projectsResult.error.message}`
        );
      }

      if (materialsResult.error) {
        throw new Error(
          `Materials: ${materialsResult.error.message}`
        );
      }

      if (usersResult.error) {
        throw new Error(
          `Users: ${usersResult.error.message}`
        );
      }

      setProjects(projectsResult.data || []);
      setMaterials(materialsResult.data || []);
      setSupervisors(usersResult.data || []);
    } catch (err) {
      console.error("Error loading form:", err);

      setError(
        err.message || "Unable to load form data."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // LOAD MATERIAL REQUESTS
  // --------------------------------------------------

  const fetchRequests = async () => {
    setRequestsLoading(true);

    const { data, error } = await supabase
      .from("material_request")
      .select("*")
      .order("request_date", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Error loading material requests:",
        error
      );

      setError(error.message);
      setRequestsLoading(false);
      return;
    }

    setRequests(data || []);
    setRequestsLoading(false);
  };

  // --------------------------------------------------
  // HANDLE INPUT
  // --------------------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // --------------------------------------------------
  // SUBMIT MATERIAL REQUEST
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    // VALIDATION

    if (!formData.project_id) {
      setError("Please select a project.");
      return;
    }

    if (!formData.material_id) {
      setError("Please select a material.");
      return;
    }

    if (!formData.request_by) {
      setError("Please select the Site Supervisor.");
      return;
    }

    if (
      !formData.quantity ||
      Number(formData.quantity) <= 0
    ) {
      setError("Please enter a valid quantity.");
      return;
    }

    if (!formData.request_date) {
      setError("Please select the request date.");
      return;
    }

    setSaving(true);

    try {
      // project_id is UUID -> keep as string
      // material_id is UUID -> keep as string
      // request_by is integer -> Number()
      // quantity -> Number()

      const requestData = {
        project_id: formData.project_id,
        material_id: formData.material_id,
        request_by: Number(formData.request_by),
        quantity: Number(formData.quantity),
        request_date: formData.request_date,
        status: "Pending",
      };

      console.log(
        "Submitting material request:",
        requestData
      );

      const { data, error: insertError } =
        await supabase
          .from("material_request")
          .insert([requestData])
          .select()
          .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      console.log(
        "Material request created:",
        data
      );

      setSuccess(
        "Material request submitted successfully. It is now waiting for Contractor approval."
      );

      // Reset form
      setFormData({
        project_id: "",
        material_id: "",
        request_by: "",
        quantity: "",
        request_date: new Date()
          .toISOString()
          .split("T")[0],
      });

      // Refresh request history immediately
      await fetchRequests();
    } catch (err) {
      console.error(
        "Material request error:",
        err
      );

      setError(
        err.message ||
          "Unable to submit material request."
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // SELECTED MATERIAL
  // --------------------------------------------------

  const selectedMaterial = materials.find(
    (material) =>
      String(material.material_id) ===
      String(formData.material_id)
  );

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const getProjectName = (projectId) => {
    const project = projects.find(
      (item) =>
        String(item.project_id) ===
        String(projectId)
    );

    return project
      ? project.project_name
      : "Unknown Project";
  };

  const getMaterialName = (materialId) => {
    const material = materials.find(
      (item) =>
        String(item.material_id) ===
        String(materialId)
    );

    if (!material) {
      return "Unknown Material";
    }

    return material.unit
      ? `${material.material_name} (${material.unit})`
      : material.material_name;
  };

  const getStatusClass = (status) => {
    if (!status) {
      return "pending";
    }

    return String(status).toLowerCase();
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="supervisor-request-page">
        <div className="request-loading">
          <div className="loader"></div>

          <p>
            Loading material request form...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="supervisor-request-page">

      {/* HEADER */}

      <div className="supervisor-request-header">
        <div>
          <span className="page-label">
            SITE SUPERVISOR
          </span>

          <h1>Material Request</h1>

          <p>
            Request construction materials from the
            Contractor / Administrator.
          </p>
        </div>
      </div>

      {/* SUCCESS */}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* FORM CARD */}

      <div className="request-form-card">

        <div className="request-form-header">
          <h2>
            New Material Request
          </h2>

          <p>
            Enter the material required for the
            selected project.
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="request-form-grid">

            {/* PROJECT */}

            <div className="form-group">
              <label htmlFor="project_id">
                Project *
              </label>

              <select
                id="project_id"
                name="project_id"
                value={formData.project_id}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select project
                </option>

                {projects.map((project) => (
                  <option
                    key={project.project_id}
                    value={project.project_id}
                  >
                    {project.project_name}
                  </option>
                ))}
              </select>

              {projects.length === 0 && (
                <small>
                  No projects found in Supabase.
                </small>
              )}
            </div>

            {/* MATERIAL */}

            <div className="form-group">
              <label htmlFor="material_id">
                Material *
              </label>

              <select
                id="material_id"
                name="material_id"
                value={formData.material_id}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select material
                </option>

                {materials.map((material) => (
                  <option
                    key={material.material_id}
                    value={material.material_id}
                  >
                    {material.material_name}

                    {material.unit
                      ? ` (${material.unit})`
                      : ""}
                  </option>
                ))}
              </select>

              {materials.length === 0 && (
                <small>
                  No materials found in Supabase.
                  Add materials before creating a
                  request.
                </small>
              )}
            </div>

            {/* SITE SUPERVISOR */}

            <div className="form-group">
              <label htmlFor="request_by">
                Site Supervisor *
              </label>

              <select
                id="request_by"
                name="request_by"
                value={formData.request_by}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select supervisor
                </option>

                {supervisors.map((supervisor) => (
                  <option
                    key={supervisor.user_id}
                    value={supervisor.user_id}
                  >
                    User ID {supervisor.user_id}
                  </option>
                ))}
              </select>

              {supervisors.length === 0 && (
                <small>
                  No Site Supervisor found in
                  Supabase.
                </small>
              )}
            </div>

            {/* QUANTITY */}

            <div className="form-group">
              <label htmlFor="quantity">
                Quantity
                {selectedMaterial?.unit
                  ? ` (${selectedMaterial.unit})`
                  : ""}
                {" *"}
              </label>

              <input
                id="quantity"
                name="quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="Enter required quantity"
                required
              />

              {selectedMaterial && (
                <small>
                  Available quantity:{" "}
                  {selectedMaterial.quantity ?? 0}{" "}
                  {selectedMaterial.unit || ""}
                </small>
              )}
            </div>

            {/* REQUEST DATE */}

            <div className="form-group">
              <label htmlFor="request_date">
                Request Date *
              </label>

              <input
                id="request_date"
                name="request_date"
                type="date"
                value={formData.request_date}
                onChange={handleChange}
                required
              />
            </div>

          </div>

          {/* REQUEST INFORMATION */}

          <div className="request-info">

            <div>
              <strong>
                Request Status
              </strong>

              <span>
                Pending
              </span>
            </div>

            <p>
              After submission, this request will
              appear on the Contractor dashboard.
              The Contractor can then approve or
              reject the request.
            </p>

          </div>

          {/* ACTIONS */}

          <div className="form-actions">

            <button
              type="submit"
              className="submit-request-btn"
              disabled={
                saving ||
                projects.length === 0 ||
                materials.length === 0 ||
                supervisors.length === 0
              }
            >
              {saving
                ? "Submitting..."
                : "Submit Material Request"}
            </button>

          </div>

        </form>

      </div>

      {/* ==========================================
          REQUEST HISTORY
      ========================================== */}

      <div className="request-history-card">

        <div className="request-history-header">
          <div>
            <span className="page-label">
              REQUEST HISTORY
            </span>

            <h2>
              Material Requests
            </h2>

            <p>
              Track the approval status of material
              requests submitted to the Contractor.
            </p>
          </div>

          <button
            type="button"
            className="refresh-requests-btn"
            onClick={fetchRequests}
            disabled={requestsLoading}
          >
            {requestsLoading
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {requestsLoading ? (
          <div className="request-history-loading">
            <div className="loader"></div>

            <p>
              Loading requests...
            </p>
          </div>
        ) : requests.length === 0 ? (
          <div className="request-history-empty">
            <h3>
              No material requests yet
            </h3>

            <p>
              Submitted material requests will
              appear here.
            </p>
          </div>
        ) : (
          <div className="request-history-table-wrapper">

            <table className="request-history-table">

              <thead>
                <tr>
                  <th>Project</th>
                  <th>Material</th>
                  <th>Quantity</th>
                  <th>Requested By</th>
                  <th>Request Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>

                {requests.map((request) => (
                  <tr key={request.request_id}>

                    <td>
                      {getProjectName(
                        request.project_id
                      )}
                    </td>

                    <td>
                      {getMaterialName(
                        request.material_id
                      )}
                    </td>

                    <td>
                      {request.quantity}
                    </td>

                    <td>
                      User ID {request.request_by}
                    </td>

                    <td>
                      {request.request_date}
                    </td>

                    <td>
                      <span
                        className={`request-status ${getStatusClass(
                          request.status
                        )}`}
                      >
                        {request.status || "Pending"}
                      </span>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
};

export default SupervisorMaterialRequests;
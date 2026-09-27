import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./Labours.css";

const emptyForm = {
  labour_name: "",
  phone: "",
  designation: "",
  wages: "",
  joining_date: "",
};

function Labours() {
  const [labours, setLabours] = useState([]);
  const [projects, setProjects] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [editingLabour, setEditingLabour] = useState(null);
  const [assigningLabour, setAssigningLabour] = useState(null);

  const [formData, setFormData] = useState(emptyForm);
  const [selectedProject, setSelectedProject] = useState("");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    fetchLabours();
    fetchProjects();
  }, []);

  const fetchLabours = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("labours")
      .select(
        "labour_id, project_id, labour_name, phone, designation, wages, joining_date"
      )
      .order("joining_date", { ascending: false });

    if (error) {
      setError(error.message);
      setLabours([]);
    } else {
      setLabours(data || []);
    }

    setLoading(false);
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("project_id, project_name")
      .order("project_name", { ascending: true });

    if (error) {
      setError(error.message);
      setProjects([]);
      return;
    }

    setProjects(data || []);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openAddModal = () => {
    setEditingLabour(null);
    setFormData(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (labour) => {
    setEditingLabour(labour);

    setFormData({
      labour_name: labour.labour_name || "",
      phone: labour.phone || "",
      designation: labour.designation || "",
      wages: labour.wages ?? "",
      joining_date: labour.joining_date || "",
    });

    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingLabour(null);
    setFormData(emptyForm);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSaving(true);

    if (
      !formData.labour_name.trim() ||
      !formData.phone.trim() ||
      !formData.designation.trim() ||
      !formData.wages ||
      !formData.joining_date
    ) {
      setError("Please fill in all fields.");
      setSaving(false);
      return;
    }

    const labourData = {
      labour_name: formData.labour_name.trim(),
      phone: formData.phone.trim(),
      designation: formData.designation.trim(),
      wages: Number(formData.wages),
      joining_date: formData.joining_date,
    };

    try {
      let result;

      if (editingLabour) {
        result = await supabase
          .from("labours")
          .update(labourData)
          .eq("labour_id", editingLabour.labour_id);
      } else {
        // IMPORTANT:
        // project_id is intentionally NOT included here.
        // New labours start as unassigned.
        result = await supabase
          .from("labours")
          .insert([labourData]);
      }

      if (result.error) {
        throw result.error;
      }

      setShowModal(false);
      setEditingLabour(null);
      setFormData(emptyForm);

      await fetchLabours();
    } catch (err) {
      setError(err.message || "Failed to save labour.");
    } finally {
      setSaving(false);
    }
  };

  const openAssignModal = (labour) => {
    setAssigningLabour(labour);
    setSelectedProject("");
    setError("");
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    if (assigning) return;

    setShowAssignModal(false);
    setAssigningLabour(null);
    setSelectedProject("");
    setError("");
  };

  const handleAssign = async () => {
    if (!assigningLabour) return;

    if (!selectedProject) {
      setError("Please select a project.");
      return;
    }

    setError("");
    setAssigning(true);

    try {
      // Check current assignment first.
      const { data: currentLabour, error: checkError } = await supabase
        .from("labours")
        .select("labour_id, project_id")
        .eq("labour_id", assigningLabour.labour_id)
        .single();

      if (checkError) {
        throw checkError;
      }

      // A labour cannot be assigned to another project
      // while already assigned.
      if (currentLabour.project_id) {
        throw new Error(
          "This labour is already assigned to a project. Unassign them first."
        );
      }

      const { error: updateError } = await supabase
        .from("labours")
        .update({
          project_id: selectedProject,
        })
        .eq("labour_id", assigningLabour.labour_id)
        .is("project_id", null);

      if (updateError) {
        throw updateError;
      }

      setShowAssignModal(false);
      setAssigningLabour(null);
      setSelectedProject("");

      await fetchLabours();
    } catch (err) {
      setError(err.message || "Failed to assign labour.");
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async (labour) => {
    const confirmed = window.confirm(
      `Unassign ${labour.labour_name} from the current project?`
    );

    if (!confirmed) return;

    setError("");

    const { error: updateError } = await supabase
      .from("labours")
      .update({
        project_id: null,
      })
      .eq("labour_id", labour.labour_id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await fetchLabours();
  };

  const handleDelete = async (labour) => {
    const confirmed = window.confirm(
      `Delete labour "${labour.labour_name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setError("");

    const { error: deleteError } = await supabase
      .from("labours")
      .delete()
      .eq("labour_id", labour.labour_id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await fetchLabours();
  };

  const getProjectName = (projectId) => {
    if (!projectId) {
      return "Not Assigned";
    }

    const project = projects.find(
      (item) => item.project_id === projectId
    );

    return project ? project.project_name : "Unknown Project";
  };

  const filteredLabours = labours.filter((labour) => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) return true;

    return (
      (labour.labour_name || "").toLowerCase().includes(searchText) ||
      (labour.phone || "").toLowerCase().includes(searchText) ||
      (labour.designation || "").toLowerCase().includes(searchText)
    );
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Labours</h1>
          <p>Manage labour records and project assignments.</p>
        </div>

        <button className="primary-button" onClick={openAddModal}>
          + Add Labour
        </button>
      </div>

      {error && !showModal && !showAssignModal && (
        <div className="error-message">{error}</div>
      )}

      <div className="search-section">
        <input
          type="text"
          placeholder="Search by name, phone or designation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-card">
        <div className="table-header">
          <div>
            <h2>Labour Records</h2>
            <p>{filteredLabours.length} labours</p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading labours...</div>
        ) : filteredLabours.length === 0 ? (
          <div className="empty-state">
            No labour records found.
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Labour Name</th>
                  <th>Phone</th>
                  <th>Designation</th>
                  <th>Wages / Day</th>
                  <th>Joining Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredLabours.map((labour) => (
                  <tr key={labour.labour_id}>
                    <td>
                      <span
                        className={
                          labour.project_id
                            ? "status-badge assigned"
                            : "status-badge unassigned"
                        }
                      >
                        {getProjectName(labour.project_id)}
                      </span>
                    </td>

                    <td>{labour.labour_name}</td>

                    <td>{labour.phone}</td>

                    <td>{labour.designation}</td>

                    <td>₹{Number(labour.wages).toLocaleString("en-IN")}</td>

                    <td>{labour.joining_date}</td>

                    <td>
                      <div className="action-buttons">
                        <button
                          className="secondary-button"
                          onClick={() => openEditModal(labour)}
                        >
                          Edit
                        </button>

                        {!labour.project_id ? (
                          <button
                            className="primary-small-button"
                            onClick={() => openAssignModal(labour)}
                          >
                            Assign
                          </button>
                        ) : (
                          <button
                            className="warning-button"
                            onClick={() => handleUnassign(labour)}
                          >
                            Unassign
                          </button>
                        )}

                        <button
                          className="danger-button"
                          onClick={() => handleDelete(labour)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT LABOUR MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingLabour ? "Edit Labour" : "Add Labour"}
                </h2>

                <p>
                  {editingLabour
                    ? "Update labour details."
                    : "Add a new labour record."}
                </p>
              </div>

              <button
                className="close-button"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            {error && (
              <div className="error-message modal-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Labour Name</label>
                  <input
                    type="text"
                    name="labour_name"
                    value={formData.labour_name}
                    onChange={handleChange}
                    placeholder="Enter labour name"
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="form-group">
                  <label>Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    placeholder="e.g. Mason"
                  />
                </div>

                <div className="form-group">
                  <label>Wages / Day</label>
                  <input
                    type="number"
                    name="wages"
                    value={formData.wages}
                    onChange={handleChange}
                    placeholder="Enter daily wages"
                    min="0"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Joining Date</label>
                  <input
                    type="date"
                    name="joining_date"
                    value={formData.joining_date}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingLabour
                    ? "Update Labour"
                    : "Save Labour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN PROJECT MODAL */}
      {showAssignModal && assigningLabour && (
        <div className="modal-overlay">
          <div className="modal small-modal">
            <div className="modal-header">
              <div>
                <h2>Assign Labour</h2>

                <p>
                  Assign {assigningLabour.labour_name} to a project.
                </p>
              </div>

              <button
                className="close-button"
                onClick={closeAssignModal}
                disabled={assigning}
              >
                ×
              </button>
            </div>

            {error && (
              <div className="error-message modal-error">
                {error}
              </div>
            )}

            <div className="form-group">
              <label>Project</label>

              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="">Select project</option>

                {projects.map((project) => (
                  <option
                    key={project.project_id}
                    value={project.project_id}
                  >
                    {project.project_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={closeAssignModal}
                disabled={assigning}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={handleAssign}
                disabled={assigning}
              >
                {assigning ? "Assigning..." : "Assign Labour"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Labours;
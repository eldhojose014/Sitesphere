import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./Projects.css";

const emptyForm = {
  project_name: "",
  location: "",
  client_name: "",
  start_date: "",
  end_date: "",
  budget: "",
  status: "Planning",
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("project_id", { ascending: false });

    if (error) {
      setError(error.message);
      setProjects([]);
    } else {
      setProjects(data || []);
    }

    setLoading(false);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openAddModal = () => {
    setEditingProject(null);
    setFormData(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (project) => {
    setEditingProject(project);

    setFormData({
      project_name: project.project_name || "",
      location: project.location || "",
      client_name: project.client_name || "",
      start_date: project.start_date || "",
      end_date: project.end_date || "",
      budget: project.budget ?? "",
      status: project.status || "Planning",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingProject(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const projectData = {
      project_name: formData.project_name.trim(),
      location: formData.location.trim(),
      client_name: formData.client_name.trim(),
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      budget: formData.budget === "" ? null : Number(formData.budget),
      status: formData.status,
    };

    if (!projectData.project_name) {
      setError("Project name is required.");
      setSaving(false);
      return;
    }

    if (editingProject) {
      const { error } = await supabase
        .from("projects")
        .update(projectData)
        .eq("project_id", editingProject.project_id);

      if (error) {
        setError(error.message);
      } else {
        setSuccess("Project updated successfully.");
        await fetchProjects();
        setShowModal(false);
      }
    } else {
      const { error } = await supabase
        .from("projects")
        .insert([projectData]);

      if (error) {
        setError(error.message);
      } else {
        setSuccess("Project added successfully.");
        await fetchProjects();
        setShowModal(false);
      }
    }

    setSaving(false);
  };

  const handleDelete = async (project) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.project_name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("project_id", project.project_id);

    if (error) {
      setError(error.message);
      return;
    }

    setProjects((previous) =>
      previous.filter(
        (item) => item.project_id !== project.project_id
      )
    );

    setSuccess("Project deleted successfully.");
  };

  const filteredProjects = projects.filter((project) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      (project.project_name || "").toLowerCase().includes(search) ||
      (project.location || "").toLowerCase().includes(search) ||
      (project.client_name || "").toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "All" ||
      (project.status || "").toLowerCase() ===
        statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value));
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="projects-page">
      <div className="projects-header">
        <div>
          <h1>Projects</h1>
          <p>Manage construction projects and project information.</p>
        </div>

        <button className="add-project-btn" onClick={openAddModal}>
          + Add Project
        </button>
      </div>

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {error && !showModal && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="projects-toolbar">
        <div className="search-box">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search project, location or client..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Planning">Planning</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="On Hold">On Hold</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div className="projects-card">
        <div className="projects-card-header">
          <div>
            <h2>Project List</h2>
            <span>
              {filteredProjects.length} project
              {filteredProjects.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="projects-state">
            <div className="loader"></div>
            <p>Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="projects-state">
            <div className="empty-icon">📁</div>
            <h3>No projects found</h3>
            <p>
              {projects.length === 0
                ? "There are no projects in Supabase yet."
                : "No projects match your current search or filter."}
            </p>

            {projects.length === 0 && (
              <button
                className="add-project-btn"
                onClick={openAddModal}
              >
                + Add First Project
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="projects-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Location</th>
                  <th>Client</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Budget</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.project_id}>
                    <td>
                      <div className="project-name">
                        {project.project_name || "—"}
                      </div>
                      <small>
                        ID: {project.project_id}
                      </small>
                    </td>

                    <td>{project.location || "—"}</td>

                    <td>{project.client_name || "—"}</td>

                    <td>{formatDate(project.start_date)}</td>

                    <td>{formatDate(project.end_date)}</td>

                    <td>{formatCurrency(project.budget)}</td>

                    <td>
                      <span
                        className={`status-badge status-${(
                          project.status || "unknown"
                        )
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {project.status || "—"}
                      </span>
                    </td>

                    <td>
                      <div className="action-buttons">
                        <button
                          className="edit-btn"
                          onClick={() => openEditModal(project)}
                        >
                          Edit
                        </button>

                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(project)}
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

      {showModal && (
        <div className="modal-overlay">
          <div className="project-modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingProject
                    ? "Edit Project"
                    : "Add Project"}
                </h2>

                <p>
                  {editingProject
                    ? "Update the project information."
                    : "Enter the project information."}
                </p>
              </div>

              <button
                className="modal-close"
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
                <div className="form-group full-width">
                  <label htmlFor="project_name">
                    Project Name *
                  </label>

                  <input
                    id="project_name"
                    name="project_name"
                    type="text"
                    value={formData.project_name}
                    onChange={handleInputChange}
                    placeholder="Enter project name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="location">
                    Location
                  </label>

                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Project location"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="client_name">
                    Client Name
                  </label>

                  <input
                    id="client_name"
                    name="client_name"
                    type="text"
                    value={formData.client_name}
                    onChange={handleInputChange}
                    placeholder="Client name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="start_date">
                    Start Date
                  </label>

                  <input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="end_date">
                    End Date
                  </label>

                  <input
                    id="end_date"
                    name="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="budget">
                    Budget
                  </label>

                  <input
                    id="budget"
                    name="budget"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.budget}
                    onChange={handleInputChange}
                    placeholder="Enter project budget"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="status">
                    Status
                  </label>

                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingProject
                    ? "Update Project"
                    : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
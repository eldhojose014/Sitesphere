import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./Users.css";

const ROLES = [
  "Contractor/Administrator",
  "Civil Engineer",
  "Site Supervisor",
  "Accountant",
];

const STATUS_OPTIONS = ["Active", "Inactive"];

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  role: "Contractor/Administrator",
  status: "Active",
};

const Users = () => {
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("users")
      .select(
        "user_id, full_name, email, phone, password, role, status"
      )
      .order("user_id", { ascending: true });

    if (error) {
      setError(error.message);
      setUsers([]);
    } else {
      setUsers(data || []);
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
    setEditingUser(null);
    setFormData(emptyForm);
    setError("");
    setSuccess("");
    setShowPassword(false);
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);

    setFormData({
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      password: user.password || "",
      role: user.role || "Contractor/Administrator",
      status: user.status || "Active",
    });

    setError("");
    setSuccess("");
    setShowPassword(false);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingUser(null);
    setFormData(emptyForm);
    setShowPassword(false);
  };

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      return "Full name is required.";
    }

    if (!formData.email.trim()) {
      return "Email is required.";
    }

    if (!formData.role) {
      return "Role is required.";
    }

    if (!editingUser && !formData.password.trim()) {
      return "Password is required when creating a user.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setSaving(false);
      return;
    }

    const userData = {
      full_name: formData.full_name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      role: formData.role,
      status: formData.status,
    };

    /*
      Password is included when creating a user.

      When editing:
      - If password is changed/entered, update it.
      - Otherwise leave the existing password unchanged.
    */
    if (!editingUser) {
      userData.password = formData.password;
    } else if (formData.password.trim()) {
      userData.password = formData.password;
    }

    if (editingUser) {
      const { error } = await supabase
        .from("users")
        .update(userData)
        .eq("user_id", editingUser.user_id);

      if (error) {
        setError(error.message);
      } else {
        setSuccess("User updated successfully.");
        await fetchUsers();
        setShowModal(false);
      }
    } else {
      const { error } = await supabase
        .from("users")
        .insert([userData]);

      if (error) {
        setError(error.message);
      } else {
        setSuccess("User added successfully.");
        await fetchUsers();
        setShowModal(false);
      }
    }

    setSaving(false);
  };

  const handleDelete = async (user) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${user.full_name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("user_id", user.user_id);

    if (error) {
      setError(error.message);
      return;
    }

    setUsers((previous) =>
      previous.filter(
        (item) => item.user_id !== user.user_id
      )
    );

    setSuccess("User deleted successfully.");
  };

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      (user.full_name || "").toLowerCase().includes(search) ||
      (user.email || "").toLowerCase().includes(search) ||
      (user.phone || "").toLowerCase().includes(search);

    const matchesRole =
      roleFilter === "All" ||
      (user.role || "").toLowerCase() ===
        roleFilter.toLowerCase();

    const matchesStatus =
      statusFilter === "All" ||
      (user.status || "").toLowerCase() ===
        statusFilter.toLowerCase();

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleClass = (role) => {
    if (!role) return "role-default";

    if (role === "Contractor/Administrator") {
      return "role-contractor";
    }

    if (role === "Civil Engineer") {
      return "role-engineer";
    }

    if (role === "Site Supervisor") {
      return "role-supervisor";
    }

    if (role === "Accountant") {
      return "role-accountant";
    }

    return "role-default";
  };

  return (
    <div className="users-page">
      <div className="users-header">
        <div>
          <h1>Users</h1>
          <p>
            Manage SiteSphere users, roles and account status.
          </p>
        </div>

        <button
          className="add-user-btn"
          onClick={openAddModal}
        >
          + Add User
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

      <div className="users-toolbar">
        <div className="search-box">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Search name, email or phone..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />
        </div>

        <select
          value={roleFilter}
          onChange={(event) =>
            setRoleFilter(event.target.value)
          }
        >
          <option value="All">All Roles</option>

          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
        >
          <option value="All">All Statuses</option>

          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="users-card">
        <div className="users-card-header">
          <div>
            <h2>User List</h2>

            <span>
              {filteredUsers.length} user
              {filteredUsers.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="users-state">
            <div className="loader"></div>
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="users-state">
            <div className="empty-icon">👤</div>

            <h3>No users found</h3>

            <p>
              {users.length === 0
                ? "There are no users in Supabase yet."
                : "No users match your current filters."}
            </p>

            {users.length === 0 && (
              <button
                className="add-user-btn"
                onClick={openAddModal}
              >
                + Add First User
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {(user.full_name || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <div className="user-name">
                            {user.full_name || "—"}
                          </div>

                          <small>
                            ID: {user.user_id}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>{user.email || "—"}</td>

                    <td>{user.phone || "—"}</td>

                    <td>
                      <span
                        className={`role-badge ${getRoleClass(
                          user.role
                        )}`}
                      >
                        {user.role || "—"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`user-status ${
                          (user.status || "")
                            .toLowerCase() === "active"
                            ? "status-active"
                            : "status-inactive"
                        }`}
                      >
                        {user.status || "—"}
                      </span>
                    </td>

                    <td>
                      <div className="action-buttons">
                        <button
                          className="edit-btn"
                          onClick={() =>
                            openEditModal(user)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="delete-btn"
                          onClick={() =>
                            handleDelete(user)
                          }
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
          <div className="user-modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingUser
                    ? "Edit User"
                    : "Add User"}
                </h2>

                <p>
                  {editingUser
                    ? "Update the user's information."
                    : "Create a new SiteSphere user."}
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
                  <label htmlFor="full_name">
                    Full Name *
                  </label>

                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    maxLength="100"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">
                    Email *
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    maxLength="100"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">
                    Phone
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    maxLength="15"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="role">
                    Role *
                  </label>

                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
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
                    {STATUS_OPTIONS.map((status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="password">
                    Password
                    {editingUser
                      ? " (leave blank to keep current password)"
                      : " *"}
                  </label>

                  <div className="password-input">
                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword ? "text" : "password"
                      }
                      maxLength="255"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder={
                        editingUser
                          ? "Enter new password only if changing it"
                          : "Enter password"
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (previous) => !previous
                        )
                      }
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
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
                    : editingUser
                    ? "Update User"
                    : "Save User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
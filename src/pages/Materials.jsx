import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./Materials.css";

const emptyForm = {
  material_name: "",
  unit: "",
  quantity: "",
  unit_price: "",
  supplier: "",
};

const Materials = () => {
  const [materials, setMaterials] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("materials")
      .select(
        "material_id, material_name, unit, quantity, unit_price, supplier"
      )
      .order("material_name", { ascending: true });

    if (error) {
      setError(error.message);
      setMaterials([]);
    } else {
      setMaterials(data || []);
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
    setEditingMaterial(null);
    setFormData(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (material) => {
    setEditingMaterial(material);

    setFormData({
      material_name: material.material_name || "",
      unit: material.unit || "",
      quantity: material.quantity ?? "",
      unit_price: material.unit_price ?? "",
      supplier: material.supplier || "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingMaterial(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.material_name.trim()) {
      setError("Material name is required.");
      return;
    }

    if (!formData.unit.trim()) {
      setError("Unit is required.");
      return;
    }

    if (
      formData.quantity === "" ||
      Number(formData.quantity) < 0
    ) {
      setError("Please enter a valid quantity.");
      return;
    }

    if (
      formData.unit_price === "" ||
      Number(formData.unit_price) < 0
    ) {
      setError("Please enter a valid unit price.");
      return;
    }

    setSaving(true);

    const materialData = {
      material_name: formData.material_name.trim(),
      unit: formData.unit.trim(),
      quantity: formData.quantity,
      unit_price: Number(formData.unit_price),
      supplier: formData.supplier.trim(),
    };

    if (editingMaterial) {
      const { error } = await supabase
        .from("materials")
        .update(materialData)
        .eq("material_id", editingMaterial.material_id);

      if (error) {
        setError(error.message);
      } else {
        setSuccess("Material updated successfully.");
        await fetchMaterials();
        setShowModal(false);
      }
    } else {
      const { error } = await supabase
        .from("materials")
        .insert([materialData]);

      if (error) {
        setError(error.message);
      } else {
        setSuccess("Material added successfully.");
        await fetchMaterials();
        setShowModal(false);
      }
    }

    setSaving(false);
  };

  const handleDelete = async (material) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${material.material_name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("materials")
      .delete()
      .eq("material_id", material.material_id);

    if (error) {
      setError(error.message);
      return;
    }

    setMaterials((previous) =>
      previous.filter(
        (item) =>
          item.material_id !== material.material_id
      )
    );

    setSuccess("Material deleted successfully.");
  };

  const filteredMaterials = materials.filter((material) => {
    const search = searchTerm.toLowerCase();

    return (
      (material.material_name || "")
        .toLowerCase()
        .includes(search) ||
      (material.unit || "")
        .toLowerCase()
        .includes(search) ||
      (material.supplier || "")
        .toLowerCase()
        .includes(search)
    );
  });

  const formatCurrency = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value));
  };

  return (
    <div className="materials-page">
      <div className="materials-header">
        <div>
          <h1>Materials / Inventory</h1>

          <p>
            Manage construction materials and available
            inventory.
          </p>
        </div>

        <button
          className="add-material-btn"
          onClick={openAddModal}
        >
          + Add Material
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

      <div className="materials-toolbar">
        <div className="search-box">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Search material, unit or supplier..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />
        </div>
      </div>

      <div className="materials-card">
        <div className="materials-card-header">
          <div>
            <h2>Material Inventory</h2>

            <span>
              {filteredMaterials.length} material
              {filteredMaterials.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="materials-state">
            <div className="loader"></div>
            <p>Loading materials...</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="materials-state">
            <div className="empty-icon">📦</div>

            <h3>No materials found</h3>

            <p>
              {materials.length === 0
                ? "There are no materials in Supabase yet."
                : "No materials match your search."}
            </p>

            {materials.length === 0 && (
              <button
                className="add-material-btn"
                onClick={openAddModal}
              >
                + Add First Material
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="materials-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Supplier</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredMaterials.map((material) => (
                  <tr key={material.material_id}>
                    <td>
                      <div className="material-name">
                        {material.material_name || "—"}
                      </div>

                      <small>
                        ID: {material.material_id}
                      </small>
                    </td>

                    <td>{material.unit || "—"}</td>

                    <td>{material.quantity ?? "—"}</td>

                    <td>
                      {formatCurrency(
                        material.unit_price
                      )}
                    </td>

                    <td>{material.supplier || "—"}</td>

                    <td>
                      <div className="action-buttons">
                        <button
                          className="edit-btn"
                          onClick={() =>
                            openEditModal(material)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="delete-btn"
                          onClick={() =>
                            handleDelete(material)
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
          <div className="material-modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingMaterial
                    ? "Edit Material"
                    : "Add Material"}
                </h2>

                <p>
                  {editingMaterial
                    ? "Update material information."
                    : "Add a material to the inventory."}
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
                  <label htmlFor="material_name">
                    Material Name *
                  </label>

                  <input
                    id="material_name"
                    name="material_name"
                    type="text"
                    value={formData.material_name}
                    onChange={handleInputChange}
                    placeholder="Example: Cement"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="unit">
                    Unit *
                  </label>

                  <input
                    id="unit"
                    name="unit"
                    type="text"
                    value={formData.unit}
                    onChange={handleInputChange}
                    placeholder="Example: bags, kg, m³"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="quantity">
                    Quantity *
                  </label>

                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    placeholder="Available quantity"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="unit_price">
                    Unit Price *
                  </label>

                  <input
                    id="unit_price"
                    name="unit_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={handleInputChange}
                    placeholder="Price per unit"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="supplier">
                    Supplier
                  </label>

                  <input
                    id="supplier"
                    name="supplier"
                    type="text"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    placeholder="Supplier name"
                  />
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
                    : editingMaterial
                    ? "Update Material"
                    : "Save Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Materials;
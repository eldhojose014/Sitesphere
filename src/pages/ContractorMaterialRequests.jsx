import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./ContractorMaterialRequests.css";

const ContractorMaterialRequests = () => {
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [materials, setMaterials] = useState([]);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError("");

    const [requestsResult, projectsResult, materialsResult] =
      await Promise.all([
        supabase
          .from("material_request")
          .select("*")
          .order("request_date", { ascending: false }),

        supabase
          .from("projects")
          .select("project_id, project_name"),

        supabase
          .from("materials")
          .select("material_id, material_name, unit"),
      ]);

    if (requestsResult.error) {
      setError(requestsResult.error.message);
      setLoading(false);
      return;
    }

    if (projectsResult.error) {
      setError(projectsResult.error.message);
      setLoading(false);
      return;
    }

    if (materialsResult.error) {
      setError(materialsResult.error.message);
      setLoading(false);
      return;
    }

    setRequests(requestsResult.data || []);
    setProjects(projectsResult.data || []);
    setMaterials(materialsResult.data || []);

    setLoading(false);
  };

  const getProjectName = (projectId) => {
    const project = projects.find(
      (item) => String(item.project_id) === String(projectId)
    );

    return project ? project.project_name : "Unknown Project";
  };

  const getMaterialName = (materialId) => {
    const material = materials.find(
      (item) => String(item.material_id) === String(materialId)
    );

    if (!material) {
      return "Unknown Material";
    }

    return material.unit
      ? `${material.material_name} (${material.unit})`
      : material.material_name;
  };

  const updateRequestStatus = async (requestId, newStatus) => {
    setUpdating(true);
    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("material_request")
      .update({
        status: newStatus,
      })
      .eq("request_id", requestId);

    if (error) {
      setError(error.message);
      setUpdating(false);
      return;
    }

    setSuccess(`Material request ${newStatus.toLowerCase()} successfully.`);

    await fetchRequests();

    setUpdating(false);
  };

  const pendingRequests = requests.filter(
    (request) =>
      String(request.status).toLowerCase() === "pending"
  );

  const processedRequests = requests.filter(
    (request) =>
      String(request.status).toLowerCase() !== "pending"
  );

  if (loading) {
    return (
      <div className="contractor-requests-page">
        <div className="contractor-loading">
          <div className="loader"></div>
          <p>Loading material requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="contractor-requests-page">
      <div className="contractor-requests-header">
        <div>
          <h1>Material Requests</h1>
          <p>
            Review material requests submitted by Site Supervisors.
          </p>
        </div>

        <div className="pending-count">
          <span>{pendingRequests.length}</span>
          <small>Pending</small>
        </div>
      </div>

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <section className="requests-section">
        <div className="section-header">
          <div>
            <h2>Pending Requests</h2>
            <p>
              These requests require your approval.
            </p>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="empty-state">
            <h3>No pending material requests</h3>
            <p>
              New requests from Site Supervisors will appear here.
            </p>
          </div>
        ) : (
          <div className="requests-table-wrapper">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Material</th>
                  <th>Quantity</th>
                  <th>Requested By</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {pendingRequests.map((request) => (
                  <tr key={request.request_id}>
                    <td>
                      {getProjectName(request.project_id)}
                    </td>

                    <td>
                      {getMaterialName(request.material_id)}
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
                      <span className="status pending">
                        Pending
                      </span>
                    </td>

                    <td>
                      <div className="action-buttons">
                        <button
                          className="approve-btn"
                          disabled={updating}
                          onClick={() =>
                            updateRequestStatus(
                              request.request_id,
                              "Approved"
                            )
                          }
                        >
                          Approve
                        </button>

                        <button
                          className="reject-btn"
                          disabled={updating}
                          onClick={() =>
                            updateRequestStatus(
                              request.request_id,
                              "Rejected"
                            )
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="requests-section">
        <div className="section-header">
          <div>
            <h2>Processed Requests</h2>
            <p>
              Previously approved or rejected requests.
            </p>
          </div>
        </div>

        {processedRequests.length === 0 ? (
          <div className="empty-state">
            <h3>No processed requests</h3>
            <p>
              Approved and rejected requests will appear here.
            </p>
          </div>
        ) : (
          <div className="requests-table-wrapper">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Material</th>
                  <th>Quantity</th>
                  <th>Requested By</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {processedRequests.map((request) => (
                  <tr key={request.request_id}>
                    <td>
                      {getProjectName(request.project_id)}
                    </td>

                    <td>
                      {getMaterialName(request.material_id)}
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
                        className={`status ${String(
                          request.status
                        ).toLowerCase()}`}
                      >
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ContractorMaterialRequests;
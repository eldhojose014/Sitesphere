import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./MaterialRequests.css";

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected"];

const MaterialRequests = () => {
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError("");

    /*
      We first fetch material requests.

      Then we fetch the related projects,
      materials and users separately.

      This avoids depending on Supabase foreign-key
      relationship names in the query.
    */

    const { data: requestData, error: requestError } =
      await supabase
        .from("material_request")
        .select(
          "request_id, project_id, material_id, request_by, quantity, request_date, status"
        )
        .order("request_date", { ascending: false });

    if (requestError) {
      setError(requestError.message);
      setRequests([]);
      setLoading(false);
      return;
    }

    const requestRows = requestData || [];

    if (requestRows.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const projectIds = [
      ...new Set(
        requestRows
          .map((request) => request.project_id)
          .filter(Boolean)
      ),
    ];

    const materialIds = [
      ...new Set(
        requestRows
          .map((request) => request.material_id)
          .filter(Boolean)
      ),
    ];

    const userIds = [
      ...new Set(
        requestRows
          .map((request) => request.request_by)
          .filter(Boolean)
      ),
    ];

    const [projectsResult, materialsResult, usersResult] =
      await Promise.all([
        projectIds.length > 0
          ? supabase
              .from("projects")
              .select("project_id, project_name")
              .in("project_id", projectIds)
          : Promise.resolve({ data: [], error: null }),

        materialIds.length > 0
          ? supabase
              .from("materials")
              .select(
                "material_id, material_name, unit, unit_price, supplier"
              )
              .in("material_id", materialIds)
          : Promise.resolve({ data: [], error: null }),

        userIds.length > 0
          ? supabase
              .from("users")
              .select("user_id, full_name, email, role")
              .in("user_id", userIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

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

    if (usersResult.error) {
      setError(usersResult.error.message);
      setLoading(false);
      return;
    }

    const projectMap = new Map(
      (projectsResult.data || []).map((project) => [
        project.project_id,
        project,
      ])
    );

    const materialMap = new Map(
      (materialsResult.data || []).map((material) => [
        material.material_id,
        material,
      ])
    );

    const userMap = new Map(
      (usersResult.data || []).map((user) => [
        user.user_id,
        user,
      ])
    );

    const combinedRequests = requestRows.map((request) => ({
      ...request,
      project: projectMap.get(request.project_id) || null,
      material: materialMap.get(request.material_id) || null,
      requester: userMap.get(request.request_by) || null,
    }));

    setRequests(combinedRequests);
    setLoading(false);
  };

  const updateRequestStatus = async (requestId, newStatus) => {
    setError("");
    setSuccess("");

    const confirmed = window.confirm(
      `Are you sure you want to mark this request as ${newStatus}?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("material_request")
      .update({
        status: newStatus,
      })
      .eq("request_id", requestId);

    if (error) {
      setError(error.message);
      return;
    }

    setRequests((previous) =>
      previous.map((request) =>
        request.request_id === requestId
          ? {
              ...request,
              status: newStatus,
            }
          : request
      )
    );

    setSuccess(
      `Material request ${newStatus.toLowerCase()} successfully.`
    );
  };

  const filteredRequests = requests.filter((request) => {
    const search = searchTerm.toLowerCase();

    const projectName =
      request.project?.project_name || "";

    const materialName =
      request.material?.material_name || "";

    const requesterName =
      request.requester?.full_name || "";

    const requesterEmail =
      request.requester?.email || "";

    const matchesSearch =
      projectName.toLowerCase().includes(search) ||
      materialName.toLowerCase().includes(search) ||
      requesterName.toLowerCase().includes(search) ||
      requesterEmail.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "All" ||
      (request.status || "").toLowerCase() ===
        statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatQuantity = (quantity) => {
    if (
      quantity === null ||
      quantity === undefined ||
      quantity === ""
    ) {
      return "—";
    }

    return Number(quantity).toLocaleString("en-IN");
  };

  const getStatusClass = (status) => {
    if (status === "Pending") {
      return "request-status-pending";
    }

    if (status === "Approved") {
      return "request-status-approved";
    }

    if (status === "Rejected") {
      return "request-status-rejected";
    }

    return "request-status-default";
  };

  return (
    <div className="material-requests-page">
      <div className="material-requests-header">
        <div>
          <h1>Material Requests</h1>

          <p>
            Review material requests submitted by Site
            Supervisors.
          </p>
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

      <div className="requests-toolbar">
        <div className="search-box">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Search project, material or requester..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />
        </div>

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

      <div className="requests-card">
        <div className="requests-card-header">
          <div>
            <h2>Request List</h2>

            <span>
              {filteredRequests.length} request
              {filteredRequests.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="requests-state">
            <div className="loader"></div>
            <p>Loading material requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="requests-state">
            <div className="empty-icon">📦</div>

            <h3>No material requests found</h3>

            <p>
              {requests.length === 0
                ? "There are no material requests in Supabase yet."
                : "No requests match your current search or filter."}
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Project</th>
                  <th>Material</th>
                  <th>Requested By</th>
                  <th>Quantity</th>
                  <th>Request Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.request_id}>
                    <td>
                      <div className="request-id">
                        {request.request_id}
                      </div>
                    </td>

                    <td>
                      {request.project?.project_name ||
                        "Project unavailable"}
                    </td>

                    <td>
                      <div className="material-name">
                        {request.material?.material_name ||
                          "Material unavailable"}
                      </div>

                      {request.material?.unit && (
                        <small>
                          Unit: {request.material.unit}
                        </small>
                      )}
                    </td>

                    <td>
                      <div className="requester-name">
                        {request.requester?.full_name ||
                          "User unavailable"}
                      </div>

                      {request.requester?.role && (
                        <small>
                          {request.requester.role}
                        </small>
                      )}
                    </td>

                    <td>
                      {formatQuantity(request.quantity)}

                      {request.material?.unit
                        ? ` ${request.material.unit}`
                        : ""}
                    </td>

                    <td>
                      {formatDate(request.request_date)}
                    </td>

                    <td>
                      <span
                        className={`request-status ${getStatusClass(
                          request.status
                        )}`}
                      >
                        {request.status || "—"}
                      </span>
                    </td>

                    <td>
                      {request.status === "Pending" ? (
                        <div className="request-actions">
                          <button
                            className="approve-btn"
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
                      ) : (
                        <span className="action-completed">
                          Reviewed
                        </span>
                      )}
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

export default MaterialRequests;
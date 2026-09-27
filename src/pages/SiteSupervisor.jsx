import { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { supabase } from "../lib/supabaseClient";
import "./SiteSupervisor.css";

const SiteSupervisor = () => {
  const [project, setProject] = useState(null);
  const [labours, setLabours] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialRequests, setMaterialRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // -----------------------------------------
  // FETCH ALL SITE SUPERVISOR DATA
  // -----------------------------------------

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError("");

      try {
        const [
          projectsResult,
          laboursResult,
          attendanceResult,
          materialsResult,
          requestsResult,
        ] = await Promise.all([
          supabase
            .from("projects")
            .select("*")
            .order("project_id", { ascending: true })
            .limit(1),

          supabase
            .from("labours")
            .select("*"),

          supabase
            .from("attendance")
            .select("*"),

          supabase
            .from("materials")
            .select("*"),

          supabase
            .from("material_request")
            .select("*"),
        ]);

        // Check for errors
        if (projectsResult.error) {
          throw new Error(
            `Projects: ${projectsResult.error.message}`
          );
        }

        if (laboursResult.error) {
          throw new Error(
            `Labours: ${laboursResult.error.message}`
          );
        }

        if (attendanceResult.error) {
          throw new Error(
            `Attendance: ${attendanceResult.error.message}`
          );
        }

        if (materialsResult.error) {
          throw new Error(
            `Materials: ${materialsResult.error.message}`
          );
        }

        if (requestsResult.error) {
          throw new Error(
            `Material Requests: ${requestsResult.error.message}`
          );
        }

        // Store real Supabase data
        setProject(
          projectsResult.data && projectsResult.data.length > 0
            ? projectsResult.data[0]
            : null
        );

        setLabours(laboursResult.data || []);
        setAttendance(attendanceResult.data || []);
        setMaterials(materialsResult.data || []);
        setMaterialRequests(requestsResult.data || []);
      } catch (err) {
        console.error("Dashboard error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // -----------------------------------------
  // HELPER FUNCTIONS
  // -----------------------------------------

  const getValue = (object, possibleKeys) => {
    if (!object) return "";

    for (const key of possibleKeys) {
      if (
        object[key] !== undefined &&
        object[key] !== null &&
        object[key] !== ""
      ) {
        return object[key];
      }
    }

    return "";
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // -----------------------------------------
  // LABOUR DATA
  // -----------------------------------------

  const totalLabour = labours.length;

  // -----------------------------------------
  // ATTENDANCE DATA
  // -----------------------------------------

  const getAttendanceStatus = (record) => {
    const status = getValue(record, [
      "status",
      "attendance_status",
      "attendanceStatus",
      "state",
    ]);

    return String(status).toLowerCase().trim();
  };

  const presentCount = attendance.filter((record) => {
    const status = getAttendanceStatus(record);

    return (
      status === "present" ||
      status === "p" ||
      status === "present today"
    );
  }).length;

  const absentCount = attendance.filter((record) => {
    const status = getAttendanceStatus(record);

    return (
      status === "absent" ||
      status === "a"
    );
  }).length;

  const halfDayCount = attendance.filter((record) => {
    const status = getAttendanceStatus(record);

    return (
      status === "half day" ||
      status === "halfday" ||
      status === "half_day" ||
      status === "half"
    );
  }).length;

  const attendanceTotal =
    presentCount + absentCount + halfDayCount;

  const attendanceRate =
    attendanceTotal > 0
      ? Math.round((presentCount / attendanceTotal) * 100)
      : 0;

  // -----------------------------------------
  // MATERIAL DISPLAY HELPERS
  // -----------------------------------------

  const getMaterialName = (material) => {
    return (
      getValue(material, [
        "material_name",
        "material",
        "name",
        "item_name",
        "item",
      ]) || "Unnamed Material"
    );
  };

  const getMaterialQuantity = (material) => {
    return getValue(material, [
      "quantity",
      "available_quantity",
      "stock",
      "current_stock",
      "qty",
    ]);
  };

  const getMaterialUnit = (material) => {
    return getValue(material, [
      "unit",
      "measurement_unit",
      "uom",
    ]);
  };

  const getMaterialStatus = (material) => {
    return (
      getValue(material, [
        "status",
        "stock_status",
      ]) || "Available"
    );
  };

  // -----------------------------------------
  // MATERIAL REQUEST HELPERS
  // -----------------------------------------

  const getRequestMaterial = (request) => {
    return (
      getValue(request, [
        "material_name",
        "material",
        "name",
        "item_name",
        "item",
      ]) || "Material"
    );
  };

  const getRequestQuantity = (request) => {
    return getValue(request, [
      "quantity",
      "requested_quantity",
      "qty",
    ]);
  };

  const getRequestUnit = (request) => {
    return getValue(request, [
      "unit",
      "measurement_unit",
      "uom",
    ]);
  };

  const getRequestDate = (request) => {
    return getValue(request, [
      "request_date",
      "requested_date",
      "date",
      "created_at",
    ]);
  };

  const getRequestStatus = (request) => {
    return (
      getValue(request, [
        "status",
        "request_status",
      ]) || "Pending"
    );
  };

  // -----------------------------------------
  // PAGE
  // -----------------------------------------

  return (
    <div className="supervisor-page">
      <Header />

      <main className="supervisor-main">

        {/* PAGE HEADER */}
        <section className="supervisor-heading">
          <div>
            <p className="page-label">SITE SUPERVISOR</p>

            <h1>Site Supervisor Dashboard</h1>

            <p className="page-description">
              Monitor labour, attendance, materials and daily site progress.
            </p>
          </div>

          <div className="project-selector">
            <span>Current Project</span>

            {loading && <strong>Loading...</strong>}

            {!loading && !error && project && (
              <strong>{project.project_name}</strong>
            )}

            {!loading && !error && !project && (
              <strong>No project found</strong>
            )}

            {!loading && error && (
              <strong>Unable to load</strong>
            )}
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "24px",
            }}
          >
            <strong>Supabase Error</strong>
            <p style={{ marginBottom: 0 }}>{error}</p>
          </div>
        )}

        {/* STATISTICS */}
        <section className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon blue">👷</div>

            <div>
              <span>Total Labour</span>
              <strong>{loading ? "..." : totalLabour}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">✓</div>

            <div>
              <span>Present Today</span>
              <strong>{loading ? "..." : presentCount}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon red">!</div>

            <div>
              <span>Absent</span>
              <strong>{loading ? "..." : absentCount}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">◐</div>

            <div>
              <span>Half Day</span>
              <strong>{loading ? "..." : halfDayCount}</strong>
            </div>
          </div>

        </section>

        {/* QUICK ACTIONS */}
        <section className="section">

          <div className="section-heading">
            <div>
              <h2>Quick Actions</h2>
              <p>Common site supervisor activities</p>
            </div>
          </div>

          <div className="quick-actions">

            <button className="action-card">
              <span className="action-icon">✓</span>

              <div>
                <strong>Mark Attendance</strong>
                <span>Record today's labour attendance</span>
              </div>

              <span className="arrow">→</span>
            </button>

            <button className="action-card">
              <span className="action-icon">👷</span>

              <div>
                <strong>Manage Labour</strong>
                <span>View and assign employees</span>
              </div>

              <span className="arrow">→</span>
            </button>

            <button className="action-card">
              <span className="action-icon">📦</span>

              <div>
                <strong>Request Materials</strong>
                <span>Raise a new material request</span>
              </div>

              <span className="arrow">→</span>
            </button>

            <button className="action-card">
              <span className="action-icon">📝</span>

              <div>
                <strong>Daily Report</strong>
                <span>Submit today's site progress</span>
              </div>

              <span className="arrow">→</span>
            </button>

          </div>
        </section>

        {/* MATERIAL INVENTORY + ATTENDANCE */}
        <section className="dashboard-grid">

          {/* MATERIAL INVENTORY */}
          <div className="dashboard-card">

            <div className="card-header">
              <div>
                <h2>Material Inventory</h2>
                <p>Current material availability</p>
              </div>

              <button className="view-button">
                View All
              </button>
            </div>

            <div className="inventory-list">

              {!loading && materials.length === 0 && (
                <p style={{ padding: "20px 0", color: "#6b7280" }}>
                  No material records found.
                </p>
              )}

              {materials.map((material, index) => {
                const name = getMaterialName(material);
                const quantity = getMaterialQuantity(material);
                const unit = getMaterialUnit(material);
                const status = getMaterialStatus(material);

                const isWarning =
                  String(status).toLowerCase().includes("low");

                return (
                  <div
                    className="inventory-row"
                    key={
                      material.material_id ||
                      material.id ||
                      index
                    }
                  >
                    <div className="material-info">
                      <strong>{name}</strong>

                      <span>
                        {quantity !== ""
                          ? quantity
                          : "-"}{" "}
                        {unit}
                      </span>
                    </div>

                    <span
                      className={`status ${
                        isWarning
                          ? "status-warning"
                          : "status-success"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                );
              })}

            </div>
          </div>

          {/* ATTENDANCE */}
          <div className="dashboard-card">

            <div className="card-header">
              <div>
                <h2>Today's Attendance</h2>
                <p>Labour attendance summary</p>
              </div>

              <button className="view-button">
                Manage
              </button>
            </div>

            <div className="attendance-summary">

              <div className="attendance-item">
                <span className="attendance-dot present"></span>

                <div>
                  <strong>{loading ? "..." : presentCount}</strong>
                  <span>Present</span>
                </div>
              </div>

              <div className="attendance-item">
                <span className="attendance-dot absent"></span>

                <div>
                  <strong>{loading ? "..." : absentCount}</strong>
                  <span>Absent</span>
                </div>
              </div>

              <div className="attendance-item">
                <span className="attendance-dot half"></span>

                <div>
                  <strong>{loading ? "..." : halfDayCount}</strong>
                  <span>Half Day</span>
                </div>
              </div>

            </div>

            <div className="attendance-progress">

              <div className="progress-label">
                <span>Attendance Rate</span>

                <strong>
                  {loading ? "..." : `${attendanceRate}%`}
                </strong>
              </div>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${attendanceRate}%`,
                  }}
                ></div>
              </div>

            </div>

          </div>

        </section>

        {/* MATERIAL REQUESTS */}
        <section className="section">

          <div className="section-heading">

            <div>
              <h2>Recent Material Requests</h2>

              <p>
                Track requests raised for the project
              </p>
            </div>

            <button className="primary-button">
              + New Request
            </button>

          </div>

          <div className="table-card">

            <div className="request-table">

              <div className="table-row table-header">
                <span>Material</span>
                <span>Quantity</span>
                <span>Request Date</span>
                <span>Status</span>
              </div>

              {!loading && materialRequests.length === 0 && (
                <div
                  className="table-row"
                  style={{
                    padding: "24px",
                    color: "#6b7280",
                  }}
                >
                  <span>No material requests found.</span>
                </div>
              )}

              {materialRequests.map((request, index) => {

                const material =
                  getRequestMaterial(request);

                const quantity =
                  getRequestQuantity(request);

                const unit =
                  getRequestUnit(request);

                const date =
                  getRequestDate(request);

                const status =
                  getRequestStatus(request);

                const isApproved =
                  String(status).toLowerCase() ===
                  "approved";

                return (
                  <div
                    className="table-row"
                    key={
                      request.request_id ||
                      request.id ||
                      index
                    }
                  >

                    <span className="material-name">
                      {material}
                    </span>

                    <span>
                      {quantity || "-"}{" "}
                      {unit}
                    </span>

                    <span>
                      {formatDate(date)}
                    </span>

                    <span>

                      <span
                        className={`status ${
                          isApproved
                            ? "status-success"
                            : "status-pending"
                        }`}
                      >
                        {status}
                      </span>

                    </span>

                  </div>
                );
              })}

            </div>
          </div>

        </section>

        {/* DAILY REPORT */}
        <section className="daily-report-card">

          <div className="report-icon">
            📝
          </div>

          <div className="report-content">

            <span className="report-label">
              DAILY SITE REPORT
            </span>

            <h2>
              Submit today's work progress
            </h2>

            <p>
              Record the work completed today and
              update the project progress percentage.
            </p>

          </div>

          <button className="primary-button">
            Submit Report →
          </button>

        </section>

      </main>

      <Footer />
    </div>
  );
};

export default SiteSupervisor;
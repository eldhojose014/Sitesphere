import { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { supabase } from "../lib/supabaseClient";
import "./Contractor.css";

const Contractor = () => {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payroll, setPayroll] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const [
          projectsResult,
          usersResult,
          materialsResult,
          requestsResult,
          invoicesResult,
          payrollResult,
        ] = await Promise.all([
          supabase
            .from("projects")
            .select("*")
            .order("project_id", { ascending: false }),

          supabase
            .from("users")
            .select("*")
            .order("user_id", { ascending: false }),

          supabase
            .from("materials")
            .select("*")
            .order("material_id", { ascending: false }),

          supabase
            .from("material_request")
            .select("*")
            .order("request_id", { ascending: false }),

          supabase
            .from("invoice")
            .select("*")
            .order("invoice_id", { ascending: false }),

          supabase
            .from("payroll")
            .select("*")
            .order("payroll_id", { ascending: false }),
        ]);

        if (projectsResult.error) {
          throw new Error(
            `Projects: ${projectsResult.error.message}`
          );
        }

        if (usersResult.error) {
          throw new Error(
            `Users: ${usersResult.error.message}`
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

        if (invoicesResult.error) {
          throw new Error(
            `Invoices: ${invoicesResult.error.message}`
          );
        }

        if (payrollResult.error) {
          throw new Error(
            `Payroll: ${payrollResult.error.message}`
          );
        }

        setProjects(projectsResult.data || []);
        setUsers(usersResult.data || []);
        setMaterials(materialsResult.data || []);
        setMaterialRequests(requestsResult.data || []);
        setInvoices(invoicesResult.data || []);
        setPayroll(payrollResult.data || []);
      } catch (err) {
        console.error("Contractor dashboard error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  // ---------------------------------------
  // PROJECT STATISTICS
  // ---------------------------------------

  const totalProjects = projects.length;

  const activeProjects = projects.filter((project) => {
    const status = String(project.status || "").toLowerCase();

    return (
      status === "active" ||
      status === "ongoing" ||
      status === "in progress"
    );
  }).length;

  const totalBudget = projects.reduce((total, project) => {
    return total + Number(project.budget || 0);
  }, 0);

  // ---------------------------------------
  // MATERIAL REQUEST STATISTICS
  // ---------------------------------------

  const pendingRequests = materialRequests.filter((request) => {
    return String(request.status || "").toLowerCase() === "pending";
  }).length;

  // ---------------------------------------
  // OTHER COUNTS
  // ---------------------------------------

  const totalUsers = users.length;
  const totalMaterials = materials.length;
  const totalInvoices = invoices.length;
  const totalPayrollRecords = payroll.length;

  // ---------------------------------------
  // HELPERS
  // ---------------------------------------

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getProjectStatusClass = (status) => {
    const value = String(status || "").toLowerCase();

    if (
      value === "active" ||
      value === "ongoing" ||
      value === "in progress"
    ) {
      return "status-success";
    }

    if (
      value === "completed" ||
      value === "complete"
    ) {
      return "status-completed";
    }

    return "status-pending";
  };

  return (
    <div className="contractor-page">

      <Header />

      <main className="contractor-main">

        {/* PAGE HEADER */}

        <section className="contractor-heading">

          <div>
            <p className="page-label">
              ADMINISTRATOR / CONTRACTOR
            </p>

            <h1>
              Contractor Dashboard
            </h1>

            <p className="page-description">
              Manage projects, users, budgets, procurement and
              construction operations.
            </p>
          </div>

        </section>

        {/* ERROR */}

        {error && (
          <div className="dashboard-error">
            <strong>Supabase Error</strong>

            <p>{error}</p>
          </div>
        )}

        {/* STATISTICS */}

        <section className="contractor-stats">

          <div className="contractor-stat-card">

            <div className="contractor-stat-icon blue">
              🏗️
            </div>

            <div>
              <span>Total Projects</span>

              <strong>
                {loading ? "..." : totalProjects}
              </strong>
            </div>

          </div>

          <div className="contractor-stat-card">

            <div className="contractor-stat-icon green">
              ✓
            </div>

            <div>
              <span>Active Projects</span>

              <strong>
                {loading ? "..." : activeProjects}
              </strong>
            </div>

          </div>

          <div className="contractor-stat-card">

            <div className="contractor-stat-icon purple">
              ₹
            </div>

            <div>
              <span>Total Budget</span>

              <strong className="budget-value">
                {loading
                  ? "..."
                  : formatCurrency(totalBudget)}
              </strong>
            </div>

          </div>

          <div className="contractor-stat-card">

            <div className="contractor-stat-icon orange">
              !
            </div>

            <div>
              <span>Pending Requests</span>

              <strong>
                {loading ? "..." : pendingRequests}
              </strong>
            </div>

          </div>

        </section>

        {/* QUICK ACTIONS */}

        <section className="contractor-section">

          <div className="contractor-section-heading">

            <div>
              <h2>Quick Actions</h2>

              <p>
                Common contractor activities
              </p>
            </div>

          </div>

          <div className="contractor-actions">

            <button className="contractor-action">

              <span className="contractor-action-icon">
                🏗️
              </span>

              <div>
                <strong>
                  Manage Projects
                </strong>

                <span>
                  Create and manage construction projects
                </span>
              </div>

              <span className="contractor-arrow">
                →
              </span>

            </button>

            <button className="contractor-action">

              <span className="contractor-action-icon">
                👥
              </span>

              <div>
                <strong>
                  Manage Users
                </strong>

                <span>
                  Manage system users and roles
                </span>
              </div>

              <span className="contractor-arrow">
                →
              </span>

            </button>

            <button className="contractor-action">

              <span className="contractor-action-icon">
                📦
              </span>

              <div>
                <strong>
                  Material Requests
                </strong>

                <span>
                  Review procurement requests
                </span>
              </div>

              <span className="contractor-arrow">
                →
              </span>

            </button>

            <button className="contractor-action">

              <span className="contractor-action-icon">
                📊
              </span>

              <div>
                <strong>
                  Reports
                </strong>

                <span>
                  View project and financial reports
                </span>
              </div>

              <span className="contractor-arrow">
                →
              </span>

            </button>

          </div>

        </section>

        {/* PROJECTS */}

        <section className="contractor-section">

          <div className="contractor-section-heading">

            <div>
              <h2>
                Projects
              </h2>

              <p>
                Current construction projects
              </p>
            </div>

          </div>

          <div className="contractor-table-card">

            <div className="contractor-table">

              <div className="contractor-table-row contractor-table-header">

                <span>
                  Project
                </span>

                <span>
                  Client
                </span>

                <span>
                  Location
                </span>

                <span>
                  Budget
                </span>

                <span>
                  Status
                </span>

              </div>

              {!loading && projects.length === 0 && (
                <div className="contractor-empty">
                  No projects found.
                </div>
              )}

              {projects.map((project) => (

                <div
                  className="contractor-table-row"
                  key={project.project_id}
                >

                  <span className="project-name">

                    {project.project_name || "-"}

                  </span>

                  <span>
                    {project.client_name || "-"}
                  </span>

                  <span>
                    {project.location || "-"}
                  </span>

                  <span>
                    {formatCurrency(project.budget)}
                  </span>

                  <span>

                    <span
                      className={`status-badge ${getProjectStatusClass(
                        project.status
                      )}`}
                    >
                      {project.status || "Not Set"}
                    </span>

                  </span>

                </div>

              ))}

            </div>

          </div>

        </section>

        {/* MATERIAL REQUESTS */}

        <section className="contractor-section">

          <div className="contractor-section-heading">

            <div>
              <h2>
                Material Requests
              </h2>

              <p>
                Procurement requests submitted for projects
              </p>
            </div>

          </div>

          <div className="contractor-table-card">

            <div className="contractor-table">

              <div className="contractor-table-row contractor-table-header">

                <span>
                  Request ID
                </span>

                <span>
                  Project ID
                </span>

                <span>
                  Material ID
                </span>

                <span>
                  Quantity
                </span>

                <span>
                  Date
                </span>

                <span>
                  Status
                </span>

              </div>

              {!loading && materialRequests.length === 0 && (
                <div className="contractor-empty">
                  No material requests found.
                </div>
              )}

              {materialRequests.slice(0, 10).map((request) => (

                <div
                  className="contractor-table-row"
                  key={request.request_id}
                >

                  <span>
                    #{request.request_id}
                  </span>

                  <span>
                    {request.project_id || "-"}
                  </span>

                  <span>
                    {request.material_id || "-"}
                  </span>

                  <span>
                    {request.quantity || "-"}
                  </span>

                  <span>
                    {formatDate(request.request_date)}
                  </span>

                  <span>

                    <span
                      className={`status-badge ${
                        String(request.status || "")
                          .toLowerCase() === "approved"
                          ? "status-success"
                          : "status-pending"
                      }`}
                    >
                      {request.status || "Not Set"}
                    </span>

                  </span>

                </div>

              ))}

            </div>

          </div>

        </section>

        {/* SYSTEM OVERVIEW */}

        <section className="contractor-section">

          <div className="contractor-section-heading">

            <div>
              <h2>
                System Overview
              </h2>

              <p>
                Current records available in the system
              </p>
            </div>

          </div>

          <div className="system-overview-grid">

            <div className="overview-card">

              <span className="overview-icon">
                👥
              </span>

              <div>
                <span>
                  Users
                </span>

                <strong>
                  {loading ? "..." : totalUsers}
                </strong>
              </div>

            </div>

            <div className="overview-card">

              <span className="overview-icon">
                📦
              </span>

              <div>
                <span>
                  Materials
                </span>

                <strong>
                  {loading ? "..." : totalMaterials}
                </strong>
              </div>

            </div>

            <div className="overview-card">

              <span className="overview-icon">
                🧾
              </span>

              <div>
                <span>
                  Invoices
                </span>

                <strong>
                  {loading ? "..." : totalInvoices}
                </strong>
              </div>

            </div>

            <div className="overview-card">

              <span className="overview-icon">
                💰
              </span>

              <div>
                <span>
                  Payroll Records
                </span>

                <strong>
                  {loading
                    ? "..."
                    : totalPayrollRecords}
                </strong>
              </div>

            </div>

          </div>

        </section>

      </main>

      <Footer />

    </div>
  );
};

export default Contractor;
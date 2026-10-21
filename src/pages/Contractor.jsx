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
  const [financeRequests, setFinanceRequests] = useState([]);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [financeError, setFinanceError] = useState("");
  const [financeStatusFilter, setFinanceStatusFilter] = useState("All");
  const [financeProjectFilter, setFinanceProjectFilter] = useState("All");



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
          financeRequestsResult,

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

          // Read-only finance monitoring; Supabase RLS determines visible rows.
          supabase
            .from("finance_requests")
            .select("*")
            .order("created_at", { ascending: false }),

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

        // Finance errors are isolated so they do not break existing modules.
        if (financeRequestsResult.error) {
          console.error("Contractor finance requests error:", financeRequestsResult.error);
          setFinanceError(financeRequestsResult.error.message);
          setFinanceRequests([]);
        } else {
          setFinanceRequests(financeRequestsResult.data || []);
          setFinanceError("");
        }

      } catch (err) {

        console.error("Contractor dashboard error:", err);

        setError(err.message);

      } finally {

        setLoading(false);
        setFinanceLoading(false);

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



  // FINANCE MONITORING (read-only)
  const normalizedFinanceStatus = (request) =>
    String(request.status || "").trim().toLowerCase();

  const approvedFinanceStatuses = ["approved", "partially paid", "paid"];
  const totalFinanceRequests = financeRequests.length;
  const pendingFinanceRequests = financeRequests.filter(
    (request) => normalizedFinanceStatus(request) === "pending"
  ).length;

  const pendingFinanceAmount = financeRequests.reduce((total, request) => {
    if (normalizedFinanceStatus(request) !== "pending") return total;
    return total + Number(request.requested_amount || 0);
  }, 0);

  const approvedFinanceAmount = financeRequests.reduce((total, request) => {
    if (!approvedFinanceStatuses.includes(normalizedFinanceStatus(request))) return total;
    return total + Number(request.requested_amount || 0);
  }, 0);

  const recordedFinancePayments = financeRequests.reduce(
    (total, request) => total + Number(request.paid_amount || 0),
    0
  );

  const outstandingFinanceAmount = financeRequests.reduce((total, request) => {
    if (!approvedFinanceStatuses.includes(normalizedFinanceStatus(request))) return total;
    return total + Math.max(
      Number(request.requested_amount || 0) - Number(request.paid_amount || 0),
      0
    );
  }, 0);

  // Includes both approved-but-unpaid balances and requests still awaiting review.
  const totalUnpaidExposure = outstandingFinanceAmount + pendingFinanceAmount;

  const filteredFinanceRequests = financeRequests.filter((request) => {
    const statusMatches = financeStatusFilter === "All" ||
      String(request.status || "") === financeStatusFilter;
    const projectMatches = financeProjectFilter === "All" ||
      String(request.project_id || "") === financeProjectFilter;
    return statusMatches && projectMatches;
  });

  const getFinanceProjectName = (projectId) => {
    const project = projects.find(
      (item) => String(item.project_id) === String(projectId)
    );
    return project?.project_name || project?.name || "Unassigned project";
  };

  const getFinanceStatusClass = (status) => {
    const value = String(status || "").trim().toLowerCase();
    if (["approved", "paid"].includes(value)) return "status-success";
    if (value === "partially paid") return "status-partial";
    if (value === "rejected") return "status-rejected";
    return "status-pending";
  };

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



        {/* FINANCE MONITORING - READ ONLY */}
        <section className="contractor-section finance-monitoring-section">
          <div className="contractor-section-heading">
            <div>
              <h2>Finance Monitoring</h2>
              <p>Monitor finance requests, approved amounts, and recorded payments.</p>
            </div>
            <span className="finance-read-only-label">Read only</span>
          </div>

          {financeError && (
            <div className="finance-dashboard-error" role="alert">
              <strong>Finance requests could not be loaded.</strong>
              <p>{financeError}</p>
              <small>Check finance_requests permissions and Supabase RLS policies. Other dashboard modules remain available.</small>
            </div>
          )}

          <div className="finance-summary-grid">
            <article className="finance-summary-card">
              <span>Total Requests</span>
              <strong>{financeLoading ? "..." : totalFinanceRequests}</strong>
              <small>All finance requests visible to this account</small>
            </article>
            <article className="finance-summary-card">
              <span>Pending Requests</span>
              <strong>{financeLoading ? "..." : pendingFinanceRequests}</strong>
              <small>Awaiting accountant review</small>
            </article>
            <article className="finance-summary-card">
              <span>Approved Amount</span>
              <strong>{financeLoading ? "..." : formatCurrency(approvedFinanceAmount)}</strong>
              <small>Approved, partially paid, and paid requests</small>
            </article>
            <article className="finance-summary-card">
              <span>Payments Recorded</span>
              <strong>{financeLoading ? "..." : formatCurrency(recordedFinancePayments)}</strong>
              <small>Sum of recorded paid amounts</small>
            </article>
            <article className="finance-summary-card">
              <span>Pending Request Amount</span>
              <strong>{financeLoading ? "..." : formatCurrency(pendingFinanceAmount)}</strong>
              <small>Amount awaiting accountant review</small>
            </article>
            <article className="finance-summary-card">
              <span>Approved Outstanding</span>
              <strong>{financeLoading ? "..." : formatCurrency(outstandingFinanceAmount)}</strong>
              <small>Unpaid balance on approved requests</small>
            </article>
            <article className="finance-summary-card finance-summary-card-wide">
              <span>Total Unpaid Exposure</span>
              <strong>{financeLoading ? "..." : formatCurrency(totalUnpaidExposure)}</strong>
              <small>Pending request amount plus approved outstanding</small>
            </article>
          </div>

          <div className="finance-history-toolbar">
            <div>
              <h3>Finance Request History</h3>
              <p>Requests visible to your signed-in account</p>
            </div>
            <div className="finance-filters">
              <label>
                <span>Status</span>
                <select value={financeStatusFilter} onChange={(event) => setFinanceStatusFilter(event.target.value)}>
                  <option value="All">All statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Paid">Paid</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </label>
              <label>
                <span>Project</span>
                <select value={financeProjectFilter} onChange={(event) => setFinanceProjectFilter(event.target.value)}>
                  <option value="All">All projects</option>
                  {projects.map((project) => (
                    <option key={project.project_id} value={String(project.project_id)}>
                      {project.project_name || project.name || `Project ${String(project.project_id).slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="contractor-table-card finance-table-card">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Request Type</th>
                  <th>Project</th>
                  <th>Request Date</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Paid</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {financeLoading ? (
                  <tr><td colSpan="7" className="finance-table-message">Loading finance requests…</td></tr>
                ) : filteredFinanceRequests.length === 0 ? (
                  <tr><td colSpan="7" className="finance-table-message">No finance requests match these filters.</td></tr>
                ) : (
                  filteredFinanceRequests.map((request) => {
                    const status = String(request.status || "Unknown");
                    const requestAmount = Number(request.requested_amount || 0);
                    const paidAmount = Number(request.paid_amount || 0);
                    const isApproved = approvedFinanceStatuses.includes(status.trim().toLowerCase());
                    const balance = isApproved ? Math.max(requestAmount - paidAmount, 0) : 0;
                    return (
                      <tr key={request.request_id}>
                        <td>
                          <strong>{request.request_type || "Finance request"}</strong>
                          {request.description && <small className="finance-description">{request.description}</small>}
                        </td>
                        <td>{getFinanceProjectName(request.project_id)}</td>
                        <td>{formatDate(request.request_date || request.created_at)}</td>
                        <td><span className={`status-badge ${getFinanceStatusClass(status)}`}>{status}</span></td>
                        <td>{formatCurrency(requestAmount)}</td>
                        <td>{formatCurrency(paidAmount)}</td>
                        <td>{formatCurrency(balance)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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
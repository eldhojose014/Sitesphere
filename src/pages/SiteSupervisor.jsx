import Header from "../components/Header";
import Footer from "../components/Footer";
import "./SiteSupervisor.css";

const SiteSupervisor = () => {
  // Temporary demo data.
  // We will replace this with Supabase data later.
  const supervisor = {
    name: "Admin",
    role: "Site Supervisor",
    project: "Residential Building Project",
  };

  const labourStats = {
    total: 32,
    present: 27,
    absent: 3,
    halfDay: 2,
  };

  const materials = [
    {
      name: "Cement",
      quantity: 145,
      unit: "Bags",
      status: "Available",
    },
    {
      name: "Steel",
      quantity: 850,
      unit: "Kg",
      status: "Available",
    },
    {
      name: "Sand",
      quantity: 12,
      unit: "Ton",
      status: "Low Stock",
    },
    {
      name: "Bricks",
      quantity: 2400,
      unit: "Nos",
      status: "Available",
    },
  ];

  const recentRequests = [
    {
      material: "Cement",
      quantity: 50,
      unit: "Bags",
      date: "26 Sep 2026",
      status: "Pending",
    },
    {
      material: "Sand",
      quantity: 5,
      unit: "Ton",
      date: "25 Sep 2026",
      status: "Approved",
    },
    {
      material: "Steel",
      quantity: 200,
      unit: "Kg",
      date: "24 Sep 2026",
      status: "Pending",
    },
  ];

  return (
    <div className="supervisor-page">
      <Header />

      <main className="supervisor-main">

        {/* Page Header */}
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
            <strong>{supervisor.project}</strong>
          </div>
        </section>


        {/* Statistics */}
        <section className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon blue">👷</div>

            <div>
              <span>Total Labour</span>
              <strong>{labourStats.total}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">✓</div>

            <div>
              <span>Present Today</span>
              <strong>{labourStats.present}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon red">!</div>

            <div>
              <span>Absent</span>
              <strong>{labourStats.absent}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">◐</div>

            <div>
              <span>Half Day</span>
              <strong>{labourStats.halfDay}</strong>
            </div>
          </div>

        </section>


        {/* Quick Actions */}
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


        {/* Main Dashboard Grid */}
        <section className="dashboard-grid">

          {/* Inventory */}
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

              {materials.map((material) => (
                <div
                  className="inventory-row"
                  key={material.name}
                >
                  <div className="material-info">
                    <strong>{material.name}</strong>
                    <span>{material.quantity} {material.unit}</span>
                  </div>

                  <span
                    className={`status ${
                      material.status === "Low Stock"
                        ? "status-warning"
                        : "status-success"
                    }`}
                  >
                    {material.status}
                  </span>
                </div>
              ))}

            </div>

          </div>


          {/* Attendance */}
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
                  <strong>{labourStats.present}</strong>
                  <span>Present</span>
                </div>
              </div>


              <div className="attendance-item">
                <span className="attendance-dot absent"></span>

                <div>
                  <strong>{labourStats.absent}</strong>
                  <span>Absent</span>
                </div>
              </div>


              <div className="attendance-item">
                <span className="attendance-dot half"></span>

                <div>
                  <strong>{labourStats.halfDay}</strong>
                  <span>Half Day</span>
                </div>
              </div>

            </div>

            <div className="attendance-progress">

              <div className="progress-label">
                <span>Attendance Rate</span>
                <strong>84%</strong>
              </div>

              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>

            </div>

          </div>

        </section>


        {/* Material Requests */}
        <section className="section">

          <div className="section-heading">

            <div>
              <h2>Recent Material Requests</h2>
              <p>Track requests raised for the project</p>
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


              {recentRequests.map((request, index) => (
                <div
                  className="table-row"
                  key={index}
                >
                  <span className="material-name">
                    {request.material}
                  </span>

                  <span>
                    {request.quantity} {request.unit}
                  </span>

                  <span>
                    {request.date}
                  </span>

                  <span>
                    <span
                      className={`status ${
                        request.status === "Approved"
                          ? "status-success"
                          : "status-pending"
                      }`}
                    >
                      {request.status}
                    </span>
                  </span>
                </div>
              ))}

            </div>

          </div>

        </section>


        {/* Daily Report */}
        <section className="daily-report-card">

          <div className="report-icon">
            📝
          </div>

          <div className="report-content">
            <span className="report-label">
              DAILY SITE REPORT
            </span>

            <h2>Submit today's work progress</h2>

            <p>
              Record the work completed today and update the project
              progress percentage.
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
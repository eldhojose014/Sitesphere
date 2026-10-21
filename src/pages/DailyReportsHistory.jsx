
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./DailyReportsHistory.css";

function DailyReportsHistory() {
  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [reportsResult, projectsResult] = await Promise.all([
          supabase
            .from("daily_reports")
            .select("*")
            .order("report_date", { ascending: false })
            .order("created_at", { ascending: false }),

          supabase
            .from("projects")
            .select("project_id, project_name")
            .order("project_name", { ascending: true }),
        ]);

        if (reportsResult.error) throw reportsResult.error;
        if (projectsResult.error) throw projectsResult.error;

        setReports(reportsResult.data || []);
        setProjects(projectsResult.data || []);
      } catch (err) {
        console.error("Daily reports history error:", err);
        setError(err.message || "Could not load daily reports.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const projectNames = Object.fromEntries(
    projects.map((project) => [
      project.project_id,
      project.project_name,
    ])
  );

  const filteredReports = reports.filter((report) => {
    const matchesProject =
      projectFilter === "all" ||
      report.project_id === projectFilter;

    const matchesDate =
      !dateFilter || report.report_date === dateFilter;

    return matchesProject && matchesDate;
  });

  function formatDate(value) {
    if (!value) return "—";

    return new Date(`${value}T00:00:00`).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  return (
    <main className="reports-history-page">
      <div className="reports-history-container">
        <header className="reports-history-header">
          <div>
            <span className="reports-history-eyebrow">
              SITE MANAGEMENT
            </span>
            <h1>Daily Reports History</h1>
            <p>
              Review submitted site reports and project progress.
            </p>
          </div>

          <div className="reports-history-count">
            <span>Total Reports</span>
            <strong>{filteredReports.length}</strong>
          </div>
        </header>

        <section className="reports-history-filters">
          <div>
            <label htmlFor="history-project">Filter by project</label>
            <select
              id="history-project"
              value={projectFilter}
              onChange={(event) =>
                setProjectFilter(event.target.value)
              }
            >
              <option value="all">All projects</option>
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

          <div>
            <label htmlFor="history-date">Filter by date</label>
            <input
              id="history-date"
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="reports-history-clear"
            onClick={() => {
              setProjectFilter("all");
              setDateFilter("");
            }}
          >
            Clear Filters
          </button>
        </section>

        {error && (
          <div className="reports-history-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="reports-history-empty">
            Loading daily reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="reports-history-empty">
            <h2>No reports found</h2>
            <p>
              No saved reports match your filters.
            </p>
          </div>
        ) : (
          <section className="reports-history-list">
            {filteredReports.map((report) => (
              <article
                className="reports-history-card"
                key={report.report_id}
              >
                <div className="reports-history-card-top">
                  <div>
                    <span className="reports-history-date">
                      {formatDate(report.report_date)}
                    </span>
                    <h2>
                      {projectNames[report.project_id] ||
                        "Unknown project"}
                    </h2>
                  </div>

                  {report.progress_percentage !== null &&
                    report.progress_percentage !== "" && (
                      <div className="reports-history-progress">
                        <strong>
                          {Number(report.progress_percentage)}%
                        </strong>
                        <span>Progress</span>
                      </div>
                    )}
                </div>

                <div className="reports-history-detail">
                  <h3>Work Completed</h3>
                  <p>{report.work_completed || "Not provided"}</p>
                </div>

                <div className="reports-history-meta">
                  <div>
                    <span>Labour Count</span>
                    <strong>
                      {report.labour_count ?? "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Materials Used</span>
                    <strong>
                      {report.materials_used || "—"}
                    </strong>
                  </div>
                </div>

                {report.site_issues && (
                  <div className="reports-history-issue">
                    <h3>Site Issues</h3>
                    <p>{report.site_issues}</p>
                  </div>
                )}

                {report.remarks && (
                  <div className="reports-history-detail">
                    <h3>Remarks</h3>
                    <p>{report.remarks}</p>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

export default DailyReportsHistory;

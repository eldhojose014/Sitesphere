import BrandLogo from "../components/BrandLogo";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./DailyReport.css";

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const createEmptyForm = () => ({
  project_id: "",
  report_date: getTodayDate(),
  work_completed: "",
  labour_count: "",
  materials_used: "",
  site_issues: "",
  progress_percentage: "",
  remarks: "",
});

function DailyReport() {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(createEmptyForm);

  useEffect(() => {
    let active = true;

    async function fetchProjects() {
      setLoadingProjects(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("projects")
        .select("project_id, project_name")
        .order("project_name", { ascending: true });

      if (!active) return;

      if (fetchError) {
        console.error("Projects loading error:", fetchError);
        setError(`Could not load projects: ${fetchError.message}`);
      } else {
        setProjects(data || []);
      }

      setLoadingProjects(false);
    }

    fetchProjects();

    return () => {
      active = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.project_id) {
      setError("Please select a project.");
      return;
    }

    if (!form.report_date) {
      setError("Please select the report date.");
      return;
    }

    if (!form.work_completed.trim()) {
      setError("Please enter the work completed.");
      return;
    }

    let labourCount = null;

    if (form.labour_count !== "") {
      labourCount = Number(form.labour_count);

      if (!Number.isInteger(labourCount) || labourCount < 0) {
        setError("Labour count must be a whole number of 0 or more.");
        return;
      }
    }

    let progress = null;

    if (form.progress_percentage !== "") {
      progress = Number(form.progress_percentage);

      if (
        !Number.isFinite(progress) ||
        progress < 0 ||
        progress > 100
      ) {
        setError("Progress percentage must be between 0 and 100.");
        return;
      }
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(
          `Could not verify the logged-in user: ${authError.message}`
        );
      }

      if (!user) {
        throw new Error("Please log in before submitting a report.");
      }

      const { error: insertError } = await supabase
        .from("daily_reports")
        .insert({
          project_id: form.project_id,
          report_date: form.report_date,
          work_completed: form.work_completed.trim(),
          labour_count: labourCount,
          materials_used: form.materials_used.trim() || null,
          site_issues: form.site_issues.trim() || null,
          progress_percentage: progress,
          remarks: form.remarks.trim() || null,
          created_by: user.id,
        });

      if (insertError) {
        throw insertError;
      }

      setSuccess("Daily site report saved successfully.");
      setForm(createEmptyForm());
    } catch (err) {
      console.error("Daily report save error:", err);
      setError(`Could not save the report: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    setForm(createEmptyForm());
    setError("");
    setSuccess("");
  }

  return (
    <main className="daily-report-page">
      <div className="daily-report-container">
        <header className="daily-report-header">
          <div>
            <p className="daily-report-label">SITE SUPERVISOR</p>
            <h1>Daily Site Report</h1>
            <p>
              Record daily work progress, labour and site conditions.
            </p>
          </div>

          <BrandLogo variant="header" className="daily-report-logo" />
        </header>

        {error && (
          <div
            className="daily-report-message daily-report-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="daily-report-message daily-report-success"
            role="status"
          >
            {success}
          </div>
        )}

        <form className="daily-report-card" onSubmit={handleSubmit}>
          <div className="daily-report-card-header">
            <h2>Report Details</h2>
            <p>Enter the information for this working day.</p>
          </div>

          <div className="daily-report-form">
            <div className="daily-report-field">
              <label htmlFor="project_id">Project *</label>
              <select
                id="project_id"
                name="project_id"
                value={form.project_id}
                onChange={handleChange}
                required
                disabled={loadingProjects || projects.length === 0}
              >
                <option value="">
                  {loadingProjects
                    ? "Loading projects..."
                    : projects.length === 0
                      ? "No projects available"
                      : "Select a project"}
                </option>

                {projects.map((project) => (
                  <option
                    key={project.project_id}
                    value={project.project_id}
                  >
                    {project.project_name}
                  </option>
                ))}
              </select>

              {!loadingProjects && projects.length === 0 && (
                <small>
                  No projects were returned. Check your project records
                  and Supabase permissions.
                </small>
              )}
            </div>

            <div className="daily-report-field">
              <label htmlFor="report_date">Report Date *</label>
              <input
                id="report_date"
                type="date"
                name="report_date"
                value={form.report_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="daily-report-field daily-report-full">
              <label htmlFor="work_completed">Work Completed *</label>
              <textarea
                id="work_completed"
                name="work_completed"
                value={form.work_completed}
                onChange={handleChange}
                placeholder="Describe the work completed today..."
                rows={4}
                required
              />
            </div>

            <div className="daily-report-field">
              <label htmlFor="labour_count">Labour Count</label>
              <input
                id="labour_count"
                type="number"
                name="labour_count"
                value={form.labour_count}
                onChange={handleChange}
                min="0"
                step="1"
                placeholder="Number of labourers"
              />
            </div>

            <div className="daily-report-field">
              <label htmlFor="progress_percentage">
                Progress Percentage
              </label>
              <input
                id="progress_percentage"
                type="number"
                name="progress_percentage"
                value={form.progress_percentage}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.01"
                placeholder="0–100"
              />
            </div>

            <div className="daily-report-field daily-report-full">
              <label htmlFor="materials_used">Materials Used</label>
              <textarea
                id="materials_used"
                name="materials_used"
                value={form.materials_used}
                onChange={handleChange}
                placeholder="Record the materials used today..."
                rows={3}
              />
            </div>

            <div className="daily-report-field daily-report-full">
              <label htmlFor="site_issues">Site Issues</label>
              <textarea
                id="site_issues"
                name="site_issues"
                value={form.site_issues}
                onChange={handleChange}
                placeholder="Describe delays, safety concerns or other issues..."
                rows={3}
              />
            </div>

            <div className="daily-report-field daily-report-full">
              <label htmlFor="remarks">Remarks</label>
              <textarea
                id="remarks"
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                placeholder="Additional observations..."
                rows={3}
              />
            </div>
          </div>

          <div className="daily-report-actions">
            <button
              type="button"
              className="daily-report-reset"
              disabled={saving}
              onClick={handleClear}
            >
              Clear Form
            </button>

            <button
              type="submit"
              className="daily-report-submit"
              disabled={
                saving || loadingProjects || projects.length === 0
              }
            >
              {saving ? "Saving Report..." : "Save Daily Report"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default DailyReport;

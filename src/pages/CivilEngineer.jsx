import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import useCurrentUser from "../lib/useCurrentUser";
import { PLANS_TABLE, formatDate, getStatusClass } from "../lib/buildingPlans";
import Footer from "../components/Footer";
import "./CivilEngineer.css";

function CivilEngineer() {
  const { profile } = useCurrentUser();

  const [plans, setPlans] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [plansResult, projectsResult] = await Promise.all([
      supabase
        .from(PLANS_TABLE)
        .select(
          "plan_id, project_id, plan_title, plan_type, status, revision, floor_level, created_at"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("project_id, project_name, location, status")
        .order("project_name", { ascending: true }),
    ]);

    if (plansResult.error) {
      setError(
        plansResult.error.message.includes("building_plans")
          ? "The building plans table was not found. Run supabase/civil_engineer_module.sql in the Supabase SQL editor first."
          : plansResult.error.message
      );
    } else {
      setPlans(plansResult.data || []);
    }

    if (projectsResult.error) {
      setError((previous) => previous || projectsResult.error.message);
    } else {
      setProjects(projectsResult.data || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const count = (status) => plans.filter((plan) => plan.status === status).length;

    return {
      total: plans.length,
      approved: count("Approved"),
      review: count("Under Review"),
      draft: count("Draft"),
    };
  }, [plans]);

  const projectSummaries = useMemo(
    () =>
      projects.map((project) => {
        const projectPlans = plans.filter(
          (plan) => String(plan.project_id) === String(project.project_id)
        );

        return {
          ...project,
          planCount: projectPlans.length,
          approvedCount: projectPlans.filter((plan) => plan.status === "Approved")
            .length,
        };
      }),
    [projects, plans]
  );

  const projectNameById = useMemo(() => {
    const map = {};
    projects.forEach((project) => {
      map[String(project.project_id)] = project.project_name;
    });
    return map;
  }, [projects]);

  const recentPlans = plans.slice(0, 6);

  return (
    <div className="ce-page">
      <main className="ce-main">
        <section className="ce-heading">
          <div>
            <p className="ce-label">CIVIL ENGINEER</p>
            <h1>Civil Engineer Dashboard</h1>
            <p className="ce-description">
              {profile?.full_name ? `Welcome, ${profile.full_name}. ` : ""}
              Manage building plans, drawings and revisions across all
              projects.
            </p>
          </div>

          <Link to="/building-plans" className="ce-primary-link">
            Open Building Plans
          </Link>
        </section>

        {error && (
          <div className="ce-error" role="alert">
            <strong>Error</strong>
            <p>{error}</p>
          </div>
        )}

        <section className="ce-stats">
          <div className="ce-stat">
            <span>Total Plans</span>
            <strong>{loading ? "-" : stats.total}</strong>
          </div>
          <div className="ce-stat ce-stat--green">
            <span>Approved</span>
            <strong>{loading ? "-" : stats.approved}</strong>
          </div>
          <div className="ce-stat ce-stat--amber">
            <span>Under Review</span>
            <strong>{loading ? "-" : stats.review}</strong>
          </div>
          <div className="ce-stat ce-stat--blue">
            <span>Drafts</span>
            <strong>{loading ? "-" : stats.draft}</strong>
          </div>
          <div className="ce-stat">
            <span>Projects</span>
            <strong>{loading ? "-" : projects.length}</strong>
          </div>
        </section>

        <div className="ce-columns">
          <section className="ce-card">
            <div className="ce-card__header">
              <h2>Recent Plans</h2>
              <Link to="/building-plans">View all</Link>
            </div>

            {loading && <p className="ce-muted">Loading...</p>}

            {!loading && recentPlans.length === 0 && (
              <p className="ce-muted">
                No plans uploaded yet.{" "}
                <Link to="/building-plans">Upload your first plan</Link>.
              </p>
            )}

            <ul className="ce-list">
              {recentPlans.map((plan) => (
                <li key={plan.plan_id}>
                  <div>
                    <strong>{plan.plan_title}</strong>
                    <span>
                      {projectNameById[String(plan.project_id)] || "Unknown project"}
                      {" · "}
                      {plan.plan_type}
                      {plan.floor_level ? ` · ${plan.floor_level}` : ""}
                      {plan.revision ? ` · ${plan.revision}` : ""}
                    </span>
                  </div>

                  <div className="ce-list__right">
                    <span className={getStatusClass(plan.status)}>{plan.status}</span>
                    <small>{formatDate(plan.created_at)}</small>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="ce-card">
            <div className="ce-card__header">
              <h2>Plans by Project</h2>
            </div>

            {loading && <p className="ce-muted">Loading...</p>}

            {!loading && projectSummaries.length === 0 && (
              <p className="ce-muted">No projects available.</p>
            )}

            <ul className="ce-list">
              {projectSummaries.map((project) => (
                <li key={project.project_id}>
                  <div>
                    <strong>{project.project_name}</strong>
                    <span>{project.location || "No location set"}</span>
                  </div>

                  <div className="ce-list__right">
                    <span className="ce-count">
                      {project.planCount} plan{project.planCount === 1 ? "" : "s"}
                    </span>
                    <small>{project.approvedCount} approved</small>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default CivilEngineer;

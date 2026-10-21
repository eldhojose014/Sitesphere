import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

import "./Attendance.css";

function getTodayDate() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function Attendance() {
  const [labours, setLabours] = useState([]);
  const [projects, setProjects] = useState([]);
  const [attendance, setAttendance] = useState({});

  const [attendanceDate, setAttendanceDate] = useState(
    getTodayDate()
  );

  const [loading, setLoading] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (labours.length > 0 && attendanceDate) {
      fetchAttendance(attendanceDate);
    }
  }, [attendanceDate, labours]);

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const [laboursResult, projectsResult] = await Promise.all([
        supabase
          .from("labours")
          .select(
            "labour_id, project_id, labour_name, phone, designation"
          )
          .order("labour_name", { ascending: true }),

        supabase
          .from("projects")
          .select("project_id, project_name")
          .order("project_name", { ascending: true }),
      ]);

      if (laboursResult.error) {
        throw new Error(
          `Labours: ${laboursResult.error.message}`
        );
      }

      if (projectsResult.error) {
        throw new Error(
          `Projects: ${projectsResult.error.message}`
        );
      }

      setLabours(laboursResult.data || []);
      setProjects(projectsResult.data || []);
    } catch (err) {
      console.error("Attendance page error:", err);
      setError(
        err.message || "Failed to load attendance data."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (date) => {
    setLoadingAttendance(true);
    setError("");
    setSuccess("");

    try {
      const { data, error: attendanceError } = await supabase
        .from("attendance")
        .select(
          "attendance_id, labour_id, project_id, attendance_date, status"
        )
        .eq("attendance_date", date);

      if (attendanceError) {
        throw attendanceError;
      }

      const attendanceMap = {};

      (data || []).forEach((record) => {
        attendanceMap[record.labour_id] = {
          attendance_id: record.attendance_id,
          project_id: record.project_id,
          status: record.status,
        };
      });

      setAttendance(attendanceMap);
    } catch (err) {
      console.error("Attendance fetch error:", err);
      setError(
        err.message || "Failed to load attendance."
      );
    } finally {
      setLoadingAttendance(false);
    }
  };

  const getProjectName = (projectId) => {
    if (!projectId) {
      return "Not Assigned";
    }

    const project = projects.find(
      (item) => item.project_id === projectId
    );

    return project
      ? project.project_name
      : "Unknown Project";
  };

  const handleStatusChange = (labourId, status) => {
    setSuccess("");
    setError("");

    setAttendance((previous) => ({
      ...previous,
      [labourId]: {
        ...(previous[labourId] || {}),
        status,
      },
    }));
  };

  const getStatus = (labourId) => {
    return attendance[labourId]?.status || "";
  };

  const handleSaveAttendance = async () => {
    setError("");
    setSuccess("");

    if (labours.length === 0) {
      setError("No labour records found.");
      return;
    }

    const unmarkedLabours = labours.filter(
      (labour) => !getStatus(labour.labour_id)
    );

    if (unmarkedLabours.length > 0) {
      setError(
        `Please mark attendance for all labour records before saving.`
      );
      return;
    }

    setSaving(true);

    try {
      for (const labour of labours) {
        const existingRecord =
          attendance[labour.labour_id];

        const status = getStatus(labour.labour_id);

        if (existingRecord?.attendance_id) {
          const { error: updateError } = await supabase
            .from("attendance")
            .update({
              project_id: labour.project_id || null,
              attendance_date: attendanceDate,
              status,
            })
            .eq(
              "attendance_id",
              existingRecord.attendance_id
            );

          if (updateError) {
            throw updateError;
          }
        } else {
          const { data: insertedData, error: insertError } =
            await supabase
              .from("attendance")
              .insert({
                labour_id: labour.labour_id,
                project_id: labour.project_id || null,
                attendance_date: attendanceDate,
                status,
              })
              .select(
                "attendance_id, labour_id, project_id, attendance_date, status"
              )
              .single();

          if (insertError) {
            throw insertError;
          }

          setAttendance((previous) => ({
            ...previous,
            [labour.labour_id]: {
              attendance_id:
                insertedData.attendance_id,
              project_id: insertedData.project_id,
              status: insertedData.status,
            },
          }));
        }
      }

      setSuccess(
        `Attendance saved successfully for ${attendanceDate}.`
      );

      await fetchAttendance(attendanceDate);
    } catch (err) {
      console.error("Save attendance error:", err);

      setError(
        err.message || "Failed to save attendance."
      );
    } finally {
      setSaving(false);
    }
  };

  const presentCount = labours.filter(
    (labour) => getStatus(labour.labour_id) === "Present"
  ).length;

  const absentCount = labours.filter(
    (labour) => getStatus(labour.labour_id) === "Absent"
  ).length;

  const halfDayCount = labours.filter(
    (labour) => getStatus(labour.labour_id) === "Half Day"
  ).length;

  const unmarkedCount = labours.filter(
    (labour) => !getStatus(labour.labour_id)
  ).length;

  return (
    <main className="attendance-page">
      <div className="attendance-container">

        <div className="attendance-header">
          <div>
            <p className="page-label">
              SITE SUPERVISOR
            </p>

            <h1>Mark Attendance</h1>

            <p>
              Record daily attendance for your labour team.
            </p>
          </div>

          <div className="attendance-date-box">
            <label htmlFor="attendance-date">
              Attendance Date
            </label>

            <input
              id="attendance-date"
              type="date"
              value={attendanceDate}
              onChange={(e) =>
                setAttendanceDate(e.target.value)
              }
              disabled={saving}
            />
          </div>
        </div>

        {error && (
          <div className="attendance-error">
            {error}
          </div>
        )}

        {success && (
          <div className="attendance-success">
            {success}
          </div>
        )}

        {!loading && labours.length > 0 && (
          <div className="attendance-summary">

            <div className="attendance-summary-card">
              <span>Present</span>
              <strong>{presentCount}</strong>
            </div>

            <div className="attendance-summary-card">
              <span>Absent</span>
              <strong>{absentCount}</strong>
            </div>

            <div className="attendance-summary-card">
              <span>Half Day</span>
              <strong>{halfDayCount}</strong>
            </div>

            <div className="attendance-summary-card">
              <span>Not Marked</span>
              <strong>{unmarkedCount}</strong>
            </div>

          </div>
        )}

        <div className="attendance-card">

          <div className="attendance-card-header">
            <div>
              <h2>Labour Attendance</h2>

              <p>
                {labours.length} labour
                {labours.length !== 1 ? "s" : ""}
              </p>
            </div>

            <button
              type="button"
              className="save-attendance-button"
              onClick={handleSaveAttendance}
              disabled={
                saving ||
                loading ||
                loadingAttendance ||
                labours.length === 0
              }
            >
              {saving
                ? "Saving..."
                : "Save Attendance"}
            </button>
          </div>

          {loading ? (
            <div className="attendance-empty">
              Loading labour records...
            </div>
          ) : loadingAttendance ? (
            <div className="attendance-empty">
              Loading attendance...
            </div>
          ) : labours.length === 0 ? (
            <div className="attendance-empty">
              No labour records found.
            </div>
          ) : (
            <div className="attendance-table-wrapper">

              <table className="attendance-table">

                <thead>
                  <tr>
                    <th>Labour Name</th>
                    <th>Designation</th>
                    <th>Project</th>
                    <th>Attendance</th>
                  </tr>
                </thead>

                <tbody>
                  {labours.map((labour) => {
                    const currentStatus =
                      getStatus(labour.labour_id);

                    return (
                      <tr key={labour.labour_id}>

                        <td>
                          <strong>
                            {labour.labour_name}
                          </strong>

                          {labour.phone && (
                            <small>
                              {labour.phone}
                            </small>
                          )}
                        </td>

                        <td>
                          {labour.designation || "-"}
                        </td>

                        <td>
                          {getProjectName(
                            labour.project_id
                          )}
                        </td>

                        <td>
                          <div className="attendance-status-buttons">

                            <button
                              type="button"
                              className={
                                currentStatus === "Present"
                                  ? "status-button present active"
                                  : "status-button present"
                              }
                              onClick={() =>
                                handleStatusChange(
                                  labour.labour_id,
                                  "Present"
                                )
                              }
                              disabled={saving}
                            >
                              Present
                            </button>

                            <button
                              type="button"
                              className={
                                currentStatus === "Absent"
                                  ? "status-button absent active"
                                  : "status-button absent"
                              }
                              onClick={() =>
                                handleStatusChange(
                                  labour.labour_id,
                                  "Absent"
                                )
                              }
                              disabled={saving}
                            >
                              Absent
                            </button>

                            <button
                              type="button"
                              className={
                                currentStatus === "Half Day"
                                  ? "status-button half-day active"
                                  : "status-button half-day"
                              }
                              onClick={() =>
                                handleStatusChange(
                                  labour.labour_id,
                                  "Half Day"
                                )
                              }
                              disabled={saving}
                            >
                              Half Day
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>
    </main>
  );
}

export default Attendance;
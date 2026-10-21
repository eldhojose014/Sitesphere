import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./AttendanceSummary.css";

const getNextMonth = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);

  const date = new Date(year, monthNumber, 1);

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-01`;
};

const AttendanceSummary = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
  });

  const [labours, setLabours] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSummaryData = async () => {
      setLoading(true);
      setError("");

      try {
        const nextMonth = getNextMonth(selectedMonth);

        const [
          laboursResult,
          attendanceResult,
          projectsResult,
        ] = await Promise.all([
          supabase
            .from("labours")
            .select(
              "labour_id, project_id, labour_name, designation, wages"
            )
            .order("labour_name", {
              ascending: true,
            }),

          supabase
            .from("attendance")
            .select(
              "attendance_id, labour_id, project_id, attendance_date, status"
            )
            .gte(
              "attendance_date",
              `${selectedMonth}-01`
            )
            .lt(
              "attendance_date",
              nextMonth
            ),

          supabase
            .from("projects")
            .select(
              "project_id, project_name"
            )
            .order("project_name", {
              ascending: true,
            }),
        ]);

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

        if (projectsResult.error) {
          throw new Error(
            `Projects: ${projectsResult.error.message}`
          );
        }

        setLabours(laboursResult.data || []);
        setAttendance(attendanceResult.data || []);
        setProjects(projectsResult.data || []);
      } catch (err) {
        console.error(
          "Attendance summary error:",
          err
        );

        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, [selectedMonth]);

  const getProjectName = (projectId) => {
    if (!projectId) {
      return "Not Assigned";
    }

    const project = projects.find(
      (item) =>
        item.project_id === projectId
    );

    return project
      ? project.project_name
      : "Not Assigned";
  };

  const getAttendanceForLabour = (labourId) => {
    return attendance.filter(
      (record) =>
        record.labour_id === labourId
    );
  };

  const getStatus = (record) => {
    return String(
      record.status || ""
    )
      .trim()
      .toLowerCase();
  };

  const calculateSummary = (labour) => {
    const records =
      getAttendanceForLabour(
        labour.labour_id
      );

    const present = records.filter(
      (record) =>
        getStatus(record) === "present"
    ).length;

    const halfDay = records.filter(
      (record) =>
        getStatus(record) === "half day" ||
        getStatus(record) === "halfday" ||
        getStatus(record) === "half_day" ||
        getStatus(record) === "half"
    ).length;

    const absent = records.filter(
      (record) =>
        getStatus(record) === "absent"
    ).length;

    const payableDays =
      present + halfDay * 0.5;

    const dailyWage =
      Number(labour.wages) || 0;

    const salary =
      payableDays * dailyWage;

    return {
      present,
      halfDay,
      absent,
      payableDays,
      dailyWage,
      salary,
    };
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }
    ).format(value);
  };

  const formatMonth = () => {
    const [year, month] =
      selectedMonth.split("-");

    const date = new Date(
      Number(year),
      Number(month) - 1,
      1
    );

    return date.toLocaleDateString(
      "en-IN",
      {
        month: "long",
        year: "numeric",
      }
    );
  };

  return (
    <div className="attendance-summary-page">
      <main className="attendance-summary-container">

        {/* PAGE HEADER */}

        <section className="attendance-summary-header">

          <div>
            <p className="page-label">
              PAYROLL
            </p>

            <h1>
              Attendance & Salary Summary
            </h1>

            <p>
              View monthly attendance and
              payable salary for each labour.
            </p>
          </div>

          <div className="attendance-summary-month">

            <label htmlFor="salary-month">
              Salary Month
            </label>

            <input
              id="salary-month"
              type="month"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(
                  event.target.value
                )
              }
            />

          </div>

        </section>

        {/* ERROR */}

        {error && (
          <div className="attendance-error">
            {error}
          </div>
        )}

        {/* SUMMARY TABLE */}

        <section className="attendance-summary-card">

          <div className="attendance-summary-card-header">

            <div>
              <h2>
                {formatMonth()}
              </h2>

              <p>
                Labour attendance and salary
                calculation
              </p>
            </div>

          </div>

          {loading ? (
            <div className="attendance-empty">
              Loading attendance summary...
            </div>
          ) : labours.length === 0 ? (
            <div className="attendance-empty">
              No labour records found.
            </div>
          ) : (
            <div className="attendance-summary-table-wrapper">

              <table className="attendance-summary-table">

                <thead>
                  <tr>
                    <th>Labour</th>
                    <th>Project</th>
                    <th>Present</th>
                    <th>Half Day</th>
                    <th>Absent</th>
                    <th>Payable Days</th>
                    <th>Daily Wage</th>
                    <th>Salary</th>
                  </tr>
                </thead>

                <tbody>

                  {labours.map((labour) => {

                    const summary =
                      calculateSummary(
                        labour
                      );

                    return (
                      <tr
                        key={
                          labour.labour_id
                        }
                      >

                        <td>
                          <strong>
                            {labour.labour_name}
                          </strong>

                          {labour.designation && (
                            <small>
                              {labour.designation}
                            </small>
                          )}
                        </td>

                        <td>
                          {getProjectName(
                            labour.project_id
                          )}
                        </td>

                        <td>
                          {summary.present}
                        </td>

                        <td>
                          {summary.halfDay}
                        </td>

                        <td>
                          {summary.absent}
                        </td>

                        <td>
                          <strong>
                            {summary.payableDays}
                          </strong>
                        </td>

                        <td>
                          {formatCurrency(
                            summary.dailyWage
                          )}
                        </td>

                        <td>
                          <strong>
                            {formatCurrency(
                              summary.salary
                            )}
                          </strong>
                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </main>
    </div>
  );
};

export default AttendanceSummary;
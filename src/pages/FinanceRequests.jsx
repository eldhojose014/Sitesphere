import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./FinanceRequests.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const BUCKET_NAME = "finance-attachments";

const ALLOWED_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const DOCUMENT_TYPES = ["Bill", "Invoice", "Quotation"];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStart() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function FinanceRequests() {
  const [projects, setProjects] = useState([]);
  const [labours, setLabours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [laboursLoading, setLaboursLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [projectId, setProjectId] = useState("");
  const [requestType, setRequestType] = useState("Purchase");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const [labourId, setLabourId] = useState("");
  const [periodStart, setPeriodStart] = useState(getMonthStart);
  const [periodEnd, setPeriodEnd] = useState(getTodayDate);
  const [wageSummary, setWageSummary] = useState(null);

  const [attachments, setAttachments] = useState({
    Bill: null,
    Invoice: null,
    Quotation: null,
  });

  useEffect(() => {
    async function loadProjects() {
      const { data, error: projectError } = await supabase
        .from("projects")
        .select("project_id, project_name")
        .order("project_name");

      if (projectError) {
        setError(projectError.message);
      } else {
        setProjects(data ?? []);
      }
      setLoading(false);
    }
    loadProjects();
  }, []);

  useEffect(() => {
    async function loadProjectLabours() {
      setLabours([]);
      setLabourId("");
      setWageSummary(null);
      setAmount("");

      if (!projectId || requestType !== "Individual Wage") return;

      setLaboursLoading(true);
      const { data, error: labourError } = await supabase
        .from("labours")
        .select("labour_id, labour_name, wages, project_id")
        .eq("project_id", projectId)
        .order("labour_name");

      if (labourError) {
        setError(`Could not load labourers: ${labourError.message}`);
      } else {
        setLabours(data ?? []);
      }
      setLaboursLoading(false);
    }

    loadProjectLabours();
  }, [projectId, requestType]);

  useEffect(() => {
    async function calculateWage() {
      setWageSummary(null);
      setAmount("");

      if (
        requestType !== "Individual Wage" ||
        !projectId ||
        !labourId ||
        !periodStart ||
        !periodEnd
      ) {
        return;
      }

      if (periodStart > periodEnd) {
        setError("The start date must be on or before the end date.");
        return;
      }

      const selectedLabour = labours.find(
        (labour) => labour.labour_id === labourId
      );
      if (!selectedLabour) return;

      setCalculating(true);
      setError("");

      const { data: attendanceRows, error: attendanceError } = await supabase
        .from("attendance")
        .select("attendance_id, attendance_date, status, project_id, labour_id")
        .eq("project_id", projectId)
        .eq("labour_id", labourId)
        .gte("attendance_date", periodStart)
        .lte("attendance_date", periodEnd)
        .order("attendance_date");

      if (attendanceError) {
        setError(`Could not load attendance: ${attendanceError.message}`);
        setCalculating(false);
        return;
      }

      let presentDays = 0;
      let halfDays = 0;
      let absentDays = 0;
      const unrecognizedStatuses = [];

      for (const row of attendanceRows ?? []) {
        const status = String(row.status ?? "").trim().toLowerCase();
        if (status === "present") presentDays += 1;
        else if (status === "half day" || status === "half-day" || status === "halfday") halfDays += 1;
        else if (status === "absent") absentDays += 1;
        else if (row.status) unrecognizedStatuses.push(row.status);
      }

      const dailyWage = Number(selectedLabour.wages);
      const paidDays = presentDays + halfDays * 0.5;
      const totalWage = Math.round((dailyWage * paidDays + Number.EPSILON) * 100) / 100;

      setWageSummary({
        labourName: selectedLabour.labour_name,
        dailyWage,
        presentDays,
        halfDays,
        absentDays,
        paidDays,
        attendanceCount: (attendanceRows ?? []).length,
        totalWage,
        unrecognizedStatuses: [...new Set(unrecognizedStatuses)],
      });
      setAmount(totalWage > 0 ? totalWage.toFixed(2) : "");
      setCalculating(false);
    }

    calculateWage();
  }, [projectId, labourId, periodStart, periodEnd, requestType, labours]);

  function handleFileChange(documentType, file) {
    setError("");
    setMessage("");

    if (!file) {
      setAttachments((current) => ({ ...current, [documentType]: null }));
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(ALLOWED_TYPES, file.type)) {
      setError(`${documentType}: Please select a PDF, JPG, PNG, or WebP file.`);
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setError(`${documentType}: File size must be greater than 0 and no more than 10 MB.`);
      return;
    }

    setAttachments((current) => ({ ...current, [documentType]: file }));
  }

  function resetForm() {
    setProjectId("");
    setRequestType("Purchase");
    setDescription("");
    setAmount("");
    setLabourId("");
    setPeriodStart(getMonthStart());
    setPeriodEnd(getTodayDate());
    setWageSummary(null);
    setAttachments({ Bill: null, Invoice: null, Quotation: null });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const numericAmount = Number(amount);
    if (
      !projectId ||
      (requestType !== "Individual Wage" && !description.trim()) ||
      !amount ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError("Select a project and enter a valid amount. A description is required for purchase requests.");
      return;
    }

    if (requestType === "Combined Wages") {
      setError("Combined project wage requests will be enabled in the next step. Individual wage requests and purchase requests are available now.");
      return;
    }

    if (requestType === "Individual Wage") {
      if (!labourId || !wageSummary) {
        setError("Select a labourer and calculate wages before submitting.");
        return;
      }
      if (wageSummary.attendanceCount === 0 || wageSummary.totalWage <= 0) {
        setError("No payable attendance was found for this labourer and date range.");
        return;
      }
      if (wageSummary.unrecognizedStatuses.length > 0) {
        setError(`Unrecognized attendance status found: ${wageSummary.unrecognizedStatuses.join(", ")}. Correct these records before submitting.`);
        return;
      }
      if (Math.abs(numericAmount - wageSummary.totalWage) > 0.009) {
        setError("The requested amount must match the calculated wage. Re-select the labourer or date range to refresh the calculation.");
        return;
      }
    }

    const selectedFiles =
      requestType === "Purchase"
        ? DOCUMENT_TYPES.filter((type) => attachments[type]).map((type) => ({
            documentType: type,
            file: attachments[type],
          }))
        : [];

    if (requestType === "Purchase" && selectedFiles.length === 0) {
      setError("Please upload at least one Bill, Invoice, or Quotation.");
      return;
    }

    setSubmitting(true);
    let createdRequestId = null;
    const uploadedPaths = [];

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData?.user;
      if (!user) throw new Error("Please log in before submitting a request.");

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("user_id, role, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile || profile.status !== "Active" || profile.role !== "Site Supervisor") {
        throw new Error("Only an active Site Supervisor can submit finance requests.");
      }

      let finalDescription = description.trim();
      if (requestType === "Individual Wage") {
        finalDescription = `Individual wage: ${wageSummary.labourName}; period ${periodStart} to ${periodEnd}; daily rate ₹${wageSummary.dailyWage.toFixed(2)}; present ${wageSummary.presentDays}, half days ${wageSummary.halfDays}, absent ${wageSummary.absentDays}, payable days ${wageSummary.paidDays}. ${finalDescription}`;
      }

      const { data: request, error: insertError } = await supabase
        .from("finance_requests")
        .insert({
          project_id: projectId,
          requested_by: user.id,
          request_type: requestType,
          description: finalDescription,
          requested_amount: numericAmount,
        })
        .select("request_id")
        .single();

      if (insertError) throw insertError;
      createdRequestId = request.request_id;

      const metadataRows = [];
      for (const { documentType, file } of selectedFiles) {
        const extension = ALLOWED_TYPES[file.type];
        const storagePath = `${createdRequestId}/${user.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, file, { contentType: file.type, upsert: false });

        if (uploadError) throw uploadError;
        uploadedPaths.push(storagePath);
        metadataRows.push({
          request_id: createdRequestId,
          uploaded_by: user.id,
          document_type: documentType,
          original_name: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          size_bytes: file.size,
        });
      }

      if (metadataRows.length > 0) {
        const { error: metadataError } = await supabase
          .from("finance_request_attachments")
          .insert(metadataRows);
        if (metadataError) throw metadataError;
      }

      setMessage(
        selectedFiles.length > 0
          ? "Finance request and attachments submitted successfully. The request is pending accountant review."
          : "Request submitted successfully. It is now pending accountant review."
      );
      resetForm();
    } catch (err) {
      if (uploadedPaths.length > 0) {
        const { error: cleanupError } = await supabase.storage.from(BUCKET_NAME).remove(uploadedPaths);
        if (cleanupError) console.error("Attachment cleanup failed:", cleanupError.message);
      }

      if (createdRequestId) {
        setError(`Request ${createdRequestId} was created, but an attachment could not be saved. Do not submit again, as this could create a duplicate request. Please contact the administrator before retrying. Details: ${err.message || "Unknown error"}`);
      } else {
        setError(err.message || "Unable to submit the request.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="finance-page">
      <h1>Finance Requests</h1>
      <p className="finance-subtitle">
        Submit purchase and employee wage requests for accountant review.
      </p>

      <div className="finance-card">
        <h2>New Finance Request</h2>

        {loading ? (
          <p className="finance-message">Loading projects...</p>
        ) : error && projects.length === 0 ? (
          <p className="finance-error">Could not load projects: {error}</p>
        ) : projects.length === 0 ? (
          <p className="finance-message">No projects found. Add a project before creating a request.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="finance-project">Project</label>
            <select
              id="finance-project"
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
                setError("");
                setMessage("");
              }}
              required
              disabled={submitting}
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.project_id} value={project.project_id}>
                  {project.project_name}
                </option>
              ))}
            </select>

            <label htmlFor="finance-type">Request Type</label>
            <select
              id="finance-type"
              value={requestType}
              onChange={(event) => {
                setRequestType(event.target.value);
                setError("");
                setMessage("");
                setWageSummary(null);
                setAmount("");
              }}
              required
              disabled={submitting}
            >
              <option value="Purchase">Purchase / Materials</option>
              <option value="Individual Wage">Individual Employee Wage</option>
              <option value="Combined Wages">Combined Project Wages (next step)</option>
            </select>

            {requestType === "Individual Wage" && (
              <div className="finance-wage-panel">
                <h3>Individual Wage Calculation</h3>
                <p className="finance-attachment-help">
                  Only labourers currently assigned to the selected project are listed. Present = 1 day, Half Day = 0.5 day, Absent = 0 days.
                </p>

                <label htmlFor="finance-labour">Labourer</label>
                <select
                  id="finance-labour"
                  value={labourId}
                  onChange={(event) => {
                    setLabourId(event.target.value);
                    setError("");
                    setMessage("");
                  }}
                  required
                  disabled={submitting || laboursLoading || !projectId}
                >
                  <option value="">
                    {laboursLoading ? "Loading labourers..." : "Select a labourer"}
                  </option>
                  {labours.map((labour) => (
                    <option key={labour.labour_id} value={labour.labour_id}>
                      {labour.labour_name} — ₹{Number(labour.wages || 0).toFixed(2)}/day
                    </option>
                  ))}
                </select>
                {!laboursLoading && projectId && labours.length === 0 && (
                  <p className="finance-message">No labourers are currently assigned to this project.</p>
                )}

                <div className="finance-wage-dates">
                  <div>
                    <label htmlFor="finance-period-start">Period start</label>
                    <input
                      id="finance-period-start"
                      type="date"
                      value={periodStart}
                      max={periodEnd || getTodayDate()}
                      onChange={(event) => setPeriodStart(event.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="finance-period-end">Period end</label>
                    <input
                      id="finance-period-end"
                      type="date"
                      value={periodEnd}
                      min={periodStart}
                      max={getTodayDate()}
                      onChange={(event) => setPeriodEnd(event.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                {calculating && <p className="finance-message">Calculating wages from attendance...</p>}

                {wageSummary && (
                  <div className="finance-wage-summary">
                    <h4>Wage Summary — {wageSummary.labourName}</h4>
                    <div><span>Daily wage</span><strong>₹{wageSummary.dailyWage.toFixed(2)}</strong></div>
                    <div><span>Present days</span><strong>{wageSummary.presentDays}</strong></div>
                    <div><span>Half days</span><strong>{wageSummary.halfDays}</strong></div>
                    <div><span>Absent days</span><strong>{wageSummary.absentDays}</strong></div>
                    <div><span>Payable days</span><strong>{wageSummary.paidDays}</strong></div>
                    <div className="finance-wage-total"><span>Calculated wage</span><strong>₹{wageSummary.totalWage.toFixed(2)}</strong></div>
                    {wageSummary.attendanceCount === 0 && (
                      <p className="finance-error">No attendance records found for this labourer, project, and period.</p>
                    )}
                    {wageSummary.unrecognizedStatuses.length > 0 && (
                      <p className="finance-error">
                        Unrecognized status: {wageSummary.unrecognizedStatuses.join(", ")}. The request cannot be submitted until corrected.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {requestType === "Combined Wages" && (
              <p className="finance-message">
                Combined project wage calculation is the next step. For now, choose Purchase or Individual Employee Wage.
              </p>
            )}

            <label htmlFor="finance-description">
              {requestType === "Individual Wage" ? "Additional Notes" : "Description"}
            </label>
            <textarea
              id="finance-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={requestType === "Individual Wage" ? "Optional notes about this wage request..." : "Describe the materials or expense..."}
              rows={4}
              required={requestType !== "Individual Wage"}
              disabled={submitting}
            />

            <label htmlFor="finance-amount">Requested Amount (₹)</label>
            <input
              id="finance-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Calculated amount for wage requests"
              required
              readOnly={requestType === "Individual Wage"}
              disabled={submitting || requestType === "Combined Wages"}
            />

            {requestType === "Purchase" && (
              <div className="finance-attachments">
                <h3>Supporting Documents</h3>
                <p className="finance-attachment-help">
                  Upload at least one document. Bill, Invoice, and Quotation are optional individually; you do not need to upload all three. PDF, JPG, PNG, or WebP, up to 10 MB per file.
                </p>
                {DOCUMENT_TYPES.map((documentType) => (
                  <div className="finance-attachment-field" key={documentType}>
                    <label htmlFor={`finance-file-${documentType}`}>{documentType}</label>
                    <input
                      id={`finance-file-${documentType}`}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      disabled={submitting}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        handleFileChange(documentType, file);
                        event.target.value = "";
                      }}
                    />
                    {attachments[documentType] && (
                      <div className="finance-selected-file">
                        <span>
                          {attachments[documentType].name} — {(attachments[documentType].size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                        <button type="button" onClick={() => handleFileChange(documentType, null)} disabled={submitting}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {error && <p className="finance-error">{error}</p>}
            {message && <p className="finance-message">{message}</p>}

            <button type="submit" disabled={submitting || calculating || requestType === "Combined Wages"}>
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

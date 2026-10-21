import { useEffect, useState } from "react";

import { supabase } from "../lib/supabaseClient";

import "./Accountant.css";



function Accountant() {

  const [projects, setProjects] = useState([]);

  const [requests, setRequests] = useState([]);

  const [requesters, setRequesters] = useState({});

  const [loading, setLoading] = useState(true);

  const [requestsLoading, setRequestsLoading] = useState(true);

  const [error, setError] = useState("");

  const [requestError, setRequestError] = useState("");

  const [notice, setNotice] = useState("");

  const [busyId, setBusyId] = useState("");
  const [requestAttachments, setRequestAttachments] = useState({});
  const [attachmentBusyId, setAttachmentBusyId] = useState("");
  const [attachmentError, setAttachmentError] = useState("");



  const [reviewReasons, setReviewReasons] = useState({});

  const [paymentAmounts, setPaymentAmounts] = useState({});

  const [paymentDates, setPaymentDates] = useState({});

  const [paymentReferences, setPaymentReferences] = useState({});



  const [currentUserId, setCurrentUserId] = useState("");



  useEffect(() => {

    loadProjects();

    loadFinanceRequests();

  }, []);



  async function loadProjects() {

    setLoading(true);

    setError("");



    const { data, error: fetchError } = await supabase

      .from("projects")

      .select("project_id, project_name")

      .order("project_name", { ascending: true });



    if (fetchError) {

      setError(fetchError.message);

    } else {

      setProjects(data || []);

    }



    setLoading(false);

  }



  async function loadFinanceRequests() {

    setRequestsLoading(true);

    setRequestError("");

    setNotice("");



    try {

      const { data: authData, error: authError } =

        await supabase.auth.getUser();



      if (authError) throw authError;



      const user = authData?.user;



      if (!user) {

        throw new Error("Please log in with an Accountant account.");

      }



      const { data: profile, error: profileError } = await supabase

        .from("users")

        .select("user_id, role, status")

        .eq("user_id", user.id)

        .maybeSingle();



      if (profileError) throw profileError;



      if (

        !profile ||

        profile.role !== "Accountant" ||

        profile.status !== "Active"

      ) {

        throw new Error(

          "Access denied. Please log in with an active Accountant account."

        );

      }



      setCurrentUserId(user.id);



      const { data, error: fetchError } = await supabase

        .from("finance_requests")

        .select("*")

        .order("created_at", { ascending: false });



      if (fetchError) throw fetchError;



      const rows = data || [];

      setRequests(rows);

      const requestIds = rows.map((request) => request.request_id);
      if (requestIds.length > 0) {
        const { data: attachments, error: attachmentFetchError } =
          await supabase
            .from("finance_request_attachments")
            .select(
              "attachment_id, request_id, document_type, original_name, storage_path, mime_type, size_bytes"
            )
            .in("request_id", requestIds);

        if (attachmentFetchError) throw attachmentFetchError;

        const attachmentMap = {};
        (attachments || []).forEach((attachment) => {
          if (!attachmentMap[attachment.request_id]) {
            attachmentMap[attachment.request_id] = [];
          }
          attachmentMap[attachment.request_id].push(attachment);
        });
        setRequestAttachments(attachmentMap);
      } else {
        setRequestAttachments({});
      }



      const requesterIds = [

        ...new Set(rows.map((row) => row.requested_by).filter(Boolean)),

      ];



      if (requesterIds.length > 0) {

        const { data: people, error: peopleError } = await supabase

          .from("users")

          .select("user_id, full_name")

          .in("user_id", requesterIds);



        if (peopleError) throw peopleError;



        const nameMap = {};

        (people || []).forEach((person) => {

          nameMap[person.user_id] = person.full_name;

        });



        setRequesters(nameMap);

      } else {

        setRequesters({});

      }

    } catch (err) {

      setRequestError(err.message || "Could not load finance requests.");

    } finally {

      setRequestsLoading(false);

    }

  }



  async function openAttachment(attachment) {
    setAttachmentBusyId(attachment.attachment_id);
    setAttachmentError("");

    // Open the tab synchronously during the click so Chrome does not treat
    // the later signed-URL navigation as an unsolicited pop-up.
    const documentWindow = window.open("about:blank", "_blank");
    if (!documentWindow) {
      setAttachmentError(
        "The document window was blocked. Allow pop-ups for SiteSphere and try again."
      );
      setAttachmentBusyId("");
      return;
    }
    documentWindow.opener = null;
    documentWindow.document.title = "Opening document…";
    documentWindow.document.body.innerHTML =
      '<p style="font-family: sans-serif; padding: 1rem;">Opening secure document…</p>';

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authData?.user) {
        throw new Error("Please log in again.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role, status")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.role !== "Accountant" || profile?.status !== "Active") {
        throw new Error("Only an active Accountant can open these documents.");
      }

      const { data, error: signedUrlError } = await supabase.storage
        .from("finance-attachments")
        .createSignedUrl(attachment.storage_path, 60);

      if (signedUrlError) throw signedUrlError;
      if (!data?.signedUrl) throw new Error("Could not create a document link.");

      documentWindow.location.href = data.signedUrl;
    } catch (err) {
      try {
        documentWindow.close();
      } catch {
        // Ignore errors closing the temporary tab.
      }
      setAttachmentError(err.message || "Unable to open the document.");
    } finally {
      setAttachmentBusyId("");
    }
  }

  async function reviewRequest(request, decision) {

    const reason = (reviewReasons[request.request_id] || "").trim();



    if (decision === "Rejected" && !reason) {

      setRequestError("Please enter a reason before rejecting a request.");

      return;

    }



    setBusyId(request.request_id);

    setRequestError("");

    setNotice("");



    try {

      const { data: authData, error: authError } =

        await supabase.auth.getUser();



      if (authError) throw authError;



      if (!authData?.user || authData.user.id !== currentUserId) {

        throw new Error("Your login session changed. Please reload the page.");

      }



      const { data: profile, error: profileError } = await supabase

        .from("users")

        .select("role, status")

        .eq("user_id", authData.user.id)

        .maybeSingle();



      if (profileError) throw profileError;



      if (

        profile?.role !== "Accountant" ||

        profile?.status !== "Active"

      ) {

        throw new Error("Only an active Accountant can review requests.");

      }



      const { data, error: updateError } = await supabase

        .from("finance_requests")

        .update({

          status: decision,

          reviewed_by: authData.user.id,

          reviewed_at: new Date().toISOString(),

          review_reason: reason || null,

        })

        .eq("request_id", request.request_id)

        .eq("status", "Pending")

        .select("request_id");



      if (updateError) throw updateError;



      if (!data || data.length === 0) {

        throw new Error(

          "The request was not updated. It may already have been reviewed."

        );

      }



      setNotice(`Request ${decision.toLowerCase()} successfully.`);

      await loadFinanceRequests();

    } catch (err) {

      setRequestError(err.message || "Could not review this request.");

    } finally {

      setBusyId("");

    }

  }



  async function recordPayment(request) {

    const enteredAmount = Number(paymentAmounts[request.request_id]);

    const paymentDate = paymentDates[request.request_id];

    const paymentReference = (

      paymentReferences[request.request_id] || ""

    ).trim();



    if (

      !Number.isFinite(enteredAmount) ||

      enteredAmount <= 0 ||

      !paymentDate

    ) {

      setRequestError(

        "Enter a valid payment amount and payment date."

      );

      return;

    }



    const totalPaid = Number(request.paid_amount || 0) + enteredAmount;

    const requestedAmount = Number(request.requested_amount);



    if (totalPaid > requestedAmount + 0.001) {

      setRequestError(

        "The additional payment cannot make the total paid exceed the requested amount."

      );

      return;

    }



    setBusyId(request.request_id);

    setRequestError("");

    setNotice("");



    try {

      const { data: authData, error: authError } =

        await supabase.auth.getUser();



      if (authError) throw authError;



      if (!authData?.user || authData.user.id !== currentUserId) {

        throw new Error("Your login session changed. Please reload the page.");

      }



      const { data: profile, error: profileError } = await supabase

        .from("users")

        .select("role, status")

        .eq("user_id", authData.user.id)

        .maybeSingle();



      if (profileError) throw profileError;



      if (

        profile?.role !== "Accountant" ||

        profile?.status !== "Active"

      ) {

        throw new Error("Only an active Accountant can record payments.");

      }



      const nextStatus =

        totalPaid >= requestedAmount - 0.001 ? "Paid" : "Partially Paid";



      const { data, error: updateError } = await supabase

        .from("finance_requests")

        .update({

          status: nextStatus,

          paid_amount: totalPaid,

          paid_at: new Date(`${paymentDate}T12:00:00`).toISOString(),

          payment_reference: paymentReference || null,

        })

        .eq("request_id", request.request_id)

        .eq("status", request.status)

        .select("request_id");



      if (updateError) throw updateError;



      if (!data || data.length === 0) {

        throw new Error(

          "Payment was not recorded. Reload the requests and try again."

        );

      }



      setPaymentAmounts((previous) => ({

        ...previous,

        [request.request_id]: "",

      }));

      setPaymentDates((previous) => ({

        ...previous,

        [request.request_id]: "",

      }));

      setPaymentReferences((previous) => ({

        ...previous,

        [request.request_id]: "",

      }));



      setNotice("Payment record saved successfully.");

      await loadFinanceRequests();

    } catch (err) {

      setRequestError(err.message || "Could not record payment.");

    } finally {

      setBusyId("");

    }

  }



  const projectNames = {};

  projects.forEach((project) => {

    projectNames[project.project_id] = project.project_name;

  });



  const pendingCount = requests.filter(

    (request) => request.status === "Pending"

  ).length;



  // Count all requests that have passed approval, including partially and fully paid.
  const approvedCount = requests.filter(
    (request) =>
      ["Approved", "Partially Paid", "Paid"].includes(
        String(request.status || "").trim()
      )
  ).length;

  const totalRequestCount = requests.length;

  const totalPaid = requests.reduce(

    (sum, request) => sum + Number(request.paid_amount || 0),

    0

  );



  const formatCurrency = (amount) =>

    new Intl.NumberFormat("en-IN", {

      style: "currency",

      currency: "INR",

      minimumFractionDigits: 2,

    }).format(Number(amount || 0));



  return (

    <main className="accountant-page">

      <div className="accountant-heading">

        <div>

          <p className="accountant-eyebrow">SITESPHERE ERP</p>

          <h1>Accountant Dashboard</h1>

          <p className="accountant-subtitle">

            Manage project expenses, supplier payments and labour wages.

          </p>

        </div>

      </div>



      <section className="accountant-summary">

        <article className="accountant-card">
          <span>Total Requests</span>
          <strong>{totalRequestCount}</strong>
          <small>All finance requests, regardless of status</small>
        </article>



        <article className="accountant-card">

          <span>Requests Pending</span>

          <strong>{pendingCount}</strong>

          <small>Awaiting review</small>

        </article>



        <article className="accountant-card">

          <span>Approved Requests</span>

          <strong>{approvedCount}</strong>

          <small>Approved, partially paid, and fully paid requests</small>

        </article>



        <article className="accountant-card">

          <span>Payments Recorded</span>

          <strong>{formatCurrency(totalPaid)}</strong>

          <small>Total payments recorded for finance requests</small>

        </article>

      </section>



      <section className="accountant-panel">

        <h2>Finance Requests Review</h2>

        <p className="accountant-panel-description">

          Review purchase and wage requests submitted by Site Supervisors.

        </p>



        {requestError && (

          <p className="accountant-error" role="alert">

            {requestError}

          </p>

        )}

        {attachmentError && (
          <p className="accountant-error" role="alert">
            {attachmentError}
          </p>
        )}



        {notice && (

          <p className="accountant-status" role="status">

            {notice}

          </p>

        )}



        {requestsLoading && <p>Loading finance requests...</p>}



        {!requestsLoading && requests.length === 0 && !requestError && (

          <p>No finance requests are available yet.</p>

        )}



        {!requestsLoading && requests.length > 0 && (

          <div className="accountant-table-wrapper">

            <table className="accountant-table">

              <thead>

                <tr>

                  <th>Request Date</th>

                  <th>Project</th>

                  <th>Request Type</th>

                  <th>Description</th>

                  <th>Requested By</th>

                  <th>Requested Amount</th>

                  <th>Paid So Far</th>

                  <th>Status</th>

                  <th>Review / Payment</th>

                </tr>

              </thead>



              <tbody>

                {requests.map((request) => {

                  const canReview = request.status === "Pending";

                  const canPay =

                    request.status === "Approved" ||

                    request.status === "Partially Paid";



                  return (

                    <tr key={request.request_id}>

                      <td>{request.request_date}</td>

                      <td>

                        {projectNames[request.project_id] ||

                          "Unknown project"}

                      </td>

                      <td>{request.request_type}</td>

                      <td>

                        <div>{request.description}</div>
                        {requestAttachments[request.request_id]?.length > 0 && (
                          <div className="finance-attachment-list">
                            <strong>Supporting Documents</strong>
                            {requestAttachments[request.request_id].map(
                              (attachment) => (
                                <div
                                  className="finance-attachment-item"
                                  key={attachment.attachment_id}
                                >
                                  <span>
                                    {attachment.document_type}:{" "}
                                    {attachment.original_name}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={Boolean(attachmentBusyId)}
                                    onClick={() => openAttachment(attachment)}
                                  >
                                    {attachmentBusyId === attachment.attachment_id
                                      ? "Opening..."
                                      : "View Document"}
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        )}

                        {request.review_reason && (

                          <small>

                            <strong>Decision reason:</strong>{" "}

                            {request.review_reason}

                          </small>

                        )}

                        {request.payment_reference && (

                          <small>

                            <strong>Payment reference:</strong>{" "}

                            {request.payment_reference}

                          </small>

                        )}

                      </td>

                      <td>

                        {requesters[request.requested_by] ||

                          request.requested_by}

                      </td>

                      <td>{formatCurrency(request.requested_amount)}</td>

                      <td>{formatCurrency(request.paid_amount)}</td>

                      <td>

                        <span className="accountant-status">

                          {request.status}

                        </span>

                      </td>

                      <td>

                        {canReview && (

                          <div className="finance-review-actions">

                            <textarea

                              rows={2}

                              value={

                                reviewReasons[request.request_id] || ""

                              }

                              onChange={(event) =>

                                setReviewReasons((previous) => ({

                                  ...previous,

                                  [request.request_id]: event.target.value,

                                }))

                              }

                              placeholder="Decision reason (required for rejection)"

                            />



                            <button

                              type="button"

                              disabled={Boolean(busyId)}

                              onClick={() =>

                                reviewRequest(request, "Approved")

                              }

                            >

                              {busyId === request.request_id

                                ? "Processing..."

                                : "Approve"}

                            </button>



                            <button

                              type="button"

                              disabled={Boolean(busyId)}

                              onClick={() =>

                                reviewRequest(request, "Rejected")

                              }

                            >

                              Reject

                            </button>

                          </div>

                        )}



                        {canPay && (

                          <div className="finance-review-actions">

                            <label>

                              Additional amount paid (₹)

                              <input

                                type="number"

                                min="0.01"

                                step="0.01"

                                value={

                                  paymentAmounts[request.request_id] || ""

                                }

                                onChange={(event) =>

                                  setPaymentAmounts((previous) => ({

                                    ...previous,

                                    [request.request_id]: event.target.value,

                                  }))

                                }

                              />

                            </label>



                            <label>

                              Payment date

                              <input

                                type="date"

                                value={

                                  paymentDates[request.request_id] || ""

                                }

                                onChange={(event) =>

                                  setPaymentDates((previous) => ({

                                    ...previous,

                                    [request.request_id]: event.target.value,

                                  }))

                                }

                              />

                            </label>



                            <label>

                              Payment reference

                              <input

                                type="text"

                                value={

                                  paymentReferences[request.request_id] || ""

                                }

                                onChange={(event) =>

                                  setPaymentReferences((previous) => ({

                                    ...previous,

                                    [request.request_id]: event.target.value,

                                  }))

                                }

                                placeholder="Transaction ID / reference"

                              />

                            </label>



                            <button

                              type="button"

                              disabled={Boolean(busyId)}

                              onClick={() => recordPayment(request)}

                            >

                              {busyId === request.request_id

                                ? "Saving..."

                                : "Record Payment"}

                            </button>

                          </div>

                        )}



                        {!canReview && !canPay && (

                          <span>

                            {request.status === "Rejected"

                              ? "Request rejected"

                              : request.status === "Paid"

                                ? "Payment completed"

                                : "No action available"}

                          </span>

                        )}

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </div>

        )}



        <button

          type="button"

          disabled={requestsLoading || Boolean(busyId)}

          onClick={loadFinanceRequests}

        >

          Refresh Requests

        </button>

      </section>



      <section className="accountant-panel">

        <h2>Project Financial Overview</h2>

        <p className="accountant-panel-description">

          Projects available for financial tracking. This dashboard currently tracks finance requests and recorded payments; a separate project-expenses source is not connected to this summary.

        </p>



        {loading && <p>Loading projects...</p>}



        {error && (

          <p className="accountant-error">

            Could not load projects: {error}

          </p>

        )}



        {!loading && !error && projects.length === 0 && (

          <p>No projects found. Add a project before recording expenses.</p>

        )}



        {!loading && !error && projects.length > 0 && (

          <div className="accountant-table-wrapper">

            <table className="accountant-table">

              <thead>

                <tr>

                  <th>Project ID</th>

                  <th>Project Name</th>

                  <th>Finance Status</th>

                </tr>

              </thead>



              <tbody>

                {projects.map((project) => (

                  <tr key={project.project_id}>

                    <td>{project.project_id}</td>

                    <td>{project.project_name}</td>

                    <td>

                      <span className="accountant-status">

                        Ready for tracking

                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>



      <p className="accountant-note">

        The expense summary remains a placeholder until the existing expense

        records are connected to these totals.

      </p>

    </main>

  );

}



export default Accountant;

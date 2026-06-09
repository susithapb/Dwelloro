import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiClient, fileUrl, useAuth } from "../lib/api";
import { Eyebrow, StatusBadge } from "../components/Common";
import { toast } from "sonner";
import { ArrowLeft, Sparkle, ShieldCheck, CurrencyDollar, CheckCircle, XCircle, Clock } from "@phosphor-icons/react";

const PM_STATUSES = ["open", "assigned", "in_progress", "completed", "closed"];
const CONTRACTOR_STATUSES = ["in_progress", "completed"];

const fmt = (str) => (str || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [genBrief, setGenBrief] = useState(false);
  const [note, setNote] = useState("");
  const [contractors, setContractors] = useState([]);
  const [selectedContractor, setSelectedContractor] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const canAssign = user?.role === "property_manager" || user?.role === "landlord";
  const isAssignedContractor = user?.role === "contractor" && ticket?.assigned_contractor_id === user?.id;
  const canReviewQuote = (user?.role === "property_manager" || user?.role === "landlord") && ticket?.status === "awaiting_quote";

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/tickets/${id}`);
      setTicket(data);
      if (data.property_id) {
        const { data: p } = await apiClient.get(`/properties/${data.property_id}`).catch(() => ({ data: null }));
        setProperty(p);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!canAssign) return;
    apiClient.get("/users/contractors")
      .then(({ data }) => setContractors(data))
      .catch(() => toast.error("Failed to load contractors"));
  }, [canAssign]);

  const onStatus = async (status) => {
    try {
      await apiClient.patch(`/tickets/${id}`, { status });
      toast.success(`Status updated to ${status.replace("_", " ")}`);
      load();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const onAddNote = async () => {
    if (!note.trim()) return;
    try {
      await apiClient.patch(`/tickets/${id}`, { note });
      setNote("");
      load();
    } catch {
      toast.error("Failed to add note");
    }
  };

  const onAssign = async () => {
    if (!selectedContractor) return;

    setAssigning(true);

    try {
      await apiClient.post(`/tickets/${id}/assign`, { contractor_id: selectedContractor });
      toast.success("Contractor assigned");
      load();
    } catch (err) {
      toast.error("Failed to assign contractor");
    } finally {
      setAssigning(false);
    }
  };

  const onSubmitQuote = async (e) => {
    e.preventDefault();
    setSubmittingQuote(true);
    try {
      const { data } = await apiClient.post(`/tickets/${id}/quote`, { amount: Number(quoteAmount), notes: quoteNotes });
      setTicket(data);
      setQuoteAmount("");
      setQuoteNotes("");
      toast.success("Quote submitted — awaiting approval");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit quote");
    } finally {
      setSubmittingQuote(false);
    }
  };

  const onApproveQuote = async () => {
    try {
      const { data } = await apiClient.post(`/tickets/${id}/quote/approve`);
      setTicket(data);
      toast.success("Quote approved — work is now in progress");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to approve quote");
    }
  };

  const onRejectQuote = async () => {
    try {
      const { data } = await apiClient.post(`/tickets/${id}/quote/reject`, { reason: rejectReason });
      setTicket(data);
      setShowRejectForm(false);
      setRejectReason("");
      toast.success("Quote rejected — contractor will be notified");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to reject quote");
    }
  };

  const onGenBrief = async () => {
    setGenBrief(true);
    try {
      await apiClient.post(`/tickets/${id}/brief`);
      toast.success("AI brief generated");
      load();
    } catch {
      toast.error("Failed to generate brief");
    } finally {
      setGenBrief(false);
    }
  };

  if (loading) return <AppShell><div className="p-8 text-slate-500">Loading…</div></AppShell>;
  if (!ticket) return <AppShell><div className="p-8">Ticket not found.</div></AppShell>;

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <Link to="/tickets" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#004B87] mb-4" data-testid="back-to-tickets">
          <ArrowLeft size={14} weight="bold" /> Back to tickets
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <Eyebrow>Ticket #{ticket.id.slice(0, 8)}</Eyebrow>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2" data-testid="ticket-detail-title">{ticket.title}</h1>
            {property && (
              <Link to={`/properties/${property.id}`} className="text-slate-600 hover:text-[#004B87]">
                {property.address}, {property.suburb}, {property.city}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.urgency} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 p-6">
              <div className="label-eyebrow mb-2">Description</div>
              <p className="text-slate-800 whitespace-pre-wrap">{ticket.description}</p>
              {ticket.photo_paths?.length > 0 && (
                <div className="mt-5 grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {ticket.photo_paths.map((p) => (
                    <a key={p} href={fileUrl(p)} target="_blank" rel="noreferrer" className="block">
                      <img src={fileUrl(p)} alt="" className="w-full h-28 object-cover border border-slate-200" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {ticket.ai_analysis && (
              <div className="bg-white border border-slate-200 p-6">
                <div className="flex items-center gap-2 text-[#FF5722]">
                  <Sparkle size={16} weight="fill" />
                  <div className="label-eyebrow">AI Analysis</div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Pair k="Category" v={ticket.ai_analysis.category} />
                  <Pair k="Urgency" v={ticket.ai_analysis.urgency} />
                  <Pair k="Contractor" v={ticket.ai_analysis.contractor_type} />
                  <Pair k="Healthy Homes" v={ticket.ai_analysis.healthy_homes_relevant ? `Yes · ${ticket.ai_analysis.healthy_homes_area || ""}` : "No"} />
                </div>
                {ticket.ai_analysis.summary && (
                  <div className="mt-3">
                    <div className="label-eyebrow">Summary</div>
                    <p className="text-slate-700 mt-1">{ticket.ai_analysis.summary}</p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="label-eyebrow">Contractor brief</div>
                {user?.role !== "tenant" && (
                  <button
                    onClick={onGenBrief}
                    disabled={genBrief}
                    data-testid="generate-brief-btn"
                    className="text-xs font-bold uppercase tracking-wider bg-[#004B87] hover:bg-[#003A69] text-white px-3 py-1.5 disabled:opacity-60"
                  >
                    {genBrief ? "Generating…" : ticket.contractor_brief ? "Regenerate" : "Generate"}
                  </button>
                )}
              </div>
              {ticket.contractor_brief ? (
                <p className="text-slate-800 whitespace-pre-wrap">{ticket.contractor_brief}</p>
              ) : (
                <p className="text-sm text-slate-500">No brief generated yet.</p>
              )}
            </div>

            <div className="bg-white border border-slate-200 p-6">
              <div className="label-eyebrow mb-3">Timeline &amp; notes</div>
              <ul className="space-y-3 text-sm">
                {(ticket.timeline || []).map((e, i) => (
                  <li key={i} className="border-l-2 border-[#004B87] pl-3">
                    <div className="font-mono text-[11px] text-slate-500">{new Date(e.at).toLocaleString()}</div>
                    <div className="font-semibold">{fmt(e.event)}{e.status ? ` → ${fmt(e.status)}` : ""}</div>
                    {e.note && <div className="text-slate-700">{e.note}</div>}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note…"
                  data-testid="ticket-note-input"
                  className="flex-1 border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#004B87]"
                />
                <button onClick={onAddNote} data-testid="ticket-add-note-btn" className="bg-[#004B87] hover:bg-[#003A69] text-white px-4 font-semibold text-sm">
                  Add note
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            {user?.role !== "tenant" && (
              <div className="bg-white border border-slate-200 p-5">
                <div className="label-eyebrow mb-3">Update status</div>
                <div className="grid grid-cols-2 gap-2">
                  {(canAssign ? PM_STATUSES : CONTRACTOR_STATUSES).map((s) => (
                    <button
                      key={s}
                      onClick={() => onStatus(s)}
                      data-testid={`status-btn-${s}`}
                      className={`px-2 py-2 text-xs font-bold uppercase tracking-wider border transition-colors ${ticket.status === s
                          ? "bg-[#004B87] text-white border-[#004B87]"
                          : "bg-white border-slate-300 hover:border-[#004B87]"
                        }`}
                    >
                      {fmt(s)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {canAssign && (
              <div className="bg-white border border-slate-200 p-5" data-testid="assign-contractor-panel">
                <div className="label-eyebrow mb-3">Assign contractor</div>
                {ticket.assigned_contractor_id && (
                  <div className="mb-3 text-sm">
                    <div className="label-eyebrow">Currently assigned</div>
                    <div className="font-semibold mt-1" data-testid="current-assignee-name">
                      {contractors.find((c) => c.id === ticket.assigned_contractor_id)?.full_name || ticket.assigned_contractor_id.slice(0, 8)}
                    </div>
                  </div>
                )}
                <select
                  value={selectedContractor}
                  onChange={(e) => setSelectedContractor(e.target.value)}
                  data-testid="contractor-select"
                  className="w-full border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#004B87] bg-white"
                >
                  <option value="">Select a contractor…</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name} — {c.email}</option>
                  ))}
                </select>
                <button
                  onClick={onAssign}
                  disabled={assigning || !selectedContractor || selectedContractor === ticket.assigned_contractor_id}
                  data-testid="assign-contractor-btn"
                  className="mt-3 w-full bg-[#FF5722] hover:bg-[#E64A19] disabled:opacity-50 text-white py-2 font-semibold text-sm transition-colors"
                >
                  {assigning ? "Assigning…" : ticket.assigned_contractor_id ? "Reassign" : "Assign"}
                </button>
              </div>
            )}

            {/* Contractor: submit a quote */}
            {isAssignedContractor && ticket.status === "assigned" && (
              <div className="bg-white border border-slate-200 p-5" data-testid="quote-submit-panel">
                <div className="flex items-center gap-2 mb-3">
                  <CurrencyDollar size={18} weight="bold" className="text-[#004B87]" />
                  <div className="label-eyebrow">Submit a quote</div>
                </div>
                <form onSubmit={onSubmitQuote} className="space-y-3">
                  <div>
                    <label className="label-eyebrow block mb-1">Amount (NZD) <span className="text-[#FF5722]">*</span></label>
                    <div className="flex items-center border border-slate-300 focus-within:ring-2 focus-within:ring-[#004B87]">
                      <span className="px-3 py-2 text-slate-500 text-sm border-r border-slate-300 bg-slate-50">$</span>
                      <input
                        required
                        type="number"
                        min="1"
                        step="0.01"
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        data-testid="quote-amount-input"
                        placeholder="0.00"
                        className="flex-1 px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-eyebrow block mb-1">Notes <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                    <textarea
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                      rows={3}
                      data-testid="quote-notes-input"
                      placeholder="Scope of work, materials, estimated time…"
                      className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#004B87]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingQuote || !quoteAmount}
                    data-testid="quote-submit-btn"
                    className="w-full bg-[#FF5722] hover:bg-[#E64A19] disabled:opacity-50 text-white py-2.5 font-semibold text-sm"
                  >
                    {submittingQuote ? "Submitting…" : "Submit quote"}
                  </button>
                </form>
              </div>
            )}

            {/* Contractor: quote pending review */}
            {isAssignedContractor && ticket.status === "awaiting_quote" && (
              <div className="bg-amber-50 border border-amber-200 p-5" data-testid="quote-pending-panel">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={18} weight="bold" className="text-amber-600" />
                  <div className="label-eyebrow text-amber-700">Quote pending review</div>
                </div>
                <div className="text-2xl font-display font-bold text-amber-800 mb-1">
                  NZD {Number(ticket.quote_amount).toFixed(2)}
                </div>
                {ticket.quote_notes && <p className="text-sm text-amber-700">{ticket.quote_notes}</p>}
                <p className="text-xs text-amber-600 mt-2">Submitted {new Date(ticket.quote_submitted_at).toLocaleString()}</p>
              </div>
            )}

            {/* PM / landlord: review quote */}
            {canReviewQuote && (
              <div className="bg-white border-2 border-[#004B87] p-5" data-testid="quote-review-panel">
                <div className="flex items-center gap-2 mb-3">
                  <CurrencyDollar size={18} weight="bold" className="text-[#004B87]" />
                  <div className="label-eyebrow text-[#004B87]">Quote awaiting approval</div>
                </div>
                <div className="text-3xl font-display font-bold text-[#004B87] mb-1">
                  NZD {Number(ticket.quote_amount).toFixed(2)}
                </div>
                {ticket.quote_notes && (
                  <p className="text-sm text-slate-700 mt-2 mb-3 whitespace-pre-wrap">{ticket.quote_notes}</p>
                )}
                <p className="text-xs text-slate-400 mb-4">
                  Submitted {new Date(ticket.quote_submitted_at).toLocaleString()}
                </p>
                <div className="space-y-2">
                  <button
                    onClick={onApproveQuote}
                    data-testid="quote-approve-btn"
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 font-semibold text-sm"
                  >
                    <CheckCircle size={16} weight="bold" /> Approve — start work
                  </button>
                  {!showRejectForm ? (
                    <button
                      onClick={() => setShowRejectForm(true)}
                      data-testid="quote-reject-btn"
                      className="w-full flex items-center justify-center gap-2 border border-slate-300 text-slate-600 hover:bg-slate-50 py-2.5 font-semibold text-sm"
                    >
                      <XCircle size={16} weight="bold" /> Reject
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        data-testid="reject-reason-input"
                        placeholder="Reason for rejection (optional)…"
                        className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#004B87]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={onRejectQuote}
                          data-testid="quote-reject-confirm-btn"
                          className="flex-1 bg-[#FF5722] hover:bg-[#E64A19] text-white py-2 font-semibold text-sm"
                        >
                          Confirm reject
                        </button>
                        <button
                          onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                          className="px-3 py-2 border border-slate-300 text-slate-600 text-sm hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Previous quote result (after decision) */}
            {ticket.quote_amount != null && !["awaiting_quote", "assigned", "open"].includes(ticket.status) && (
              <div className="bg-white border border-slate-200 p-4">
                <div className="label-eyebrow mb-2">Quote</div>
                <div className="font-display font-bold text-lg">NZD {Number(ticket.quote_amount).toFixed(2)}</div>
                {ticket.quote_approved_at && (
                  <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                    <CheckCircle size={12} weight="bold" /> Approved {new Date(ticket.quote_approved_at).toLocaleDateString()}
                  </div>
                )}
                {ticket.quote_rejected_at && (
                  <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                    <XCircle size={12} weight="bold" /> Rejected {new Date(ticket.quote_rejected_at).toLocaleDateString()}
                    {ticket.quote_rejection_reason && <span className="text-slate-500"> · {ticket.quote_rejection_reason}</span>}
                  </div>
                )}
              </div>
            )}

            {ticket.ai_analysis?.healthy_homes_relevant && (
              <div className="bg-[#004B87] text-white p-5">
                <ShieldCheck size={24} weight="duotone" />
                <div className="font-display font-bold mt-3">Healthy Homes flagged</div>
                <p className="text-sm text-white/80 mt-1">Area: {ticket.ai_analysis.healthy_homes_area || "general"}. Add evidence to the property file.</p>
                {property && (
                  <Link to={`/properties/${property.id}`} className="text-xs font-bold uppercase tracking-wider mt-3 inline-block underline">
                    Open compliance file
                  </Link>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function Pair({ k, v }) {
  return (
    <div>
      <div className="label-eyebrow">{k}</div>
      <div className="font-mono text-slate-800">{v}</div>
    </div>
  );
}

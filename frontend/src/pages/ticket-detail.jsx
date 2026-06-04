import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiClient, fileUrl, useAuth } from "../lib/api";
import { Eyebrow, StatusBadge } from "../components/Common";
import { toast } from "sonner";
import { ArrowLeft, Sparkle, ShieldCheck } from "@phosphor-icons/react";

const STATUSES = ["open", "assigned", "in_progress", "awaiting_quote", "completed", "closed"];

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

  const canAssign = user?.role === "property_manager"

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
      await apiClient.patch(`/tickets/${id}`, {
        assigned_contractor_id: selectedContractor,
        status: "assigned",
      });

      toast.success("Contractor assigned");

      setTicket((prev) => ({
        ...prev,
        assigned_contractor_id: selectedContractor,
        status:
          prev.status === "open"
            ? "assigned"
            : prev.status,
      }));
    } catch (err) {
      toast.error("Failed to assign contractor");
    } finally {
      setAssigning(false);
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
                    <div className="font-semibold">{e.event}{e.status ? ` → ${e.status}` : ""}</div>
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
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => onStatus(s)}
                      data-testid={`status-btn-${s}`}
                      className={`px-2 py-2 text-xs font-bold uppercase tracking-wider border transition-colors ${ticket.status === s
                          ? "bg-[#004B87] text-white border-[#004B87]"
                          : "bg-white border-slate-300 hover:border-[#004B87]"
                        }`}
                    >
                      {s.replace("_", " ")}
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

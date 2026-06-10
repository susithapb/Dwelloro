import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiClient } from "../lib/api";
import { Eyebrow, StatusBadge, SkeletonTable } from "../components/Common";
import { ArrowLeft, Wrench, User, TrendUp, Clock } from "@phosphor-icons/react";

const TRADE_LABELS = { plumber: "Plumber", electrician: "Electrician", builder: "Builder", painter: "Painter", hvac: "HVAC", locksmith: "Locksmith", roofer: "Roofer", general_maintenance: "General Maintenance", other: "Other" };
const fmtTrade = (t) => TRADE_LABELS[t] || (t || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function ContractorDetail() {
  const { id } = useParams();
  const [contractor, setContractor] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: u }, { data: tk }, { data: mx }] = await Promise.all([
          apiClient.get(`/users/${id}`),
          apiClient.get(`/tickets?assigned_contractor_id=${id}`),
          apiClient.get("/contractors/metrics"),
        ]);
        setContractor(u);
        setTickets(tk || []);
        setMetrics((mx || []).find((m) => m.contractor_id === id) || null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <AppShell><div className="p-8 text-slate-500">Loading…</div></AppShell>;
  if (!contractor) return <AppShell><div className="p-8">Contractor not found.</div></AppShell>;

  const statusOrder = ["open", "assigned", "awaiting_quote", "in_progress", "completed", "closed"];
  const sorted = [...tickets].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <Link to="/contractors" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#004B87] mb-4">
          <ArrowLeft size={14} weight="bold" /> All contractors
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#004B87] flex items-center justify-center flex-shrink-0">
              <User size={24} weight="bold" className="text-white" />
            </div>
            <div>
              <Eyebrow>Contractor profile</Eyebrow>
              <h1 className="font-display text-3xl font-bold tracking-tight mt-1">{contractor.full_name}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <a href={`mailto:${contractor.email}`} className="text-sm text-[#004B87] hover:underline">{contractor.email}</a>
                {contractor.phone && <span className="text-sm text-slate-500">{contractor.phone}</span>}
                {contractor.trade && (
                  <span className="inline-block bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5">{fmtTrade(contractor.trade)}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatTile icon={Wrench} label="Total jobs" value={metrics.total} />
            <StatTile icon={TrendUp} label="Completed" value={metrics.completed} accent />
            <StatTile icon={TrendUp} label="Completion rate" value={`${metrics.completion_rate}%`} />
            <StatTile icon={Clock} label="Avg resolution" value={metrics.avg_resolution_hours != null ? `${metrics.avg_resolution_hours}h` : "—"} />
          </div>
        )}

        <h2 className="font-display text-xl font-bold mb-4">Job history</h2>
        {tickets.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 text-center text-slate-400 text-sm">No jobs assigned yet.</div>
        ) : (
          <div className="bg-white border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-5 py-3 label-eyebrow">Ticket</th>
                  <th className="px-5 py-3 label-eyebrow">Urgency</th>
                  <th className="px-5 py-3 label-eyebrow">Status</th>
                  <th className="px-5 py-3 label-eyebrow">Assigned</th>
                  {metrics?.quote_amount != null && <th className="px-5 py-3 label-eyebrow text-right">Quote</th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link to={`/tickets/${t.id}`} className="font-semibold hover:text-[#004B87]">{t.title}</Link>
                      <div className="text-xs text-slate-400 font-mono">#{t.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={t.urgency} /></td>
                    <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
                    {t.quote_amount != null && (
                      <td className="px-5 py-3 text-right font-mono text-sm">NZD {Number(t.quote_amount).toFixed(2)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatTile({ icon: Icon, label, value, accent = false }) {
  return (
    <div className={`bg-white border border-slate-200 p-4 ${accent ? "border-l-4 border-l-emerald-500" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="label-eyebrow">{label}</div>
        <Icon size={16} weight="bold" className="text-[#004B87]" />
      </div>
      <div className="font-display text-2xl font-bold mt-2 text-[#0F172A]">{value}</div>
    </div>
  );
}

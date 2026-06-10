import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiClient } from "../lib/api";
import { Eyebrow, SkeletonTable } from "../components/Common";
import { Pulse, UserPlus, Wrench, ClipboardText } from "@phosphor-icons/react";

const TYPE_META = {
  signup: { icon: UserPlus, color: "bg-blue-100 text-[#004B87]", label: "Sign-up" },
  ticket: { icon: Wrench, color: "bg-orange-100 text-[#FF5722]", label: "Ticket" },
  inspection: { icon: ClipboardText, color: "bg-emerald-100 text-emerald-700", label: "Inspection" },
};

export default function AdminActivity() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await apiClient.get("/admin/activity");
        setEvents(data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = filter ? events.filter((e) => e.type === filter) : events;

  return (
    <AppShell>
      <div className="p-6 md:p-8">
        <Eyebrow>Admin</Eyebrow>
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2">Activity feed</h1>
          <div className="flex items-center gap-2 mt-2">
            {["", "signup", "ticket", "inspection"].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
                  filter === t ? "bg-[#004B87] text-white border-[#004B87]" : "bg-white border-slate-300 text-slate-600 hover:border-[#004B87]"
                }`}
              >
                {t === "" ? "All" : TYPE_META[t]?.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={10} cols={3} />
        ) : visible.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 text-center text-slate-400">No activity yet.</div>
        ) : (
          <div className="bg-white border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-5 py-3 label-eyebrow">Type</th>
                  <th className="px-5 py-3 label-eyebrow">Event</th>
                  <th className="px-5 py-3 label-eyebrow">Detail</th>
                  <th className="px-5 py-3 label-eyebrow text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e, i) => {
                  const meta = TYPE_META[e.type] || TYPE_META.ticket;
                  const Icon = meta.icon;
                  return (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 ${meta.color}`}>
                          <Icon size={11} weight="bold" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold">{e.label}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs font-mono">
                        {e.type === "signup" && e.meta?.email}
                        {e.type === "ticket" && e.meta?.id && `#${e.meta.id.slice(0, 8)} · ${e.meta.urgency || ""} · ${e.meta.status || ""}`}
                        {e.type === "inspection" && e.meta?.id && `#${e.meta.id.slice(0, 8)} · ${e.meta.status || ""}`}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-slate-500">
                        {new Date(e.at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

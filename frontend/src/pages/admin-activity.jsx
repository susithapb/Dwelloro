import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiClient } from "../lib/api";
import { Eyebrow, SkeletonTable } from "../components/Common";
import { Pulse, UserPlus, Wrench, ClipboardText, ArrowUp, ArrowDown, CaretLeft, CaretRight } from "@phosphor-icons/react";

const TYPE_META = {
  signup: { icon: UserPlus, color: "bg-blue-100 text-[#004B87]", label: "Sign-up" },
  ticket: { icon: Wrench, color: "bg-orange-100 text-[#FF5722]", label: "Ticket" },
  inspection: { icon: ClipboardText, color: "bg-emerald-100 text-emerald-700", label: "Inspection" },
};

const PAGE_SIZE = 15;

export default function AdminActivity() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);

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

  const filtered = filter ? events.filter((e) => e.type === filter) : events;
  const sorted = [...filtered].sort((a, b) => {
    const diff = new Date(b.at) - new Date(a.at);
    return sortDesc ? diff : -diff;
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const onFilter = (f) => { setFilter(f); setPage(1); };
  const onSort = () => { setSortDesc((v) => !v); setPage(1); };

  return (
    <AppShell>
      <div className="p-6 md:p-8">
        <Eyebrow>Admin</Eyebrow>
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2">Activity feed</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {["", "signup", "ticket", "inspection"].map((t) => (
              <button
                key={t}
                onClick={() => onFilter(t)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
                  filter === t ? "bg-[#004B87] text-white border-[#004B87]" : "bg-white border-slate-300 text-slate-600 hover:border-[#004B87]"
                }`}
              >
                {t === "" ? "All" : TYPE_META[t]?.label}
              </button>
            ))}
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button
              onClick={onSort}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-slate-300 bg-white text-slate-600 hover:border-[#004B87] transition-colors"
            >
              {sortDesc ? <ArrowDown size={12} weight="bold" /> : <ArrowUp size={12} weight="bold" />}
              {sortDesc ? "Newest first" : "Oldest first"}
            </button>
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={10} cols={4} />
        ) : sorted.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 text-center text-slate-400">No activity yet.</div>
        ) : (
          <>
            <div className="bg-white border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="px-5 py-3 label-eyebrow">Type</th>
                    <th className="px-5 py-3 label-eyebrow">Event</th>
                    <th className="px-5 py-3 label-eyebrow">Detail</th>
                    <th className="px-5 py-3 label-eyebrow text-right cursor-pointer select-none hover:text-[#004B87]" onClick={onSort}>
                      <span className="inline-flex items-center justify-end gap-1">
                        When {sortDesc ? <ArrowDown size={11} weight="bold" /> : <ArrowUp size={11} weight="bold" />}
                      </span>
                    </th>
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

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="text-slate-500 text-xs">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length} events
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-300 text-xs font-semibold disabled:opacity-40 hover:border-[#004B87] disabled:hover:border-slate-300 transition-colors"
                >
                  <CaretLeft size={12} weight="bold" /> Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-xs">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 text-xs font-bold border transition-colors ${
                          safePage === p ? "bg-[#004B87] text-white border-[#004B87]" : "border-slate-300 hover:border-[#004B87]"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-300 text-xs font-semibold disabled:opacity-40 hover:border-[#004B87] disabled:hover:border-slate-300 transition-colors"
                >
                  Next <CaretRight size={12} weight="bold" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

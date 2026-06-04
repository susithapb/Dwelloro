import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiClient } from "../lib/api";
import { Eyebrow, StatusBadge } from "../components/Common";
import { Link } from "react-router-dom";

const COLUMNS = [
  { key: "open", label: "Open" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In progress" },
  { key: "awaiting_quote", label: "Awaiting quote" },
  { key: "completed", label: "Completed" },
];

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [tk, pr] = await Promise.all([
          apiClient.get("/tickets").catch((e) => { console.error("tickets", e); return { data: [] }; }),
          apiClient.get("/properties").catch(() => ({ data: [] })),
        ]);
        setTickets(tk.data || []);
        setProperties(pr.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const propMap = Object.fromEntries(properties.map((p) => [p.id, p]));

  return (
    <AppShell>
      <div className="p-6 md:p-8">
        <Eyebrow>Workflow</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2 mb-8" data-testid="tickets-title">
          Tickets board
        </h1>

        {loading ? (
          <div className="text-slate-500">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4" data-testid="tickets-board">
            {COLUMNS.map((c) => {
              const items = tickets.filter((t) => t.status === c.key);
              return (
                <div key={c.key} className="bg-white border border-slate-200 min-h-[200px]">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div className="label-eyebrow">{c.label}</div>
                    <div className="text-xs font-mono text-slate-500">{items.length}</div>
                  </div>
                  <div className="p-3 space-y-3">
                    {items.length === 0 && <div className="text-xs text-slate-400 text-center py-6">—</div>}
                    {items.map((t) => {
                      const prop = propMap[t.property_id];
                      return (
                        <Link
                          key={t.id}
                          to={`/tickets/${t.id}`}
                          data-testid={`ticket-card-${t.id}`}
                          className="block bg-[#F8FAFC] border border-slate-200 p-3 hover:border-[#004B87] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-sm leading-tight">{t.title}</div>
                            <StatusBadge status={t.urgency} />
                          </div>
                          {prop && <div className="text-xs text-slate-500 mt-1.5">{prop.address}</div>}
                          {t.ai_analysis?.healthy_homes_relevant && (
                            <div className="mt-2 inline-block text-[10px] font-bold tracking-wider uppercase bg-[#004B87] text-white px-1.5 py-0.5">
                              Healthy Homes
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

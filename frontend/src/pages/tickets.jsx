import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiClient } from "../lib/api";
import { Eyebrow, StatusBadge } from "../components/Common";
import { Link } from "react-router-dom";
import { MagnifyingGlass, X, Ticket } from "@phosphor-icons/react";
import { SkeletonKanban, EmptyState } from "../components/Common";

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
  const [search, setSearch] = useState("");
  const [filterProperty, setFilterProperty] = useState("");
  const [filterUrgency, setFilterUrgency] = useState("");

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

  const hasFilters = search || filterProperty || filterUrgency;
  const filteredTickets = tickets.filter((t) => {
    if (filterProperty && t.property_id !== filterProperty) return false;
    if (filterUrgency && t.urgency !== filterUrgency) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const clearFilters = () => { setSearch(""); setFilterProperty(""); setFilterUrgency(""); };

  return (
    <AppShell>
      <div className="p-6 md:p-8">
        <Eyebrow>Workflow</Eyebrow>
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2" data-testid="tickets-title">
            Tickets board
          </h1>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <div className="relative">
              <MagnifyingGlass size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickets…"
                className="pl-8 pr-3 py-2 border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-[#004B87] w-48"
                data-testid="tickets-search"
              />
            </div>
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#004B87]"
              data-testid="tickets-filter-property"
            >
              <option value="">All properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.address}</option>
              ))}
            </select>
            <select
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#004B87]"
              data-testid="tickets-filter-urgency"
            >
              <option value="">All urgencies</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            {hasFilters && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-2 border border-slate-200 hover:bg-slate-50">
                <X size={12} weight="bold" /> Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <SkeletonKanban cols={5} />
        ) : filteredTickets.length === 0 && hasFilters ? (
          <EmptyState
            icon={Ticket}
            title="No tickets match your filters"
            description="Try adjusting the search or filters above."
            action={<button onClick={clearFilters} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-semibold hover:bg-slate-50"><X size={13} weight="bold" /> Clear filters</button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4" data-testid="tickets-board">
            {COLUMNS.map((c) => {
              const items = filteredTickets.filter((t) => t.status === c.key);
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

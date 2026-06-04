import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiClient, useAuth } from "../lib/api";
import { Eyebrow, StatTile, StatusBadge } from "../components/Common";
import { Link } from "react-router-dom";
import { ArrowRight, Buildings, Wrench, ShieldCheck } from "@phosphor-icons/react";
import AlertsFeed from "../components/AlertsFeed";
import PortfolioIntelligence from "../components/PortfolioIntelligence";

export default function Dashboard() {
  const { user } = useAuth();
  const [props, setProps] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [pr, tk] = await Promise.all([
          apiClient.get("/properties").catch((e) => { console.error("properties fetch", e); return { data: [] }; }),
          apiClient.get("/tickets").catch((e) => { console.error("tickets fetch", e); return { data: [] }; }),
        ]);
        if (cancelled) return;
        setProps(pr.data || []);
        setTickets(tk.data || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const openCount = tickets.filter((t) => !["completed", "closed"].includes(t.status)).length;
  const criticalCount = tickets.filter((t) => t.urgency === "critical" || t.urgency === "high").length;
  const hhCount = tickets.filter((t) => t.ai_analysis?.healthy_homes_relevant).length;
  const isOps = user?.role === "property_manager" || user?.role === "landlord";

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <Eyebrow>Overview</Eyebrow>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2" data-testid="dashboard-title">
              Kia ora, {user?.full_name?.split(" ")[0]}.
            </h1>
            <div className="text-slate-600 mt-1">
              {user?.role === "tenant"
                ? "Report an issue, follow your tickets, watch progress."
                : "Your portfolio at a glance."}
            </div>
          </div>
          {user?.role === "tenant" && (
            <Link
              to="/report"
              data-testid="dashboard-report-cta"
              className="bg-[#FF5722] hover:bg-[#E64A19] text-white px-5 py-3 font-semibold inline-flex items-center gap-2 transition-colors"
            >
              Report an issue <ArrowRight size={16} weight="bold" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatTile label="Properties" value={props.length} sub="Under management" />
          <StatTile label="Open tickets" value={openCount} sub="Awaiting action" accent={openCount > 0} />
          <StatTile label="High urgency" value={criticalCount} sub="Critical + High" />
          <StatTile label="Healthy Homes flags" value={hhCount} sub="AI detected" />
        </div>

        {isOps && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <PortfolioIntelligence />
            </div>
            <AlertsFeed />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent tickets */}
          <div className="lg:col-span-2 bg-white border border-slate-200">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench size={18} weight="bold" className="text-[#004B87]" />
                <h3 className="font-display font-bold">Recent tickets</h3>
              </div>
              <Link to="/tickets" data-testid="dashboard-view-all-tickets" className="text-xs font-semibold uppercase tracking-wider text-[#004B87] hover:underline">
                View all
              </Link>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading…</div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No tickets yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="px-5 py-2.5 label-eyebrow">Title</th>
                    <th className="px-5 py-2.5 label-eyebrow">Urgency</th>
                    <th className="px-5 py-2.5 label-eyebrow">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 6).map((t) => {
                    const prop = props.find((p) => p.id === t.property_id);
                    return (
                      <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <Link to={`/tickets/${t.id}`} className="font-semibold hover:text-[#004B87]" data-testid={`ticket-row-${t.id}`}>
                            {t.title}
                          </Link>
                          {prop && <div className="text-xs text-slate-500">{prop.address}</div>}
                        </td>
                        <td className="px-5 py-3"><StatusBadge status={t.urgency} /></td>
                        <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Properties / quick actions */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                <Buildings size={18} weight="bold" className="text-[#004B87]" />
                <h3 className="font-display font-bold">Properties</h3>
              </div>
              {props.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">No properties yet.</div>
              ) : (
                <ul>
                  {props.slice(0, 4).map((p) => (
                    <li key={p.id} className="px-5 py-3 border-t border-slate-100 first:border-t-0">
                      <Link to={`/properties/${p.id}`} className="font-semibold hover:text-[#004B87] block" data-testid={`property-card-${p.id}`}>
                        {p.address}
                      </Link>
                      <div className="text-xs text-slate-500">{p.suburb}, {p.city}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="label-eyebrow">Risk</div>
                        <div className="flex-1 h-1 bg-slate-100">
                          <div className={`h-1 ${p.risk_score > 50 ? "bg-[#FF5722]" : "bg-[#004B87]"}`} style={{ width: `${p.risk_score}%` }}></div>
                        </div>
                        <div className="text-xs font-mono">{p.risk_score}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-[#0F172A] text-white p-5">
              <ShieldCheck size={24} weight="duotone" className="text-[#FF5722]" />
              <div className="font-display font-bold text-lg mt-3">Healthy Homes file</div>
              <p className="text-sm text-slate-300 mt-1">5 statutory areas tracked per property. Evidence stored automatically.</p>
              <Link to="/compliance" data-testid="dashboard-view-compliance" className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-[#FF5722] hover:underline">
                Review compliance <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

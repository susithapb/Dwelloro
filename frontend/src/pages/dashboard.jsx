import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiClient, useAuth } from "../lib/api";
import { Eyebrow, StatTile, StatusBadge, SkeletonStatTile, SkeletonTable, Skeleton, EmptyState } from "../components/Common";
import { Link } from "react-router-dom";
import { ArrowRight, Buildings, Wrench, ShieldCheck, Ticket, ClipboardText, CheckCircle, Circle } from "@phosphor-icons/react";
import AlertsFeed from "../components/AlertsFeed";
import PortfolioIntelligence from "../components/PortfolioIntelligence";

export default function Dashboard() {
  const { user } = useAuth();
  const [props, setProps] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const requests = [
          apiClient.get("/properties").catch(() => ({ data: [] })),
          apiClient.get("/tickets").catch(() => ({ data: [] })),
        ];
        if (user.role === "inspector") {
          requests.push(apiClient.get("/inspections").catch(() => ({ data: [] })));
        }
        const [pr, tk, ins] = await Promise.all(requests);
        if (cancelled) return;
        setProps(pr.data || []);
        setTickets(tk.data || []);
        if (ins) setInspections(ins.data || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const openCount = tickets.filter((t) => !["completed", "closed"].includes(t.status)).length;
  const criticalCount = tickets.filter((t) => t.urgency === "critical" || t.urgency === "high").length;
  const hhCount = tickets.filter((t) => t.ai_analysis?.healthy_homes_relevant).length;
  const resolvedCount = tickets.filter((t) => ["completed", "closed"].includes(t.status)).length;
  const isOps = user?.role === "property_manager" || user?.role === "landlord";
  const isInspector = user?.role === "inspector";
  const isContractor = user?.role === "contractor";
  const isTenant = user?.role === "tenant";
  const scheduledInspections = inspections.filter((i) => i.status === "scheduled").length;
  const inProgressInspections = inspections.filter((i) => i.status === "in_progress").length;
  const completedInspections = inspections.filter((i) => i.status === "completed").length;

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

        {/* Onboarding checklist for new PMs / landlords */}
        {!loading && isOps && props.length === 0 && (
          <div className="bg-[#004B87] text-white p-5 mb-8">
            <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Get started</div>
            <h2 className="font-display text-xl font-bold mb-4">Welcome to Dwelloro — here's how to set up your portfolio</h2>
            <div className="space-y-3">
              {[
                { label: "Add your first property", href: "/properties", done: false },
                { label: "Assign a tenant to the property", href: "/properties", done: false },
                { label: "Review Healthy Homes compliance areas", href: "/compliance", done: false },
              ].map((step) => (
                <div key={step.label} className="flex items-center gap-3">
                  {step.done
                    ? <CheckCircle size={18} weight="fill" className="text-emerald-400 flex-shrink-0" />
                    : <Circle size={18} weight="regular" className="opacity-50 flex-shrink-0" />}
                  <Link to={step.href} className="text-sm font-semibold hover:underline opacity-90">{step.label} →</Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonStatTile key={i} />)
          ) : isInspector ? (
            <>
              <StatTile label="Properties" value={props.length} sub="Visible to you" />
              <StatTile label="Scheduled" value={scheduledInspections} sub="Upcoming" />
              <StatTile label="In progress" value={inProgressInspections} sub="Active walkthroughs" accent={inProgressInspections > 0} />
              <StatTile label="Completed" value={completedInspections} sub="Done" />
            </>
          ) : isTenant ? (
            <>
              <StatTile label="Open tickets" value={openCount} sub="Awaiting action" accent={openCount > 0} />
              <StatTile label="Resolved" value={resolvedCount} sub="Completed / closed" />
              <StatTile label="High urgency" value={criticalCount} sub="Critical + High" />
              <StatTile label="Total" value={tickets.length} sub="All time" />
            </>
          ) : isContractor ? (
            <>
              <StatTile label="Active jobs" value={openCount} sub="Assigned to you" accent={openCount > 0} />
              <StatTile label="Completed" value={resolvedCount} sub="Done" />
              <StatTile label="High urgency" value={criticalCount} sub="Critical + High" />
              <StatTile label="Total" value={tickets.length} sub="All time" />
            </>
          ) : (
            <>
              <StatTile label="Properties" value={props.length} sub="Under management" />
              <StatTile label="Open tickets" value={openCount} sub="Awaiting action" accent={openCount > 0} />
              <StatTile label="High urgency" value={criticalCount} sub="Critical + High" />
              <StatTile label="Healthy Homes flags" value={hhCount} sub="AI detected" />
            </>
          )}
        </div>

        {isOps && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <PortfolioIntelligence />
            </div>
            <AlertsFeed />
          </div>
        )}

        {isInspector && (
          <div className="bg-white border border-slate-200 mb-8">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardText size={18} weight="bold" className="text-[#004B87]" />
                <h3 className="font-display font-bold">My inspections</h3>
              </div>
              <Link to="/inspections" className="text-xs font-semibold uppercase tracking-wider text-[#004B87] hover:underline">View all</Link>
            </div>
            {loading ? (
              <div className="p-4"><SkeletonTable rows={3} cols={3} /></div>
            ) : inspections.length === 0 ? (
              <EmptyState icon={ClipboardText} title="No inspections yet" description="New inspections will appear here once assigned." action={<Link to="/inspections" className="inline-flex items-center gap-2 px-4 py-2 bg-[#004B87] text-white text-sm font-semibold hover:bg-[#003A69]">New inspection <ArrowRight size={13} weight="bold" /></Link>} />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="px-5 py-2.5 label-eyebrow">Property</th>
                    <th className="px-5 py-2.5 label-eyebrow">Status</th>
                    <th className="px-5 py-2.5 label-eyebrow">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {inspections.slice(0, 8).map((insp) => {
                    const prop = props.find((p) => p.id === insp.property_id);
                    return (
                      <tr key={insp.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <Link to={`/inspections/${insp.id}`} className="font-semibold hover:text-[#004B87]">
                            {prop ? prop.address : insp.property_id?.slice(0, 8)}
                          </Link>
                          {prop && <div className="text-xs text-slate-500">{prop.suburb}, {prop.city}</div>}
                        </td>
                        <td className="px-5 py-3"><StatusBadge status={insp.status} /></td>
                        <td className="px-5 py-3 text-xs font-mono text-slate-500">{new Date(insp.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
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
              <div className="p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-3 border-t border-slate-100 first:border-t-0">
                    <div className="flex-1"><Skeleton className="h-3.5 w-44 mb-1.5" /><Skeleton className="h-2.5 w-28" /></div>
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="No tickets yet"
                description="Tenants can report maintenance issues from their dashboard."
                action={<Link to="/report" className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF5722] text-white text-sm font-semibold hover:bg-[#E64A19]">Report an issue <ArrowRight size={13} weight="bold" /></Link>}
              />
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
              {loading ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i}><Skeleton className="h-3.5 w-36 mb-1.5" /><Skeleton className="h-2.5 w-24 mb-2" /><Skeleton className="h-1 w-full" /></div>
                  ))}
                </div>
              ) : props.length === 0 ? (
                <div className="p-6 text-center">
                  <Buildings size={28} weight="duotone" className="text-slate-300 mx-auto mb-2" />
                  {isTenant ? (
                    <>
                      <p className="text-sm text-slate-500">No property linked yet.</p>
                      <p className="text-xs text-slate-400 mt-1">Your property manager will link you to a property.</p>
                    </>
                  ) : isContractor ? (
                    <p className="text-sm text-slate-500">No properties — your jobs are in the tickets list.</p>
                  ) : (
                    <>
                      <p className="text-sm text-slate-500">No properties yet.</p>
                      <Link to="/properties" className="mt-3 inline-block text-xs font-semibold text-[#004B87] hover:underline">Add a property →</Link>
                    </>
                  )}
                </div>
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

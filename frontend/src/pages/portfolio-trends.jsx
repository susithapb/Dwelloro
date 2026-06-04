import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiClient, useAuth } from "../lib/api";
import { Eyebrow } from "../components/Common";
import { ArrowLeft, TrendUp, TrendDown, Equals, ChartLineUp, Wallet, Wrench, ShieldWarning } from "@phosphor-icons/react";

const RANGE_OPTIONS = [6, 12, 24];

export default function PortfolioTrends() {
  const { user } = useAuth();
  const [months, setMonths] = useState(12);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    apiClient
      .get(`/intelligence/portfolio/trends?months=${months}`)
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch((e) => { if (!cancelled) setError(e?.response?.data?.detail || "Failed to load trends"); });
    return () => { cancelled = true; };
  }, [months]);

  const isOps = user?.role === "property_manager" || user?.role === "landlord";
  if (!isOps) return <AppShell><div className="p-8 text-slate-500">Trends are available to property managers and landlords.</div></AppShell>;
  if (error) return <AppShell><div className="p-8 text-slate-500" data-testid="trends-error">{error}</div></AppShell>;
  if (!data) return <AppShell><div className="p-8 text-slate-500">Loading trends…</div></AppShell>;

  const maxOpened = Math.max(1, ...data.series.map((s) => Math.max(s.opened, s.resolved)));
  const maxSpend = Math.max(1, ...data.series.map((s) => s.est_spend_nzd));

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-7xl mx-auto" data-testid="portfolio-trends">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#004B87] mb-4">
          <ArrowLeft size={14} weight="bold" /> Dashboard
        </Link>
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <Eyebrow>Portfolio</Eyebrow>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2">Health trends</h1>
            <div className="text-slate-600">Multi-month rollups across your entire portfolio.</div>
          </div>
          <div className="flex bg-white border border-slate-200" data-testid="trends-range">
            {RANGE_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                data-testid={`range-${m}m`}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${months === m ? "bg-[#004B87] text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {m} mo
              </button>
            ))}
          </div>
        </div>

        {/* KPI delta tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiTile label="Tickets opened" value={data.kpis.opened_last_3m} delta={data.kpis.opened_delta_pct} inverse icon={Wrench} sub="Last 3 months vs prior 3" />
          <KpiTile label="Tickets resolved" value={data.kpis.resolved_last_3m} delta={data.kpis.resolved_delta_pct} icon={ChartLineUp} sub="Last 3 months vs prior 3" />
          <KpiTile label="Healthy Homes flags" value={data.kpis.hh_last_3m} delta={data.kpis.hh_delta_pct} inverse icon={ShieldWarning} sub="Last 3 months vs prior 3" />
          <KpiTile label="Est. spend (NZD)" value={`$${data.kpis.spend_last_3m.toLocaleString()}`} delta={data.kpis.spend_delta_pct} inverse icon={Wallet} sub="Last 3 months vs prior 3" />
        </div>

        {/* Monthly opened vs resolved */}
        <div className="bg-white border border-slate-200 mb-6">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-display font-bold">Tickets opened vs resolved</h3>
            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-600">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#FF5722]" /> Opened</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#004B87]" /> Resolved</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500" /> Healthy Homes</div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-end gap-1.5 h-48" data-testid="trends-chart">
              {data.series.map((s) => {
                const oh = (s.opened / maxOpened) * 100;
                const rh = (s.resolved / maxOpened) * 100;
                const hh = (s.hh_opened / maxOpened) * 100;
                return (
                  <div key={s.month} className="flex-1 h-full flex items-end gap-px">
                    <div className="flex-1 bg-[#FF5722]" style={{ height: `${oh}%` }} title={`Opened: ${s.opened}`} />
                    <div className="flex-1 bg-[#004B87]" style={{ height: `${rh}%` }} title={`Resolved: ${s.resolved}`} />
                    <div className="flex-1 bg-amber-500" style={{ height: `${hh}%` }} title={`HH opened: ${s.hh_opened}`} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1.5 mt-2">
              {data.series.map((s) => (
                <div key={s.month} className="flex-1 text-center text-[9px] font-mono text-slate-500">{s.month.slice(2)}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Spend trend */}
          <div className="bg-white border border-slate-200 lg:col-span-2">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={18} weight="bold" className="text-[#004B87]" />
                <h3 className="font-display font-bold">Estimated monthly spend</h3>
              </div>
              <div className="text-xs font-mono text-slate-500">NZD · category baselines</div>
            </div>
            <div className="p-5">
              <div className="flex items-end gap-1.5 h-40">
                {data.series.map((s) => (
                  <div key={s.month} className="flex-1 h-full flex items-end">
                    <div className="w-full bg-[#0F172A]" style={{ height: `${(s.est_spend_nzd / maxSpend) * 100}%` }} title={`$${s.est_spend_nzd.toLocaleString()}`} />
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 mt-2">
                {data.series.map((s) => (
                  <div key={s.month} className="flex-1 text-center text-[9px] font-mono text-slate-500">{s.month.slice(2)}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="bg-white border border-slate-200" data-testid="category-breakdown">
            <div className="px-5 py-3 border-b border-slate-200">
              <h3 className="font-display font-bold">Top categories</h3>
              <div className="text-xs text-slate-500 mt-0.5">All-time portfolio</div>
            </div>
            <div className="p-5 space-y-2">
              {data.category_breakdown.length === 0 ? (
                <div className="text-sm text-slate-500">No tickets yet.</div>
              ) : data.category_breakdown.map((c) => {
                const max = data.category_breakdown[0].total;
                return (
                  <div key={c.category} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="capitalize font-semibold">{c.category.replace('_', ' ')}</span>
                      <span className="font-mono text-slate-500">{c.total} · <span className={c.last_3m > 0 ? 'text-[#FF5722]' : ''}>{c.last_3m} recent</span></span>
                    </div>
                    <div className="h-1.5 bg-slate-100">
                      <div className="h-1.5 bg-[#004B87]" style={{ width: `${(c.total / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Deteriorating properties */}
        <div className="bg-white border border-slate-200" data-testid="deteriorating-properties">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendUp size={18} weight="bold" className="text-[#FF5722]" />
              <h3 className="font-display font-bold">Properties trending worse</h3>
            </div>
            <div className="text-xs font-mono text-slate-500">Ticket momentum (last 30d vs prior 30d)</div>
          </div>
          {data.deteriorating_properties.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">No properties trending worse. Portfolio is stable.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-5 py-2.5 label-eyebrow">Property</th>
                  <th className="px-5 py-2.5 label-eyebrow">Last 30d</th>
                  <th className="px-5 py-2.5 label-eyebrow">Prior 30d</th>
                  <th className="px-5 py-2.5 label-eyebrow">Δ</th>
                  <th className="px-5 py-2.5 label-eyebrow text-right">Risk</th>
                </tr>
              </thead>
              <tbody>
                {data.deteriorating_properties.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`deteriorating-row-${p.id}`}>
                    <td className="px-5 py-3">
                      <Link to={`/properties/${p.id}`} className="font-semibold hover:text-[#004B87]">{p.address}</Link>
                      <div className="text-xs text-slate-500">{p.suburb}</div>
                    </td>
                    <td className="px-5 py-3 font-mono">{p.tickets_last_30d}</td>
                    <td className="px-5 py-3 font-mono text-slate-500">{p.tickets_prior_30d}</td>
                    <td className="px-5 py-3"><span className="inline-flex items-center gap-1 text-[#FF5722] font-semibold"><TrendUp size={12} weight="bold" /> +{p.delta}</span></td>
                    <td className="px-5 py-3 text-right font-mono">{p.current_risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function KpiTile({ label, value, delta, sub, icon: Icon, inverse = false }) {
  // For "inverse" metrics (opened, HH, spend) up is bad → red; down is good → green.
  // For non-inverse (resolved) up is good → green.
  const positive = inverse ? delta < 0 : delta > 0;
  const flat = delta === 0;
  const DeltaIcon = flat ? Equals : delta > 0 ? TrendUp : TrendDown;
  const cls = flat ? "text-slate-500" : positive ? "text-emerald-700" : "text-[#FF5722]";
  return (
    <div className="bg-white border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div className="label-eyebrow">{label}</div>
        <Icon size={16} weight="bold" className="text-slate-400" />
      </div>
      <div className="font-display text-3xl font-bold mt-2">{value}</div>
      <div className="flex items-center gap-1.5 mt-1">
        <DeltaIcon size={12} weight="bold" className={cls} />
        <span className={`text-xs font-semibold ${cls}`}>{delta > 0 ? `+${delta}%` : flat ? "0%" : `${delta}%`}</span>
        <span className="text-xs text-slate-500">{sub}</span>
      </div>    </div>
  );
}

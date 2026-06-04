import React, { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import { ChartLineUp, TrendUp, TrendDown, Equals, Wallet, Warning, ShieldCheck } from "@phosphor-icons/react";

const SEV_CLASS = {
  high: "bg-red-50 text-red-700 border-red-300",
  medium: "bg-amber-50 text-amber-800 border-amber-300",
  low: "bg-blue-50 text-[#004B87] border-[#004B87]/30",
  ok: "bg-emerald-50 text-emerald-700 border-emerald-300",
};

const TREND = {
  up: { icon: TrendUp, label: "Trending up", cls: "text-[#FF5722]" },
  down: { icon: TrendDown, label: "Trending down", cls: "text-emerald-700" },
  flat: { icon: Equals, label: "Stable", cls: "text-slate-600" },
};

export default function PropertyIntelligence({ propertyId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get(`/intelligence/property/${propertyId}`)
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch((e) => { if (!cancelled) setError(e?.response?.data?.detail || "Could not load intelligence"); });
    return () => { cancelled = true; };
  }, [propertyId]);

  if (error) return <div className="bg-white border border-slate-200 p-5 text-sm text-slate-500" data-testid="ledger-error">{error}</div>;
  if (!data) return <div className="bg-white border border-slate-200 p-5 text-sm text-slate-500">Loading intelligence…</div>;

  const { risk, seasonal, cost } = data;
  const trend = TREND[seasonal.trend] || TREND.flat;
  const TIcon = trend.icon;
  const peakQ = [...seasonal.series].sort((a, b) => b.total - a.total)[0];

  return (
    <div className="space-y-6" data-testid="property-intelligence">
      {/* Risk breakdown */}
      <div className="bg-white border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChartLineUp size={18} weight="bold" className="text-[#004B87]" />
            <h3 className="font-display font-bold">Risk breakdown</h3>
          </div>
          <div className="text-xs font-mono text-slate-500">Auto-computed from compliance, tickets & inspections</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {risk.signals.map((s) => {
            const pct = s.max ? (s.score / s.max) * 100 : 0;
            return (
              <div key={s.key} className="p-4" data-testid={`risk-signal-${s.key}`}>
                <div className="flex items-center justify-between">
                  <div className="label-eyebrow">{s.label}</div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider border px-1.5 py-0.5 ${SEV_CLASS[s.severity] || SEV_CLASS.ok}`}>{s.severity}</span>
                </div>
                <div className="font-display text-2xl font-bold mt-2">
                  {s.score}<span className="text-base text-slate-400">/{s.max}</span>
                </div>
                <div className="h-1 bg-slate-100 mt-2">
                  <div className={`h-1 ${s.severity === 'high' ? 'bg-[#FF5722]' : s.severity === 'medium' ? 'bg-amber-500' : 'bg-[#004B87]'}`} style={{ width: `${pct}%` }} />
                </div>
                {s.detail?.length ? (
                  <div className="text-[11px] text-slate-500 mt-2 font-mono truncate" title={s.detail.join(', ')}>{s.detail.join(', ')}</div>
                ) : s.count !== undefined && s.count !== null ? (
                  <div className="text-[11px] text-slate-500 mt-2 font-mono">{s.count}{s.key === 'inspection_stale' && s.count ? ' days since inspection' : ''}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Seasonal + cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChartLineUp size={18} weight="bold" className="text-[#004B87]" />
              <h3 className="font-display font-bold">Seasonal pattern</h3>
            </div>
            <div className={`inline-flex items-center gap-1 text-xs font-semibold ${trend.cls}`}>
              <TIcon size={14} weight="bold" /> {trend.label}
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-end gap-3 h-32" data-testid="seasonal-chart">
              {seasonal.series.map((q) => {
                const max = Math.max(1, ...seasonal.series.map((x) => x.total));
                const h = (q.total / max) * 100;
                const mh = q.total ? (q.moisture / q.total) * h : 0;
                const hh = q.total ? (q.heating / q.total) * h : 0;
                return (
                  <div key={q.quarter} className="flex-1 h-full flex flex-col-reverse">
                    <div className="bg-[#0F172A]" style={{ height: `${h - mh - hh}%` }} title="Other" />
                    <div className="bg-[#004B87]" style={{ height: `${mh}%` }} title="Moisture" />
                    <div className="bg-[#FF5722]" style={{ height: `${hh}%` }} title="Heating" />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-1">
              {seasonal.series.map((q) => (
                <div key={q.quarter} className="flex-1 text-center">
                  <div className="text-[10px] font-mono text-slate-500">{q.quarter}</div>
                  <div className="text-xs font-semibold">{q.total}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-[11px] font-mono text-slate-600">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#FF5722]" /> Heating</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#004B87]" /> Moisture</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#0F172A]" /> Other</div>
            </div>
            {peakQ && peakQ.total > 0 && (
              <div className="mt-3 text-xs text-slate-600">Peak quarter <strong>{peakQ.quarter}</strong> · {peakQ.total} ticket{peakQ.total === 1 ? '' : 's'}{peakQ.moisture ? ` · ${peakQ.moisture} moisture` : ''}{peakQ.heating ? ` · ${peakQ.heating} heating` : ''}</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
            <Wallet size={18} weight="bold" className="text-[#004B87]" />
            <h3 className="font-display font-bold">Cost intelligence</h3>
          </div>
          <div className="p-5" data-testid="cost-ledger">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="label-eyebrow">Est. 12-mo spend</div>
                <div className="font-display text-3xl font-bold mt-1">${cost.estimated_last_12_months_nzd.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">NZD · category baselines</div>
              </div>
              <div>
                <div className="label-eyebrow">Lifetime spend</div>
                <div className="font-display text-3xl font-bold mt-1 text-slate-700">${cost.estimated_total_nzd.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">{cost.completed_count} completed tickets</div>
              </div>
            </div>
            <div className="mt-5">
              <div className="label-eyebrow mb-2">By category</div>
              {cost.by_category.length === 0 ? (
                <div className="text-xs text-slate-500">No completed maintenance yet.</div>
              ) : (
                <div className="space-y-1.5">
                  {cost.by_category.slice(0, 5).map((c) => {
                    const max = cost.by_category[0].amount;
                    const pct = (c.amount / max) * 100;
                    return (
                      <div key={c.category} className="flex items-center gap-2 text-xs">
                        <div className="w-24 capitalize">{c.category.replace('_', ' ')}</div>
                        <div className="flex-1 h-1.5 bg-slate-100">
                          <div className="h-1.5 bg-[#004B87]" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-16 text-right font-mono">${c.amount.toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="text-[10px] text-slate-400 mt-3 italic">{cost.note}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../lib/api";
import { ChartBar, Wallet } from "@phosphor-icons/react";

export default function PortfolioIntelligence() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/intelligence/portfolio")
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch(() => { if (!cancelled) setData({ ranked: [], property_count: 0, avg_risk_score: 0, high_risk_count: 0, total_estimated_12m_spend_nzd: 0 }); });
    return () => { cancelled = true; };
  }, []);

  if (!data) return <div className="bg-white border border-slate-200 p-5 text-sm text-slate-500">Loading portfolio…</div>;
  const top = data.ranked.slice(0, 6);

  return (
    <div className="bg-white border border-slate-200" data-testid="portfolio-ledger">
      <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChartBar size={18} weight="bold" className="text-[#004B87]" />
          <h3 className="font-display font-bold">Portfolio intelligence</h3>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/portfolio/trends" data-testid="view-trends-link" className="text-xs font-semibold uppercase tracking-wider text-[#004B87] hover:underline">
            View trends →
          </Link>
          <div className="text-xs font-mono text-slate-500">{data.property_count} properties</div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200">
        <div className="p-4">
          <div className="label-eyebrow">Avg risk</div>
          <div className="font-display text-2xl font-bold mt-1">{data.avg_risk_score}</div>
        </div>
        <div className="p-4">
          <div className="label-eyebrow">High risk</div>
          <div className="font-display text-2xl font-bold mt-1 text-[#FF5722]">{data.high_risk_count}</div>
        </div>
        <div className="p-4">
          <div className="label-eyebrow">Est. 12-mo spend</div>
          <div className="font-display text-2xl font-bold mt-1 flex items-center gap-1"><Wallet size={18} weight="bold" className="text-[#004B87]" />${data.total_estimated_12m_spend_nzd.toLocaleString()}</div>
        </div>
      </div>
      {top.length === 0 ? (
        <div className="p-5 text-sm text-slate-500">No properties yet.</div>
      ) : (
        <ul>
          {top.map((p) => (
            <li key={p.id} className="border-t border-slate-100 first:border-t-0" data-testid={`portfolio-row-${p.id}`}>
              <Link to={`/properties/${p.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{p.address}</div>
                  <div className="text-xs text-slate-500">{p.suburb} · {p.top_driver}</div>
                </div>
                <div className="hidden md:block text-right">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Open</div>
                  <div className="text-sm font-mono">{p.open_tickets}</div>
                </div>
                <div className="w-32">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>Risk</span><span>{p.risk_score}</span>
                  </div>
                  <div className="h-1 bg-slate-100 mt-1">
                    <div className={`h-1 ${p.risk_score >= 50 ? 'bg-[#FF5722]' : p.risk_score >= 25 ? 'bg-amber-500' : 'bg-[#004B87]'}`} style={{ width: `${p.risk_score}%` }} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

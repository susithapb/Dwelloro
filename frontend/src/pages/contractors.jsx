import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiClient } from "../lib/api";
import { Eyebrow, SkeletonTable, SkeletonStatTile, EmptyState } from "../components/Common";
import { Users, TrendUp, Clock, UserPlus } from "@phosphor-icons/react";

const TRADE_LABELS = { plumber: "Plumber", electrician: "Electrician", builder: "Builder", painter: "Painter", hvac: "HVAC", locksmith: "Locksmith", roofer: "Roofer", general_maintenance: "General Maintenance", other: "Other" };
const fmtTrade = (t) => TRADE_LABELS[t] || (t || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function Contractors() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get("/contractors/metrics");
        setMetrics(data || []);
      } catch {
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const portfolio = metrics.reduce(
    (acc, m) => {
      acc.total += m.total;
      acc.completed += m.completed;
      acc.in_progress += m.in_progress;
      acc.open += m.open_jobs;
      return acc;
    },
    { total: 0, completed: 0, in_progress: 0, open: 0 }
  );

  return (
    <AppShell>
      <div className="p-6 md:p-8">
        <Eyebrow>Performance</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2 mb-8" data-testid="contractors-title">
          Contractor performance
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonStatTile key={i} />)
          ) : (
            <>
              <Tile icon={Users} label="Contractors" value={metrics.length} />
              <Tile icon={TrendUp} label="Total jobs" value={portfolio.total} />
              <Tile icon={Clock} label="Active jobs" value={portfolio.in_progress + portfolio.open} accent />
              <Tile icon={TrendUp} label="Completed" value={portfolio.completed} />
            </>
          )}
        </div>

        {loading ? (
          <SkeletonTable rows={4} cols={8} />
        ) : metrics.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No contractors yet"
            description="When contractors are assigned to tickets they'll appear here with performance metrics."
          />
        ) : (
          <div className="bg-white border border-slate-200 overflow-x-auto" data-testid="contractor-metrics-table">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left">
                  <th className="px-5 py-3 label-eyebrow">Contractor</th>
                  <th className="px-5 py-3 label-eyebrow">Trade</th>
                  <th className="px-5 py-3 label-eyebrow text-right">Total</th>
                  <th className="px-5 py-3 label-eyebrow text-right">Open</th>
                  <th className="px-5 py-3 label-eyebrow text-right">In progress</th>
                  <th className="px-5 py-3 label-eyebrow text-right">Completed</th>
                  <th className="px-5 py-3 label-eyebrow text-right">Completion rate</th>
                  <th className="px-5 py-3 label-eyebrow text-right">Avg resolution</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.contractor_id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`metric-row-${m.contractor_id}`}>
                    <td className="px-5 py-3">
                      <div className="font-semibold">{m.full_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{m.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      {m.trade ? (
                        <span className="inline-block bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5">{fmtTrade(m.trade)}</span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">{m.total}</td>
                    <td className="px-5 py-3 text-right font-mono">{m.open_jobs}</td>
                    <td className="px-5 py-3 text-right font-mono">{m.in_progress}</td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-700">{m.completed}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-1 bg-slate-100">
                          <div
                            className={`h-1 ${m.completion_rate >= 70 ? "bg-emerald-500" : m.completion_rate >= 40 ? "bg-amber-500" : "bg-[#FF5722]"}`}
                            style={{ width: `${m.completion_rate}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs">{m.completion_rate}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      {m.avg_resolution_hours !== null && m.avg_resolution_hours !== undefined
                        ? `${m.avg_resolution_hours}h`
                        : "—"}
                    </td>
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

function Tile({ icon: Icon, label, value, accent = false }) {
  return (
    <div className={`bg-white border border-slate-200 p-5 ${accent ? "border-l-4 border-l-[#FF5722]" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="label-eyebrow">{label}</div>
        <Icon size={18} weight="bold" className="text-[#004B87]" />
      </div>
      <div className="font-display text-3xl font-bold mt-2 text-[#0F172A]">{value}</div>
    </div>
  );
}

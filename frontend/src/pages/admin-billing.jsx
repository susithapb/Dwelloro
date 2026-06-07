import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiClient, useAuth } from "../lib/api";
import { Eyebrow } from "../components/Common";
import { Users, Coins, ChartBar, Receipt, Crown } from "@phosphor-icons/react";

const TIER_COLORS = {
  free: "#94A3B8",
  starter: "#004B87",
  pro: "#FF5722",
  enterprise: "#0F172A",
};

export default function AdminBilling() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.get("/admin/metrics")
      .then(({ data }) => setData(data))
      .catch(e => setError(e?.response?.data?.detail || "Failed to load"));
  }, []);

  if (error) return <AppShell><div className="p-8 text-slate-500" data-testid="admin-error">{error === "admin only" ? "This area is restricted to Dwelloro staff." : error}</div></AppShell>;
  if (!data) return <AppShell><div className="p-8 text-slate-500">Loading…</div></AppShell>;

  const tiers = ["free", "starter", "pro", "enterprise"];
  const totalUsers = data.total_users || 1;

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-7xl mx-auto" data-testid="admin-billing-page">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <Eyebrow>Admin</Eyebrow>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2 flex items-center gap-2">
              <Crown size={28} weight="bold" className="text-[#FF5722]" /> Billing operations
            </h1>
            <div className="text-slate-600 mt-1">Signed in as <span className="font-mono">{user?.email}</span></div>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Kpi label="Total customers" value={data.total_users} icon={Users} sub="All signups" />
          <Kpi label="Paid customers" value={data.paid_users} icon={Users} sub={`${Math.round((data.paid_users / totalUsers) * 100)}% conversion`} accent />
          <Kpi label="MRR (NZD)" value={`$${data.mrr_nzd.toLocaleString()}`} icon={Coins} sub="Monthly recurring" accent />
          <Kpi label="ARR (NZD)" value={`$${data.arr_nzd.toLocaleString()}`} icon={ChartBar} sub="Annualised" />
        </div>

        {/* Tier distribution */}
        <div className="bg-white border border-slate-200 mb-6">
          <div className="px-5 py-3 border-b border-slate-200">
            <h3 className="font-display font-bold">Tier distribution</h3>
          </div>
          <div className="p-5">
            <div className="flex h-8 mb-3" data-testid="tier-bar">
              {tiers.map(t => {
                const pct = (data.by_tier[t] / totalUsers) * 100;
                if (pct === 0) return null;
                return (
                  <div
                    key={t}
                    style={{ width: `${pct}%`, backgroundColor: TIER_COLORS[t] }}
                    title={`${t}: ${data.by_tier[t]} (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {tiers.map(t => (
                <div key={t} className="flex items-center gap-2">
                  <span className="w-3 h-3" style={{ backgroundColor: TIER_COLORS[t] }} />
                  <span className="capitalize font-semibold">{t}</span>
                  <span className="font-mono text-slate-500 ml-auto">{data.by_tier[t]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent signups */}
          <div className="bg-white border border-slate-200">
            <div className="px-5 py-3 border-b border-slate-200">
              <h3 className="font-display font-bold">Recent signups</h3>
            </div>
            {data.recent_signups.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">No signups yet.</div>
            ) : (
              <table className="w-full text-sm" data-testid="recent-signups">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="px-5 py-2.5 label-eyebrow">User</th>
                    <th className="px-5 py-2.5 label-eyebrow">Plan</th>
                    <th className="px-5 py-2.5 label-eyebrow text-right">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_signups.map(u => (
                    <tr key={u.id} className="border-t border-slate-100">
                      <td className="px-5 py-3">
                        <div className="font-semibold truncate">{u.full_name || "—"}</div>
                        <div className="text-xs text-slate-500 truncate">{u.email}</div>
                      </td>
                      <td className="px-5 py-3 capitalize">{u.plan_tier}</td>
                      <td className="px-5 py-3 text-right text-xs text-slate-500">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent payments */}
          <div className="bg-white border border-slate-200">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <Receipt size={18} weight="bold" className="text-[#004B87]" />
              <h3 className="font-display font-bold">Recent payments</h3>
            </div>
            {data.recent_payments.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">No payments recorded yet.</div>
            ) : (
              <table className="w-full text-sm" data-testid="recent-payments">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="px-5 py-2.5 label-eyebrow">Customer</th>
                    <th className="px-5 py-2.5 label-eyebrow">Plan</th>
                    <th className="px-5 py-2.5 label-eyebrow text-right">Amount</th>
                    <th className="px-5 py-2.5 label-eyebrow">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_payments.map(t => (
                    <tr key={t.session_id} className="border-t border-slate-100">
                      <td className="px-5 py-3 truncate">{t.user_email}</td>
                      <td className="px-5 py-3 capitalize">{t.plan_tier}</td>
                      <td className="px-5 py-3 text-right font-mono">{t.currency?.toUpperCase()} ${t.amount?.toFixed(2)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${
                          t.payment_status === "paid" ? "bg-emerald-50 text-emerald-700" :
                          t.payment_status === "failed" ? "bg-red-50 text-red-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>{t.payment_status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, sub, icon: Icon, accent = false }) {
  return (
    <div className={`bg-white border ${accent ? "border-[#FF5722]" : "border-slate-200"} p-5`}>
      <div className="flex items-center justify-between">
        <div className="label-eyebrow">{label}</div>
        <Icon size={16} weight="bold" className={accent ? "text-[#FF5722]" : "text-slate-400"} />
      </div>
      <div className="font-display text-3xl font-bold mt-2">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

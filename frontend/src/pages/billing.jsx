import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiClient } from "../lib/api";
import { Eyebrow } from "../components/Common";
import { ArrowRight, CreditCard, Sparkle, Receipt, ShieldWarning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "../lib/api";

const PLAN_BADGE = {
  free: { label: "Free", cls: "bg-slate-100 text-slate-700 border-slate-300" },
  starter: { label: "Starter", cls: "bg-blue-50 text-[#004B87] border-blue-300" },
  pro: { label: "Pro", cls: "bg-orange-50 text-[#FF5722] border-orange-300" },
  enterprise: { label: "Enterprise", cls: "bg-slate-900 text-white border-slate-900" },
};

export default function Billing() {
  const { updateUser } = useAuth();
  const [data, setData] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    apiClient.get("/billing/me")
      .then(({ data }) => setData(data))
      .catch(() => setData({ plan_tier: "free", transactions: [] }));
  }, []);

  if (!data) return <AppShell><div className="p-8 text-slate-500">Loading…</div></AppShell>;

  const tier = data.plan_tier || "free";
  const meta = PLAN_BADGE[tier] || PLAN_BADGE.free;
  const usagePct = data.properties_limit
    ? Math.min(100, Math.round((data.properties_used / data.properties_limit) * 100))
    : 0;

  const handleCancel = async () => {
    if (!confirming) { setConfirming(true); return; }
    setCancelling(true);
    try {
      await apiClient.post("/billing/cancel");
      setData((d) => ({ ...d, plan_tier: "free", plan_started_at: null, stripe_session_id: null }));
      updateUser({ plan_tier: "free" });
      toast.success("Subscription cancelled — you're now on the free plan.");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Cancellation failed");
    } finally {
      setConfirming(false);
      setCancelling(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-5xl mx-auto" data-testid="billing-page">
        <div className="mb-8">
          <Eyebrow>Billing</Eyebrow>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2">Plan & payments</h1>
          <p className="text-slate-600 mt-1">Manage your Dwelloro subscription and review billing history.</p>
        </div>

        {/* Current plan */}
        <div className="bg-white border border-slate-200 mb-6" data-testid="current-plan-card">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
            <Sparkle size={18} weight="bold" className="text-[#004B87]" />
            <h3 className="font-display font-bold">Current plan</h3>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="label-eyebrow">Tier</div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-block text-xs font-bold uppercase tracking-wider px-2 py-1 border ${meta.cls}`}>{meta.label}</span>
              </div>
              {data.plan_started_at && (
                <div className="text-xs text-slate-500 mt-2">Started {new Date(data.plan_started_at).toLocaleDateString()}</div>
              )}
            </div>

            <div>
              <div className="label-eyebrow">Properties</div>
              <div className="font-display text-2xl font-bold mt-2">
                {data.properties_used}
                <span className="text-base text-slate-400">/{data.properties_limit ?? "∞"}</span>
              </div>
              {data.properties_limit && (
                <div className="h-1 bg-slate-100 mt-2">
                  <div className={`h-1 ${usagePct >= 90 ? "bg-[#FF5722]" : "bg-[#004B87]"}`} style={{ width: `${usagePct}%` }} />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Link
                to="/pricing"
                data-testid="change-plan-link"
                className="inline-flex items-center justify-center gap-2 bg-[#004B87] hover:bg-[#003A69] text-white px-4 py-2.5 font-semibold text-sm"
              >
                {tier === "free" ? "Upgrade plan" : "Change plan"} <ArrowRight size={14} weight="bold" />
              </Link>
              {tier !== "free" && tier !== "enterprise" && (
                <button
                  onClick={handleCancel}
                  data-testid="cancel-plan-btn"
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 font-semibold text-sm border ${confirming ? "bg-[#FF5722] text-white border-[#FF5722]" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                >
                  <ShieldWarning size={14} weight="bold" /> {cancelling ? "Cancelling…" : confirming ? "Confirm cancel" : "Cancel subscription"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Payment history */}
        <div className="bg-white border border-slate-200" data-testid="payment-history">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={18} weight="bold" className="text-[#004B87]" />
              <h3 className="font-display font-bold">Payment history</h3>
            </div>
            <div className="text-xs font-mono text-slate-500">{data.transactions.length} transaction{data.transactions.length === 1 ? "" : "s"}</div>
          </div>
          {data.transactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              <CreditCard size={32} weight="thin" className="text-slate-300 mx-auto mb-2" />
              No payments yet — you're on the Free plan.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-5 py-2.5 label-eyebrow">Date</th>
                  <th className="px-5 py-2.5 label-eyebrow">Plan</th>
                  <th className="px-5 py-2.5 label-eyebrow text-right">Amount</th>
                  <th className="px-5 py-2.5 label-eyebrow">Status</th>
                  <th className="px-5 py-2.5 label-eyebrow text-right">Session</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map(t => (
                  <tr key={t.session_id} className="border-t border-slate-100">
                    <td className="px-5 py-3">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3 capitalize">{t.plan_tier}</td>
                    <td className="px-5 py-3 text-right font-mono">{t.currency?.toUpperCase()} ${t.amount?.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${
                        t.payment_status === "paid" ? "bg-emerald-50 text-emerald-700" :
                        t.payment_status === "failed" ? "bg-red-50 text-red-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>{t.payment_status}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-[11px] font-mono text-slate-400 truncate">{t.session_id?.slice(-12)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-6">
          Need help with billing? Email <a href="mailto:billing@dwelloro.app" className="text-[#004B87] hover:underline">billing@dwelloro.app</a> — we respond within 1 business hour.
        </p>
      </div>
    </AppShell>
  );
}

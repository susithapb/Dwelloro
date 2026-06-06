import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../lib/api";
import { CheckCircle, XCircle, Spinner, ArrowRight } from "@phosphor-icons/react";

export default function BillingSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState({ status: "polling", attempts: 0, data: null });

  useEffect(() => {
    if (!sessionId) { setState({ status: "error", data: null }); return; }
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 8;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const { data } = await apiClient.get(`/billing/status/${sessionId}`);
        if (data.payment_status === "paid") {
          setState({ status: "paid", data });
          return;
        }
        if (data.status === "expired" || data.payment_status === "failed") {
          setState({ status: "failed", data });
          return;
        }
        if (attempts >= maxAttempts) {
          setState({ status: "timeout", data });
          return;
        }
        setState((prev) => ({ ...prev, attempts }));
        setTimeout(poll, 2000);
      } catch (e) {
        setState({ status: "error", data: { detail: e?.response?.data?.detail || "Unknown error" } });
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4" data-testid="billing-success-page">
      <div className="max-w-md w-full bg-white border border-slate-200 p-8">
        {state.status === "polling" && (
          <div className="text-center">
            <Spinner size={48} weight="bold" className="text-[#004B87] mx-auto animate-spin" />
            <h1 className="font-display text-2xl font-bold mt-4">Confirming your payment…</h1>
            <p className="text-slate-600 mt-2 text-sm">This usually takes a few seconds. Please don't close this tab.</p>
            <div className="text-xs text-slate-400 mt-3 font-mono">Attempt {state.attempts}/8</div>
          </div>
        )}
        {state.status === "paid" && (
          <div className="text-center" data-testid="payment-success">
            <CheckCircle size={56} weight="fill" className="text-emerald-600 mx-auto" />
            <h1 className="font-display text-2xl font-bold mt-4">You're on Dwelloro {state.data?.plan_tier?.charAt(0).toUpperCase() + state.data?.plan_tier?.slice(1)}</h1>
            <p className="text-slate-600 mt-2 text-sm">Welcome aboard. Your account is upgraded and all premium features are now unlocked.</p>
            <Link to="/dashboard" data-testid="go-dashboard" className="inline-flex items-center gap-2 bg-[#004B87] hover:bg-[#003A69] text-white px-5 py-2.5 font-semibold text-sm mt-6">
              Go to dashboard <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        )}
        {state.status === "failed" && (
          <div className="text-center">
            <XCircle size={56} weight="fill" className="text-[#FF5722] mx-auto" />
            <h1 className="font-display text-2xl font-bold mt-4">Payment was not completed</h1>
            <p className="text-slate-600 mt-2 text-sm">{state.data?.status === "expired" ? "The session expired before payment was confirmed." : "Your card was declined or the payment was cancelled."}</p>
            <Link to="/pricing" className="inline-flex items-center gap-2 bg-[#0F172A] hover:bg-slate-700 text-white px-5 py-2.5 font-semibold text-sm mt-6">
              Try again
            </Link>
          </div>
        )}
        {state.status === "timeout" && (
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Still processing</h1>
            <p className="text-slate-600 mt-2 text-sm">We haven't received confirmation yet. Check your inbox for a Stripe receipt — your plan will activate automatically when payment clears.</p>
            <Link to="/dashboard" className="inline-flex items-center gap-2 bg-[#004B87] hover:bg-[#003A69] text-white px-5 py-2.5 font-semibold text-sm mt-6">
              Go to dashboard
            </Link>
          </div>
        )}
        {state.status === "error" && (
          <div className="text-center">
            <XCircle size={56} weight="fill" className="text-[#FF5722] mx-auto" />
            <h1 className="font-display text-2xl font-bold mt-4">Something went wrong</h1>
            <p className="text-slate-600 mt-2 text-sm">{state.data?.detail || "We couldn't verify your payment status."}</p>
            <Link to="/pricing" className="inline-flex items-center gap-2 bg-[#0F172A] text-white px-5 py-2.5 font-semibold text-sm mt-6">
              Back to pricing
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

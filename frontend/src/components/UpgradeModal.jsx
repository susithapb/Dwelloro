import React from "react";
import { Link } from "react-router-dom";
import { Sparkle, X, ArrowRight } from "@phosphor-icons/react";

export default function UpgradeModal({ open, onClose, planTier = "free", limit, used, message, suggestedTier = "starter" }) {
  if (!open) return null;
  const TIER_NAMES = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="upgrade-modal" onClick={onClose}>
      <div className="bg-white max-w-md w-full p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="label-eyebrow flex items-center gap-1.5">
              <Sparkle size={12} weight="fill" className="text-[#FF5722]" />
              Upgrade required
            </div>
            <h3 className="font-display text-2xl font-bold mt-2">You've reached your plan's limit</h3>
          </div>
          <button onClick={onClose} data-testid="upgrade-close" className="text-slate-400 hover:text-slate-600">
            <X size={20} weight="bold" />
          </button>
        </div>

        <p className="text-slate-600 text-sm mb-5">
          {message || `Your ${planTier} plan allows up to ${limit} properties${used !== undefined ? ` and you're at ${used}` : ""}. Upgrade to keep adding properties.`}
        </p>

        <div className="bg-slate-50 border border-slate-200 p-4 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Recommended</div>
              <div className="font-display text-xl font-bold mt-0.5">PropIntel {TIER_NAMES[suggestedTier] || "Pro"}</div>
              <div className="text-xs text-slate-500 mt-1">
                {suggestedTier === "starter" ? "Up to 25 properties · AI triage · Share links" :
                 suggestedTier === "pro" ? "Up to 100 properties · AI inspections · Portfolio trends" :
                 "Unlimited properties · SSO · Custom SLA"}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl font-bold">
                {suggestedTier === "starter" ? "NZ$79" : suggestedTier === "pro" ? "NZ$249" : "Custom"}
              </div>
              <div className="text-xs text-slate-500">{suggestedTier !== "enterprise" && "/month"}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            to="/pricing"
            data-testid="upgrade-cta"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[#FF5722] hover:bg-[#E64A19] text-white py-2.5 font-semibold text-sm"
          >
            See plans <ArrowRight size={14} weight="bold" />
          </Link>
          <button
            onClick={onClose}
            data-testid="upgrade-later"
            className="text-slate-600 hover:text-slate-900 px-5 py-2.5 font-semibold text-sm"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

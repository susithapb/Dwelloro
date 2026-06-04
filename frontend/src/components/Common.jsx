import React from "react";

export function StatusBadge({ status, children, className = "" }) {
  const map = {
    open: "bg-slate-100 text-slate-800 border-slate-300",
    assigned: "bg-blue-50 text-[#004B87] border-[#004B87]/30",
    in_progress: "bg-amber-50 text-amber-800 border-amber-300",
    awaiting_quote: "bg-orange-50 text-[#FF5722] border-[#FF5722]/30",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-300",
    closed: "bg-slate-100 text-slate-600 border-slate-300",
    compliant: "bg-emerald-50 text-emerald-700 border-emerald-300",
    missing_evidence: "bg-amber-50 text-amber-800 border-amber-300",
    at_risk: "bg-orange-50 text-[#FF5722] border-[#FF5722]/30",
    non_compliant: "bg-red-50 text-red-700 border-red-300",
    low: "bg-slate-100 text-slate-700 border-slate-300",
    medium: "bg-blue-50 text-[#004B87] border-[#004B87]/30",
    high: "bg-orange-50 text-[#FF5722] border-[#FF5722]/40",
    critical: "bg-red-50 text-red-700 border-red-300",
  };
  const cls = map[status] || "bg-slate-100 text-slate-700 border-slate-300";
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold tracking-wide uppercase border ${cls} ${className}`}
    >
      {children || (status || "").replace(/_/g, " ")}
    </span>
  );
}

export function Brand({ className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Inline SVG logo — scalable, no image file needed */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="100" height="100" rx="18" fill="#1B3A6E" />
        <polyline
          points="12,52 38,26 50,36 62,26 88,52"
          stroke="#C8D0DC"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="32" y="20" width="8" height="14" rx="2" fill="#C8D0DC" />
        <rect x="18" y="60" width="14" height="28" rx="2" fill="#F5A623" />
        <rect x="36" y="44" width="14" height="44" rx="2" fill="white" />
        <rect x="54" y="52" width="14" height="36" rx="2" fill="#F5A623" />
        <rect x="72" y="64" width="14" height="24" rx="2" fill="white" />
      </svg>

      <span className="font-display font-bold text-lg tracking-tight">
        <span className="text-[#0F172A]">Dwell</span>
        <span className="text-[#F5A623]">oro</span>
      </span>
    </div>
  );
}

export function Eyebrow({ children }) {
  return <div className="label-eyebrow">{children}</div>;
}

export function StatTile({ label, value, sub, accent = false }) {
  return (
    <div
      className={`bg-white border border-slate-200 p-5 ${accent ? "border-l-4 border-l-[#FF5722]" : ""}`}
    >
      <div className="label-eyebrow">{label}</div>
      <div className="font-display text-3xl font-bold mt-2 text-[#0F172A]">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

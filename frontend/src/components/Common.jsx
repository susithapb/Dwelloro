import React from "react";
import { Link } from "react-router-dom";

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

// ── Skeletons ──────────────────────────────────────────────────────────────

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-slate-200 ${className}`} />;
}

export function SkeletonStatTile() {
  return (
    <div className="bg-white border border-slate-200 p-5">
      <Skeleton className="h-2.5 w-20 mb-2" />
      <Skeleton className="h-8 w-14 mb-1.5" />
      <Skeleton className="h-2 w-28" />
    </div>
  );
}

export function SkeletonTable({ rows = 4, cols = 4 }) {
  const widths = ["w-36", "w-20", "w-16", "w-12", "w-16", "w-12"];
  return (
    <div className="bg-white border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex gap-8">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={`h-2.5 ${widths[i] || "w-16"}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="border-t border-slate-100 px-5 py-4 flex gap-8 items-center">
          <div className="flex-1 min-w-0">
            <Skeleton className="h-3.5 w-40 mb-1.5" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          {Array.from({ length: cols - 1 }).map((_, ci) => (
            <Skeleton key={ci} className={`h-3 flex-shrink-0 ${widths[ci + 1] || "w-16"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonKanban({ cols = 5 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      {Array.from({ length: cols }).map((_, ci) => (
        <div key={ci} className="bg-white border border-slate-200 min-h-[200px]">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-2.5 w-5" />
          </div>
          <div className="p-3 space-y-3">
            {Array.from({ length: ci % 2 === 0 ? 3 : 2 }).map((_, ri) => (
              <div key={ri} className="bg-[#F8FAFC] border border-slate-200 p-3">
                <Skeleton className="h-3.5 w-full mb-2" />
                <Skeleton className="h-2.5 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="bg-white border border-slate-200 p-12 text-center">
      {Icon && <Icon size={40} weight="duotone" className="text-slate-300 mx-auto" />}
      <div className="font-display text-lg font-bold text-slate-800 mt-3">{title}</div>
      {description && (
        <p className="text-sm text-slate-500 mt-1.5 max-w-xs mx-auto">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ── Data tiles ───────────────────────────────────────────────────────────────

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

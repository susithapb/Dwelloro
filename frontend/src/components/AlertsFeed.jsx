import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../lib/api";
import { Bell, Warning, Clock, ShieldWarning } from "@phosphor-icons/react";

const TYPE_ICON = {
  compliance_expiring: Clock,
  compliance_stale: Clock,
  compliance_risk: ShieldWarning,
  ticket_overdue: Clock,
  ticket_unassigned: Warning,
  inspection_missing: Warning,
  inspection_stale: Clock,
};

const SEV_BAR = { high: "bg-[#FF5722]", medium: "bg-amber-500", low: "bg-[#004B87]" };

export default function AlertsFeed() {
  const [alerts, setAlerts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/notifications/alerts")
      .then(({ data }) => { if (!cancelled) setAlerts(data.alerts || []); })
      .catch(() => { if (!cancelled) setAlerts([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-white border border-slate-200" data-testid="alerts-feed">
      <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={18} weight="bold" className="text-[#FF5722]" />
          <h3 className="font-display font-bold">Active alerts</h3>
        </div>
        {alerts !== null && (
          <span className="text-xs font-mono text-slate-500" data-testid="alerts-count">
            {alerts.length} active
          </span>
        )}
      </div>
      {alerts === null ? (
        <div className="p-5 text-sm text-slate-500">Loading…</div>
      ) : alerts.length === 0 ? (
        <div className="p-5 text-sm text-slate-500">All clear. No active alerts.</div>
      ) : (
        <ul className="max-h-[360px] overflow-y-auto">
          {alerts.slice(0, 12).map((a) => {
            const Icon = TYPE_ICON[a.type] || Warning;
            return (
              <li key={a.id} className="border-t border-slate-100 first:border-t-0" data-testid={`alert-${a.type}`}>
                <Link to={a.target} className="flex gap-3 px-5 py-3 hover:bg-slate-50">
                  <div className={`w-1 ${SEV_BAR[a.severity] || SEV_BAR.medium} self-stretch`} />
                  <Icon size={18} weight="bold" className="text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm capitalize">{a.title}</div>
                    <div className="text-xs text-slate-500 truncate">{a.property_address}</div>
                    {a.detail && <div className="text-xs text-slate-600 mt-0.5 truncate">{a.detail}</div>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

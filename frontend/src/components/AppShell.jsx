import React, { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { House, Buildings, Wrench, ShieldCheck, SignOut, User, ClipboardText, Users, Sparkle, Crown, ChartBar, GearSix, Pulse, List, Bell, X } from "@phosphor-icons/react";
import { Brand } from "./Common";
import { useAuth, apiClient } from "../lib/api";

const ALERT_ROLES = ["property_manager", "landlord", "inspector"];

const ALERT_SEVERITY_CLS = {
  critical: "text-red-700",
  high: "text-orange-600",
  medium: "text-amber-600",
  low: "text-slate-600",
};

const PLAN_BADGE = {
  free: { label: "Free", cls: "bg-slate-100 text-slate-600" },
  starter: { label: "Starter", cls: "bg-blue-100 text-[#004B87]" },
  pro: { label: "Pro", cls: "bg-orange-100 text-[#FF5722]" },
  enterprise: { label: "Enterprise", cls: "bg-slate-900 text-white" },
};

const linksByRole = {
  admin: [
    { to: "/admin/billing", label: "Overview", icon: ChartBar },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/staff", label: "Staff", icon: Crown },
    { to: "/admin/activity", label: "Activity", icon: Pulse },
  ],
  property_manager: [
    { to: "/dashboard", label: "Dashboard", icon: House },
    { to: "/properties", label: "Properties", icon: Buildings },
    { to: "/tickets", label: "Tickets", icon: Wrench },
    { to: "/inspections", label: "Inspections", icon: ClipboardText },
    { to: "/contractors", label: "Contractors", icon: Users },
    { to: "/compliance", label: "Compliance", icon: ShieldCheck },
  ],
  tenant: [
    { to: "/dashboard", label: "Dashboard", icon: House },
    { to: "/my-property", label: "My Property", icon: Buildings },
    { to: "/report", label: "Report Issue", icon: Wrench },
    { to: "/tickets", label: "My Tickets", icon: Wrench },
  ],
  contractor: [
    { to: "/dashboard", label: "Dashboard", icon: House },
    { to: "/tickets", label: "Jobs", icon: Wrench },
  ],
  landlord: [
    { to: "/dashboard", label: "Dashboard", icon: House },
    { to: "/properties", label: "Properties", icon: Buildings },
    { to: "/tickets", label: "Tickets", icon: Wrench },
    { to: "/report", label: "Report Issue", icon: Wrench },
    { to: "/compliance", label: "Compliance", icon: ShieldCheck },
  ],
  inspector: [
    { to: "/dashboard", label: "Dashboard", icon: House },
    { to: "/properties", label: "Properties", icon: Buildings },
    { to: "/inspections", label: "Inspections", icon: ClipboardText },
    { to: "/tickets", label: "Tickets", icon: Wrench },
  ],
};

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const links = linksByRole[user?.role] || linksByRole.property_manager;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    if (!user || !ALERT_ROLES.includes(user.role)) return;
    apiClient.get("/notifications/alerts").then(({ data }) => {
      setAlerts(data.alerts || []);
      setAlertCount(data.count || 0);
    }).catch(() => {});
  }, [user?.id]);

  const onLogout = () => {
    const isDemo = user?.email?.endsWith("@dwelloro.demo");
    logout();
    window.location.href = isDemo ? "/login?demo=1" : "/login";
  };

  const showAlertBell = user && ALERT_ROLES.includes(user.role);

  return (
    <div className="min-h-screen flex bg-[#F1F5F9]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-60 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 md:relative md:translate-x-0 md:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        data-testid="app-sidebar"
      >
        <div className="px-5 py-5 border-b border-slate-200 flex items-center justify-between">
          <Brand />
          <button
            className="md:hidden text-slate-500 hover:text-slate-800 p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to + l.label}
                to={l.to}
                onClick={() => setSidebarOpen(false)}
                data-testid={`nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#004B87] text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`
                }
              >
                <Icon size={18} weight="bold" />
                {l.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Notification bell */}
        {showAlertBell && (
          <div className="border-t border-slate-200">
            <button
              onClick={() => setShowAlerts((v) => !v)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Bell
                size={16}
                weight="bold"
                className={alertCount > 0 ? "text-[#FF5722]" : "text-slate-500"}
              />
              <span className="flex-1 text-left">Notifications</span>
              {alertCount > 0 && (
                <span className="bg-[#FF5722] text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[20px] text-center">
                  {alertCount}
                </span>
              )}
            </button>
            {showAlerts && (
              <div className="px-3 pb-3 space-y-2 max-h-52 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="text-xs text-slate-400 px-1 py-2">No alerts right now</div>
                ) : (
                  alerts.map((a, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 px-3 py-2 text-xs">
                      <div className={`font-semibold ${ALERT_SEVERITY_CLS[a.severity] || "text-slate-700"}`}>
                        {a.severity?.toUpperCase()} · {(a.type || "").replace(/_/g, " ")}
                      </div>
                      <div className="text-slate-600 mt-0.5 leading-snug">{a.message}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-slate-200 p-4">
          <Link
            to="/settings"
            data-testid="sidebar-settings-link"
            className="flex items-center gap-2 mb-3 -mx-1 px-1 py-1 hover:bg-slate-50 transition-colors group"
          >
            <div className="w-8 h-8 bg-slate-200 flex items-center justify-center group-hover:bg-[#004B87] transition-colors flex-shrink-0">
              <User size={16} weight="bold" className="group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" data-testid="sidebar-user-name">{user?.full_name}</div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">
                {(user?.role || "").replace("_", " ")}
              </div>
            </div>
            <GearSix size={14} weight="bold" className="text-slate-400 group-hover:text-[#004B87] flex-shrink-0 transition-colors" />
          </Link>

          {/* Plan tile — property owners only (PM + self-managing landlord) */}
          {(user?.role === "property_manager" || user?.role === "landlord") && (() => {
            const tier = user?.plan_tier || "free";
            const meta = PLAN_BADGE[tier] || PLAN_BADGE.free;
            return (
              <Link
                to="/billing"
                data-testid="sidebar-billing-link"
                className="block border border-slate-200 hover:border-[#004B87] p-2.5 mb-2 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Plan</div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider ${meta.cls}`}>{meta.label}</span>
                </div>
                {tier !== "enterprise" && (
                  <div className="text-[11px] text-slate-600 mt-1 inline-flex items-center gap-1 font-semibold hover:text-[#004B87]">
                    <Sparkle size={10} weight="fill" className="text-[#FF5722]" />
                    {tier === "free" || tier === "starter" ? "Upgrade →" : "Manage plan →"}
                  </div>
                )}
              </Link>
            );
          })()}

          <button
            onClick={onLogout}
            data-testid="sidebar-logout-btn"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold border border-slate-300 hover:bg-slate-100 transition-colors uppercase tracking-wider"
          >
            <SignOut size={14} weight="bold" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-600 hover:text-slate-900 p-1"
          >
            <List size={22} weight="bold" />
          </button>
          <div className="flex-1">
            <Brand />
          </div>
          {showAlertBell && alertCount > 0 && (
            <button
              onClick={() => { setSidebarOpen(true); setShowAlerts(true); }}
              className="relative p-1"
            >
              <Bell size={20} weight="bold" className="text-[#FF5722]" />
              <span className="absolute -top-0.5 -right-0.5 bg-[#FF5722] text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center">
                {alertCount}
              </span>
            </button>
          )}
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}


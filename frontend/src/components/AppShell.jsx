import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { House, Buildings, Wrench, ShieldCheck, SignOut, User, ClipboardText, Users } from "@phosphor-icons/react";
import { Brand } from "./Common";
import { useAuth } from "../lib/api";

const linksByRole = {
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
  const nav = useNavigate();
  const links = linksByRole[user?.role] || linksByRole.property_manager;

  const onLogout = () => {
    logout();
    nav("/login");
  };

  return (
    <div className="min-h-screen flex bg-[#F1F5F9]">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col" data-testid="app-sidebar">
        <div className="px-5 py-5 border-b border-slate-200">
          <Brand />
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to}
                to={l.to}
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
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-slate-200 flex items-center justify-center">
              <User size={16} weight="bold" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" data-testid="sidebar-user-name">{user?.full_name}</div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">
                {(user?.role || "").replace("_", " ")}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            data-testid="sidebar-logout-btn"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold border border-slate-300 hover:bg-slate-100 transition-colors uppercase tracking-wider"
          >
            <SignOut size={14} weight="bold" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

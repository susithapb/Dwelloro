import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiClient } from "../lib/api";
import { Eyebrow } from "../components/Common";
import { Users, MagnifyingGlass, FunnelSimple } from "@phosphor-icons/react";

const ROLES = ["property_manager", "tenant", "contractor", "landlord", "inspector"];
const TIERS = ["free", "starter", "pro", "enterprise"];

const TIER_STYLES = {
  free: "bg-slate-100 text-slate-600",
  starter: "bg-blue-100 text-[#004B87]",
  pro: "bg-orange-100 text-[#FF5722]",
  enterprise: "bg-slate-900 text-white",
};

const ROLE_STYLES = {
  property_manager: "bg-[#004B87] text-white",
  tenant: "bg-emerald-100 text-emerald-700",
  contractor: "bg-purple-100 text-purple-700",
  landlord: "bg-amber-100 text-amber-700",
  inspector: "bg-cyan-100 text-cyan-700",
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    apiClient.get("/admin/users")
      .then(({ data }) => { setUsers(data); setFiltered(data); })
      .catch(e => setError(e?.response?.data?.detail || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = users;
    if (q) {
      const lq = q.toLowerCase();
      list = list.filter(u =>
        u.email.toLowerCase().includes(lq) ||
        (u.full_name || "").toLowerCase().includes(lq)
      );
    }
    if (roleFilter) list = list.filter(u => u.role === roleFilter);
    if (tierFilter) list = list.filter(u => u.plan_tier === tierFilter);
    setFiltered(list);
  }, [q, roleFilter, tierFilter, users]);

  const updateTier = async (userId, newTier) => {
    setSaving(userId);
    try {
      const { data } = await apiClient.patch(`/admin/users/${userId}`, { plan_tier: newTier });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan_tier: data.plan_tier } : u));
    } catch {
      // silently fail — row will revert on next render
    } finally {
      setSaving(null);
    }
  };

  const byRole = ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {});

  if (error) return <AppShell><div className="p-8 text-slate-500">{error}</div></AppShell>;

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <Eyebrow>Admin</Eyebrow>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2 flex items-center gap-2">
            <Users size={28} weight="bold" className="text-[#004B87]" /> User Management
          </h1>
          <p className="text-slate-500 mt-1">{users.length} customer accounts</p>
        </div>

        {/* Role summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {ROLES.map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(prev => prev === r ? "" : r)}
              className={`bg-white border p-3 text-left transition-colors ${roleFilter === r ? "border-[#004B87]" : "border-slate-200 hover:border-slate-300"}`}
            >
              <div className="text-2xl font-bold font-display">{byRole[r]}</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mt-0.5">
                {r.replace("_", " ")}
              </div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-[#004B87]"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelSimple size={14} className="text-slate-400" />
            <select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value)}
              className="text-sm border border-slate-200 px-2 py-2 focus:outline-none focus:border-[#004B87]"
            >
              <option value="">All plans</option>
              {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {(q || roleFilter || tierFilter) && (
            <button
              onClick={() => { setQ(""); setRoleFilter(""); setTierFilter(""); }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Users table */}
        <div className="bg-white border border-slate-200">
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-sm text-slate-500">No users match these filters.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">User</th>
                  <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Role</th>
                  <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Plan</th>
                  <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold text-right">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-semibold truncate">{u.full_name || "—"}</div>
                      <div className="text-xs text-slate-500 truncate">{u.email}</div>
                      {u.phone && <div className="text-xs text-slate-400">{u.phone}</div>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider ${ROLE_STYLES[u.role] || "bg-slate-100 text-slate-600"}`}>
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={u.plan_tier || "free"}
                        disabled={saving === u.id}
                        onChange={e => updateTier(u.id, e.target.value)}
                        className={`text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#004B87] ${TIER_STYLES[u.plan_tier] || TIER_STYLES.free} ${saving === u.id ? "opacity-50" : ""}`}
                      >
                        {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-slate-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}

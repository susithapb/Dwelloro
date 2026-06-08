import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiClient } from "../lib/api";
import { Eyebrow } from "../components/Common";
import { Crown, Plus } from "@phosphor-icons/react";

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    apiClient.get("/admin/staff")
      .then(({ data }) => setStaff(Array.isArray(data) ? data : []))
      .catch(e => setError(e?.response?.data?.detail || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/admin/staff", form);
      setStaff(prev => [data, ...prev]);
      setForm({ email: "", full_name: "", password: "" });
      setShowForm(false);
    } catch (err) {
      setFormError(err?.response?.data?.detail || "Failed to create staff account");
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <AppShell><div className="p-8 text-slate-500">{error}</div></AppShell>;

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <Eyebrow>Admin</Eyebrow>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2 flex items-center gap-2">
              <Crown size={28} weight="bold" className="text-[#FF5722]" /> Dwelloro Staff
            </h1>
            <p className="text-slate-500 mt-1">Internal admin accounts — not visible to customers</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-[#004B87] text-white text-sm font-semibold hover:bg-[#003a6e] transition-colors"
          >
            <Plus size={14} weight="bold" /> Add staff
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white border border-[#004B87] p-5 mb-6">
            <h3 className="font-display font-bold mb-4">New staff account</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Full name</label>
                <input
                  required
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-[#004B87]"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-[#004B87]"
                  placeholder="jane@dwelloro.com"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Password</label>
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-[#004B87]"
                  placeholder="Min 8 characters"
                  minLength={8}
                />
              </div>
            </div>
            {formError && <p className="text-red-600 text-xs mb-3">{formError}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#004B87] text-white text-sm font-semibold hover:bg-[#003a6e] transition-colors disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create account"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(null); }}
                className="px-4 py-2 border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Staff list */}
        <div className="bg-white border border-slate-200">
          <div className="px-5 py-3 border-b border-slate-200">
            <h3 className="font-display font-bold">Active staff accounts</h3>
          </div>
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading…</div>
          ) : staff.length === 0 ? (
            <div className="p-8 text-sm text-slate-500">No staff accounts yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Name</th>
                  <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Email</th>
                  <th className="px-5 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold text-right">Created</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-semibold">{s.full_name}</td>
                    <td className="px-5 py-3 text-slate-600 font-mono text-xs">{s.email}</td>
                    <td className="px-5 py-3 text-right text-xs text-slate-500">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
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

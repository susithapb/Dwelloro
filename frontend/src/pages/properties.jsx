import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiClient, useAuth } from "../lib/api";
import { Eyebrow } from "../components/Common";
import { Link } from "react-router-dom";
import { Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import UpgradeModal from "../components/UpgradeModal";

export default function Properties() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ address: "", suburb: "", city: "Auckland", postcode: "", bedrooms: "", bathrooms: "", notes: "" });
  const [upgrade, setUpgrade] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/properties");
      setItems(data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); }, [user]);

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post("/properties", form);
      toast.success("Property added");
      setShowNew(false);
      setForm({ address: "", suburb: "", city: "Auckland", postcode: "", bedrooms: "", bathrooms: "", notes: "" });
      load();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.detail === "plan_limit_reached") {
        const suggested = data.plan_tier === "free" ? "starter" : data.plan_tier === "starter" ? "pro" : "enterprise";
        setUpgrade({ ...data, suggestedTier: suggested });
        return;
      }
      toast.error(data?.detail || "Failed");
    }
  };

  return (
    <AppShell>
      <div className="p-6 md:p-8">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <Eyebrow>Portfolio</Eyebrow>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2" data-testid="properties-title">Properties</h1>
          </div>
          {user?.role === "property_manager" && (
            <button
              onClick={() => setShowNew((s) => !s)}
              data-testid="add-property-btn"
              className="bg-[#FF5722] hover:bg-[#E64A19] text-white px-5 py-2.5 font-semibold text-sm inline-flex items-center gap-2"
            >
              <Plus size={14} weight="bold" /> Add property
            </button>
          )}
        </div>

        {showNew && (
          <form onSubmit={onCreate} className="bg-white border border-slate-200 p-6 mb-6 max-w-xl space-y-4" data-testid="new-property-form">
            <h2 className="font-display text-lg font-bold mb-2">New property</h2>

            <Field label="Address Line" htmlFor="np-address" required>
              <input
                id="np-address"
                required
                placeholder="e.g. 12 Smith Street"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-[#004B87] focus:border-transparent outline-none"
                data-testid="new-prop-address"
              />
            </Field>

            <Field label="Suburb" htmlFor="np-suburb" required>
              <input
                id="np-suburb"
                required
                placeholder="e.g. Mt Eden"
                value={form.suburb}
                onChange={(e) => setForm({ ...form, suburb: e.target.value })}
                className="w-full border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-[#004B87] focus:border-transparent outline-none"
                data-testid="new-prop-suburb"
              />
            </Field>

            <Field label="City" htmlFor="np-city" required>
              <input
                id="np-city"
                required
                placeholder="e.g. Auckland"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-[#004B87] focus:border-transparent outline-none"
                data-testid="new-prop-city"
              />
            </Field>

            <Field label="Postcode" htmlFor="np-postcode">
              <input
                id="np-postcode"
                placeholder="e.g. 1024"
                inputMode="numeric"
                value={form.postcode}
                onChange={(e) => setForm({ ...form, postcode: e.target.value })}
                className="w-full border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-[#004B87] focus:border-transparent outline-none"
                data-testid="new-prop-postcode"
              />
            </Field>

            <Field label="Bedrooms" htmlFor="np-bedrooms" required>
              <input
                id="np-bedrooms"
                type="number"
                min="0"
                required
                value={form.bedrooms}
                onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })}
                className="w-full border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-[#004B87] focus:border-transparent outline-none"
                data-testid="new-prop-bedrooms"
              />
            </Field>

            <Field label="Bathrooms" htmlFor="np-bathrooms" required>
              <input
                id="np-bathrooms"
                type="number"
                min="0"
                required
                value={form.bathrooms}
                onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })}
                className="w-full border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-[#004B87] focus:border-transparent outline-none"
                data-testid="new-prop-bathrooms"
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                data-testid="save-property-btn"
                className="bg-[#004B87] hover:bg-[#003A69] text-white px-5 py-2.5 font-semibold text-sm"
              >
                Save property
              </button>
              <button
                type="button"
                onClick={() => setShowNew(false)}
                data-testid="cancel-property-btn"
                className="text-slate-600 hover:text-slate-900 px-5 py-2.5 font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-slate-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-slate-200 p-10 text-center text-slate-500">No properties yet.</div>
        ) : (
          <div className="bg-white border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left">
                  <th className="px-5 py-3 label-eyebrow">Address</th>
                  <th className="px-5 py-3 label-eyebrow">City</th>
                  <th className="px-5 py-3 label-eyebrow text-right">Bed / Bath</th>
                  <th className="px-5 py-3 label-eyebrow text-right">Risk score</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link to={`/properties/${p.id}`} data-testid={`property-link-${p.id}`} className="font-semibold hover:text-[#004B87]">
                        {p.address}
                      </Link>
                      <div className="text-xs text-slate-500">{[p.suburb, p.postcode].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="px-5 py-3">{p.city}</td>
                    <td className="px-5 py-3 text-right font-mono">{p.bedrooms} / {p.bathrooms}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-mono font-bold ${p.risk_score > 50 ? "text-[#FF5722]" : "text-[#004B87]"}`}>{p.risk_score}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <UpgradeModal
        open={!!upgrade}
        onClose={() => setUpgrade(null)}
        planTier={upgrade?.plan_tier}
        limit={upgrade?.limit}
        used={upgrade?.used}
        message={upgrade?.message}
        suggestedTier={upgrade?.suggestedTier}
      />
    </AppShell>
  );
}

function Field({ label, htmlFor, required, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label-eyebrow block mb-1.5">
        {label}{required && <span className="text-[#FF5722] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

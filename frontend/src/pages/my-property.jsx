import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiClient, useAuth } from "../lib/api";
import { Eyebrow, StatusBadge } from "../components/Common";
import { Link } from "react-router-dom";
import { Buildings, Wrench, ArrowRight, ShieldCheck, User } from "@phosphor-icons/react";

const AREA_LABELS = {
  heating: "Heating",
  insulation: "Insulation",
  ventilation: "Ventilation",
  moisture: "Moisture / Drainage",
  draught_stopping: "Draught Stopping",
};

export default function MyProperty() {
  const { user } = useAuth();
  const [property, setProperty] = useState(null);
  const [compliance, setCompliance] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data: props } = await apiClient.get("/properties");
        const prop = props?.[0];
        if (!prop) { setLoading(false); return; }
        setProperty(prop);

        const [{ data: comp }, { data: tix }] = await Promise.all([
          apiClient.get(`/compliance/property/${prop.id}`).catch(() => ({ data: [] })),
          apiClient.get(`/tickets?property_id=${prop.id}`).catch(() => ({ data: [] })),
        ]);
        setCompliance(comp || []);
        setTickets(tix || []);

        if (prop.manager_id) {
          apiClient.get(`/users/${prop.manager_id}`).then(({ data }) => setManager(data)).catch(() => {});
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <AppShell><div className="p-8 text-slate-500">Loading…</div></AppShell>;

  if (!property) {
    return (
      <AppShell>
        <div className="p-8 max-w-lg mx-auto text-center mt-16">
          <Buildings size={48} weight="duotone" className="text-slate-300 mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">No property linked yet</h2>
          <p className="text-slate-500 text-sm">Your property manager needs to link your account to a property. Contact them to get set up.</p>
        </div>
      </AppShell>
    );
  }

  const compliantCount = compliance.filter((c) => c.status === "compliant").length;
  const openTickets = tickets.filter((t) => !["completed", "closed"].includes(t.status));

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <Eyebrow>My home</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2 mb-1">{property.address}</h1>
        <div className="text-slate-600 mb-8">{property.suburb}, {property.city}{property.postcode ? ` ${property.postcode}` : ""} · {property.bedrooms} bed · {property.bathrooms} bath</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Property manager contact */}
          <div className="bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <User size={18} weight="bold" className="text-[#004B87]" />
              <div className="label-eyebrow">Property manager</div>
            </div>
            {manager ? (
              <>
                <div className="font-semibold">{manager.full_name}</div>
                <a href={`mailto:${manager.email}`} className="text-sm text-[#004B87] hover:underline block mt-1">{manager.email}</a>
                {manager.phone && <div className="text-sm text-slate-500 mt-1">{manager.phone}</div>}
              </>
            ) : (
              <p className="text-sm text-slate-400">Contact details not available</p>
            )}
          </div>

          {/* Healthy Homes summary */}
          <div className="bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={18} weight="bold" className="text-[#004B87]" />
              <div className="label-eyebrow">Healthy Homes</div>
            </div>
            <div className="font-display text-3xl font-bold text-[#004B87]">{compliantCount}<span className="text-base text-slate-400">/{compliance.length}</span></div>
            <div className="text-sm text-slate-500 mt-1">areas compliant</div>
            <div className="mt-3 space-y-1.5">
              {compliance.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{AREA_LABELS[c.area] || c.area}</span>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Open tickets */}
          <div className="bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wrench size={18} weight="bold" className="text-[#004B87]" />
              <div className="label-eyebrow">Open tickets</div>
            </div>
            <div className="font-display text-3xl font-bold text-[#004B87]">{openTickets.length}</div>
            <div className="text-sm text-slate-500 mt-1">awaiting action</div>
            <Link
              to="/report"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#FF5722] hover:underline"
            >
              Report an issue <ArrowRight size={13} weight="bold" />
            </Link>
          </div>
        </div>

        {/* Recent tickets */}
        {tickets.length > 0 && (
          <div className="bg-white border border-slate-200">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench size={16} weight="bold" className="text-[#004B87]" />
                <h3 className="font-display font-bold">My tickets</h3>
              </div>
              <Link to="/tickets" className="text-xs font-semibold uppercase tracking-wider text-[#004B87] hover:underline">View all</Link>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-5 py-2.5 label-eyebrow">Issue</th>
                  <th className="px-5 py-2.5 label-eyebrow">Urgency</th>
                  <th className="px-5 py-2.5 label-eyebrow">Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets.slice(0, 8).map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link to={`/tickets/${t.id}`} className="font-semibold hover:text-[#004B87]">{t.title}</Link>
                      <div className="text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={t.urgency} /></td>
                    <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

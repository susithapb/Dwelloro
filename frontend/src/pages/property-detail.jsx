import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiClient, fileUrl, useAuth } from "../lib/api";
import { Eyebrow, StatusBadge } from "../components/Common";
import { ArrowLeft, Thermometer, Drop, Wind, ShieldCheck, Upload, ClipboardText, User, X, Trash, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import PropertyIntelligence from "../components/PropertyIntelligence";

const AREA_META = {
  heating: { label: "Heating", icon: Thermometer },
  insulation: { label: "Insulation", icon: ShieldCheck },
  ventilation: { label: "Ventilation", icon: Wind },
  moisture: { label: "Moisture / Drainage", icon: Drop },
  draught_stopping: { label: "Draught Stopping", icon: Wind },
};

const STATUSES = ["compliant", "missing_evidence", "at_risk", "non_compliant"];

export default function PropertyDetail() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [items, setItems] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [timeline, setTimeline] = useState({});
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [savingTenant, setSavingTenant] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: c }, { data: t }, { data: tl }] = await Promise.all([
        apiClient.get(`/properties/${id}`),
        apiClient.get(`/compliance/property/${id}`),
        apiClient.get(`/tickets?property_id=${id}`),
        apiClient.get(`/inspections/property/${id}/timeline`).catch(() => ({ data: { timeline: {} } })),
      ]);
      setProperty(p);
      setItems(c);
      setTickets(t);
      setTimeline(tl.timeline || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (currentUser?.role === "property_manager") {
      apiClient.get("/users/tenants").then(({ data }) => setTenants(data));
    }
  }, [currentUser]);

  useEffect(() => {
    if (property) {
      setSelectedTenantId(property.tenant_id || "");
      setEditForm({
        address: property.address || "",
        suburb: property.suburb || "",
        city: property.city || "",
        postcode: property.postcode || "",
        bedrooms: property.bedrooms ?? "",
        bathrooms: property.bathrooms ?? "",
        notes: property.notes || "",
      });
    }
  }, [property]);

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await apiClient.patch(`/properties/${id}`, editForm);
      setProperty(data);
      setEditOpen(false);
      toast.success("Property updated");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const assignTenant = async () => {
    setSavingTenant(true);
    try {
      const { data } = await apiClient.patch(`/properties/${id}`, {
        tenant_id: selectedTenantId || null,
      });
      setProperty(data);
      toast.success(selectedTenantId ? "Tenant assigned" : "Tenant removed");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update tenant");
    } finally {
      setSavingTenant(false);
    }
  };

  const deleteProperty = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await apiClient.delete(`/properties/${id}`);
      toast.success("Property deleted");
      navigate("/properties");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Delete failed");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const updateItem = async (item, updates) => {
    try {
      await apiClient.patch(`/compliance/${item.id}`, updates);
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  const onUploadEvidence = async (item, files) => {
    if (!files?.length) return;
    try {
      const paths = [];
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        const { data } = await apiClient.post("/uploads", fd);
        paths.push(data.storage_path);
      }
      await updateItem(item, {
        evidence_paths: [...(item.evidence_paths || []), ...paths],
        last_checked: new Date().toISOString(),
      });
      toast.success("Evidence uploaded");
    } catch {
      toast.error("Upload failed");
    }
  };

  const [showShare, setShowShare] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const createShare = async () => {
    try {
      const { data } = await apiClient.post(`/properties/${id}/share`);
      setShareUrl(data.url);
      setShowShare(true);
      navigator.clipboard?.writeText(data.url).catch(() => {});
      toast.success("Share link created & copied");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  };

  if (loading) return <AppShell><div className="p-8 text-slate-500">Loading…</div></AppShell>;
  if (!property) return <AppShell><div className="p-8">Property not found.</div></AppShell>;

  const compliantCount = items.filter((i) => i.status === "compliant").length;

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Link to="/properties" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#004B87] mb-4">
          <ArrowLeft size={14} weight="bold" /> All properties
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
          <div>
            <Eyebrow>Property file</Eyebrow>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2" data-testid="property-detail-title">{property.address}</h1>
            <div className="text-slate-600">{property.suburb}, {property.city} · {property.bedrooms} bed · {property.bathrooms} bath</div>
            {(currentUser?.role === "property_manager" || currentUser?.role === "landlord") && (
              <button
                onClick={() => setEditOpen((v) => !v)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#004B87] transition-colors"
                data-testid="property-edit-toggle"
              >
                <PencilSimple size={13} weight="bold" />
                {editOpen ? "Close editor" : "Edit details"}
              </button>
            )}
          </div>
          <div className="bg-white border border-slate-200 p-4 min-w-[180px]">
            <div className="label-eyebrow">Risk score</div>
            <div className={`font-display text-3xl font-bold mt-1 ${property.risk_score > 50 ? "text-[#FF5722]" : "text-[#004B87]"}`}>{property.risk_score}</div>
            <div className="text-xs text-slate-500">Lower is better</div>
            <button onClick={createShare} data-testid="property-share-btn" className="mt-3 w-full bg-[#004B87] hover:bg-[#003A69] text-white text-xs font-bold uppercase tracking-wider py-2">
              Share with landlord
            </button>
            {(currentUser?.role === "property_manager" || currentUser?.role === "landlord") && (
              <button
                onClick={deleteProperty}
                disabled={deleting}
                data-testid="property-delete-btn"
                className={`mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider py-2 border transition-colors disabled:opacity-50 ${confirmDelete ? "bg-[#FF5722] text-white border-[#FF5722]" : "border-slate-300 text-slate-600 hover:border-red-400 hover:text-red-600"}`}
              >
                <Trash size={12} weight="bold" />
                {deleting ? "Deleting…" : confirmDelete ? "Confirm delete" : "Delete property"}
              </button>
            )}
            {showShare && shareUrl && (
              <div className="mt-3 text-[11px] font-mono break-all bg-slate-50 border border-slate-200 p-2" data-testid="share-link-display">
                {shareUrl}
              </div>
            )}
          </div>
        </div>

        {/* Inline edit form */}
        {editOpen && (
          <form onSubmit={saveEdit} className="bg-white border border-[#004B87]/30 p-5 mb-6" data-testid="property-edit-form">
            <div className="label-eyebrow mb-4">Edit property details</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="label-eyebrow block mb-1">Address</label>
                <input required value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#004B87]" />
              </div>
              <div>
                <label className="label-eyebrow block mb-1">Postcode</label>
                <input value={editForm.postcode} onChange={(e) => setEditForm((f) => ({ ...f, postcode: e.target.value }))} className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#004B87]" />
              </div>
              <div>
                <label className="label-eyebrow block mb-1">Suburb</label>
                <input required value={editForm.suburb} onChange={(e) => setEditForm((f) => ({ ...f, suburb: e.target.value }))} className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#004B87]" />
              </div>
              <div>
                <label className="label-eyebrow block mb-1">City</label>
                <input required value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#004B87]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-eyebrow block mb-1">Bedrooms</label>
                  <input type="number" min="0" value={editForm.bedrooms} onChange={(e) => setEditForm((f) => ({ ...f, bedrooms: e.target.value }))} className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#004B87]" />
                </div>
                <div>
                  <label className="label-eyebrow block mb-1">Bathrooms</label>
                  <input type="number" min="0" value={editForm.bathrooms} onChange={(e) => setEditForm((f) => ({ ...f, bathrooms: e.target.value }))} className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#004B87]" />
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="label-eyebrow block mb-1">Notes</label>
              <textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#004B87]" placeholder="Internal notes…" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} data-testid="property-edit-save" className="px-5 py-2 bg-[#004B87] hover:bg-[#003A69] disabled:opacity-60 text-white text-sm font-semibold">
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button type="button" onClick={() => setEditOpen(false)} className="px-5 py-2 border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Occupants — property manager only */}
        {currentUser?.role === "property_manager" && (
          <div className="mb-10">
            <h2 className="font-display text-xl font-bold mb-4">Occupants</h2>
            <div className="bg-white border border-slate-200 p-5">
              <div className="flex items-start gap-6 flex-wrap">
                {/* Current tenant */}
                <div className="flex-1 min-w-[220px]">
                  <div className="label-eyebrow mb-2">Current tenant</div>
                  {property.tenant_id ? (() => {
                    const t = tenants.find(t => t.id === property.tenant_id);
                    return t ? (
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-2.5">
                        <div className="w-8 h-8 bg-[#004B87] flex items-center justify-center flex-shrink-0">
                          <User size={14} weight="bold" className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{t.full_name}</div>
                          <div className="text-xs text-slate-500 truncate">{t.email}</div>
                          {t.phone && <div className="text-xs text-slate-400">{t.phone}</div>}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 italic">Tenant ID assigned (user not found)</div>
                    );
                  })() : (
                    <div className="text-sm text-slate-400 italic">No tenant assigned</div>
                  )}
                </div>

                {/* Assign / change */}
                <div className="flex-1 min-w-[280px]">
                  <div className="label-eyebrow mb-2">
                    {property.tenant_id ? "Change tenant" : "Assign tenant"}
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedTenantId}
                      onChange={e => setSelectedTenantId(e.target.value)}
                      className="flex-1 border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#004B87]"
                    >
                      <option value="">— None —</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.full_name} ({t.email})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={assignTenant}
                      disabled={savingTenant || selectedTenantId === (property.tenant_id || "")}
                      className="px-4 py-2 bg-[#004B87] text-white text-sm font-semibold hover:bg-[#003a6e] transition-colors disabled:opacity-40"
                    >
                      {savingTenant ? "Saving…" : "Save"}
                    </button>
                    {property.tenant_id && (
                      <button
                        onClick={() => { setSelectedTenantId(""); }}
                        title="Clear selection"
                        className="px-2 py-2 border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <X size={14} weight="bold" className="text-slate-500" />
                      </button>
                    )}
                  </div>
                  {tenants.length === 0 && (
                    <p className="text-xs text-slate-400 mt-1.5">No tenant accounts registered yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Intelligence */}
        <div className="mb-10">
          <h2 className="font-display text-xl font-bold mb-4">Property intelligence</h2>
          <PropertyIntelligence propertyId={id} />
        </div>

        {/* Compliance */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Healthy Homes compliance</h2>
            <div className="text-sm text-slate-600 font-mono">{compliantCount}/{items.length} compliant</div>
          </div>          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {items.map((it) => {
              const meta = AREA_META[it.area] || { label: it.area, icon: ShieldCheck };
              const Icon = meta.icon;
              return (
                <div key={it.id} className="bg-white border border-slate-200 p-4 flex flex-col" data-testid={`compliance-${it.area}`}>
                  <div className="flex items-center justify-between">
                    <Icon size={22} weight="duotone" className="text-[#004B87]" />
                    <StatusBadge status={it.status} />
                  </div>
                  <div className="font-display font-bold mt-3">{meta.label}</div>
                  <select
                    value={it.status}
                    onChange={(e) => updateItem(it, { status: e.target.value })}
                    data-testid={`compliance-status-select-${it.area}`}
                    className="mt-3 text-xs border border-slate-300 px-2 py-1.5"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                  <div className="mt-3">
                    <div className="label-eyebrow mb-1">Evidence</div>
                    {it.evidence_paths?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {it.evidence_paths.map((p) => (
                          <a key={p} href={fileUrl(p)} target="_blank" rel="noreferrer">
                            <img src={fileUrl(p)} alt="" className="w-10 h-10 object-cover border border-slate-200" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">No evidence yet</div>
                    )}
                    <label className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#004B87] cursor-pointer hover:underline">
                      <Upload size={12} weight="bold" /> Upload
                      <input type="file" multiple accept="image/*,.pdf" onChange={(e) => onUploadEvidence(it, Array.from(e.target.files || []))} className="hidden" data-testid={`evidence-upload-${it.area}`} />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent tickets */}
        <div>
          <h2 className="font-display text-xl font-bold mb-4">Recent tickets</h2>
          {tickets.length === 0 ? (
            <div className="bg-white border border-slate-200 p-6 text-sm text-slate-500">No tickets for this property.</div>
          ) : (
            <div className="bg-white border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-left">
                    <th className="px-5 py-2.5 label-eyebrow">Title</th>
                    <th className="px-5 py-2.5 label-eyebrow">Urgency</th>
                    <th className="px-5 py-2.5 label-eyebrow">Status</th>
                    <th className="px-5 py-2.5 label-eyebrow">Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link to={`/tickets/${t.id}`} className="font-semibold hover:text-[#004B87]">{t.title}</Link>
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={t.urgency} /></td>
                      <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Inspection photo timeline */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <ClipboardText size={20} weight="duotone" className="text-[#004B87]" />
              Inspection photo timeline
            </h2>
            <Link to="/inspections" data-testid="property-inspections-link" className="text-xs font-bold uppercase tracking-wider text-[#004B87] hover:underline">
              New inspection
            </Link>
          </div>
          {Object.keys(timeline).length === 0 ? (
            <div className="bg-white border border-slate-200 p-6 text-sm text-slate-500">
              No inspection photos yet. Start an inspection to begin building the timeline.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(timeline).map(([roomName, photos]) => (
                <div key={roomName} className="bg-white border border-slate-200 p-4" data-testid={`timeline-room-${roomName.replace(/\s+/g, "-").toLowerCase()}`}>
                  <div className="font-display font-bold mb-3">{roomName}</div>
                  <div className="flex gap-3 overflow-x-auto">
                    {photos.map((ph, i) => (
                      <div key={i} className="flex-shrink-0 w-32">
                        <a href={fileUrl(ph.path)} target="_blank" rel="noreferrer">
                          <img src={fileUrl(ph.path)} alt="" className="w-32 h-32 object-cover border border-slate-200" />
                        </a>
                        <div className="font-mono text-[10px] text-slate-500 mt-1">
                          {ph.at ? new Date(ph.at).toLocaleDateString() : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

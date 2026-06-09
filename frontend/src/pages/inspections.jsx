import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiClient, useAuth } from "../lib/api";
import { Eyebrow, StatusBadge, SkeletonTable, EmptyState } from "../components/Common";
import { Link } from "react-router-dom";
import { Plus, ClipboardText } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Inspections() {
  const { user } = useAuth();
  const [inspections, setInspections] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newPropId, setNewPropId] = useState("");
  const [newScheduledAt, setNewScheduledAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: ins }, { data: pr }] = await Promise.all([
        apiClient.get("/inspections").catch(() => ({ data: [] })),
        apiClient.get("/properties").catch(() => ({ data: [] })),
      ]);
      setInspections(ins || []);
      setProperties(pr || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); }, [user]);

  const canCreate = user?.role === "property_manager" || user?.role === "inspector";

  const onCreate = async (e) => {
    e.preventDefault();
    if (!newPropId) return;
    setCreating(true);
    try {
      const payload = { property_id: newPropId };
      if (newScheduledAt) payload.scheduled_at = newScheduledAt;
      const { data } = await apiClient.post("/inspections", payload);
      toast.success("Inspection created");
      setShowNew(false);
      setNewPropId("");
      setNewScheduledAt("");
      window.location.href = `/inspections/${data.id}`;
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setCreating(false);
    }
  };

  const propMap = Object.fromEntries(properties.map((p) => [p.id, p]));
  const filtered = statusFilter ? inspections.filter((i) => i.status === statusFilter) : inspections;

  return (
    <AppShell>
      <div className="p-6 md:p-8">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <Eyebrow>Field operations</Eyebrow>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2" data-testid="inspections-title">
              Inspections
            </h1>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowNew((s) => !s)}
              data-testid="new-inspection-btn"
              className="bg-[#FF5722] hover:bg-[#E64A19] text-white px-5 py-2.5 font-semibold text-sm inline-flex items-center gap-2"
            >
              <Plus size={14} weight="bold" /> New inspection
            </button>
          )}
        </div>

        {showNew && (
          <form onSubmit={onCreate} className="bg-white border border-slate-200 p-5 mb-6 flex flex-wrap gap-3 items-end" data-testid="new-inspection-form">
            <div className="flex-1 min-w-[260px]">
              <div className="label-eyebrow mb-2">Property</div>
              <select
                required
                value={newPropId}
                onChange={(e) => setNewPropId(e.target.value)}
                data-testid="new-inspection-property"
                className="w-full border border-slate-300 px-4 py-2.5"
              >
                <option value="">Select a property…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.address} — {p.suburb}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="label-eyebrow mb-2">Scheduled date <span className="text-slate-400 normal-case font-normal">(optional)</span></div>
              <input
                type="date"
                value={newScheduledAt}
                onChange={(e) => setNewScheduledAt(e.target.value)}
                data-testid="new-inspection-date"
                className="border border-slate-300 px-4 py-2.5"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              data-testid="create-inspection-btn"
              className="bg-[#004B87] hover:bg-[#003A69] disabled:opacity-60 text-white px-5 py-2.5 font-semibold text-sm"
            >
              {creating ? "Creating…" : "Start inspection"}
            </button>
          </form>
        )}

        {inspections.length > 0 && (
          <div className="mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              data-testid="inspection-status-filter"
              className="border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#004B87] bg-white"
            >
              <option value="">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        )}

        {loading ? (
          <SkeletonTable rows={3} cols={4} />
        ) : inspections.length === 0 ? (
          <EmptyState
            icon={ClipboardText}
            title="No inspections yet"
            description="Start a room-by-room walkthrough to begin building a property health record."
            action={canCreate && (
              <button
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF5722] hover:bg-[#E64A19] text-white font-semibold text-sm"
              >
                <Plus size={14} weight="bold" /> New inspection
              </button>
            )}
          />
        ) : (
          filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
              No inspections with status <strong>{statusFilter.replace("_", " ")}</strong>.
            </div>
          ) : (
          <div className="bg-white border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left">
                  <th className="px-5 py-3 label-eyebrow">Property</th>
                  <th className="px-5 py-3 label-eyebrow">Scheduled</th>
                  <th className="px-5 py-3 label-eyebrow">Rooms</th>
                  <th className="px-5 py-3 label-eyebrow">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const p = propMap[i.property_id];
                  return (
                    <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link to={`/inspections/${i.id}`} data-testid={`inspection-link-${i.id}`} className="font-semibold hover:text-[#004B87]">
                          {p ? p.address : i.property_id.slice(0, 8)}
                        </Link>
                        {p && <div className="text-xs text-slate-500">{p.suburb}, {p.city}</div>}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">
                        {i.scheduled_at ? new Date(i.scheduled_at).toLocaleDateString() : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3 font-mono">{i.rooms?.length || 0}</td>
                      <td className="px-5 py-3"><StatusBadge status={i.status === "in_progress" ? "in_progress" : i.status === "completed" ? "completed" : "open"}>{i.status.replace("_", " ")}</StatusBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )
        )}
      </div>
    </AppShell>
  );
}

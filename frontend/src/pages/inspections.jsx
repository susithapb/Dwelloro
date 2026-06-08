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
  const [creating, setCreating] = useState(false);

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
      const { data } = await apiClient.post("/inspections", { property_id: newPropId });
      toast.success("Inspection created");
      setShowNew(false);
      setNewPropId("");
      window.location.href = `/inspections/${data.id}`;
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setCreating(false);
    }
  };

  const propMap = Object.fromEntries(properties.map((p) => [p.id, p]));

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
          <div className="bg-white border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left">
                  <th className="px-5 py-3 label-eyebrow">Property</th>
                  <th className="px-5 py-3 label-eyebrow">Rooms</th>
                  <th className="px-5 py-3 label-eyebrow">Status</th>
                  <th className="px-5 py-3 label-eyebrow text-right">Created</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((i) => {
                  const p = propMap[i.property_id];
                  return (
                    <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link to={`/inspections/${i.id}`} data-testid={`inspection-link-${i.id}`} className="font-semibold hover:text-[#004B87]">
                          {p ? p.address : i.property_id.slice(0, 8)}
                        </Link>
                        {p && <div className="text-xs text-slate-500">{p.suburb}, {p.city}</div>}
                      </td>
                      <td className="px-5 py-3 font-mono">{i.rooms?.length || 0}</td>
                      <td className="px-5 py-3"><StatusBadge status={i.status === "in_progress" ? "in_progress" : i.status === "completed" ? "completed" : "open"}>{i.status.replace("_", " ")}</StatusBadge></td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-slate-500">
                        {new Date(i.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

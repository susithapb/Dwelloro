import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiClient, fileUrl } from "../lib/api";
import { Eyebrow, StatusBadge } from "../components/Common";
import { ArrowLeft, Upload, X, CheckCircle, Warning, WarningCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

const CHECK_LABELS = {
  moisture: "Moisture / Damp",
  ventilation: "Ventilation",
  heating: "Heating",
  draught: "Draught Sealing",
  condition: "Overall Condition",
};

const STATUSES = [
  { value: "ok", label: "OK", color: "bg-emerald-50 text-emerald-700 border-emerald-300", icon: CheckCircle },
  { value: "minor", label: "Minor", color: "bg-amber-50 text-amber-800 border-amber-300", icon: Warning },
  { value: "major", label: "Major", color: "bg-red-50 text-red-700 border-red-300", icon: WarningCircle },
  { value: "na", label: "N/A", color: "bg-slate-50 text-slate-500 border-slate-300", icon: null },
];

export default function InspectionDetail() {
  const { id } = useParams();
  const [insp, setInsp] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openRoom, setOpenRoom] = useState(null);
  const [summary, setSummary] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/inspections/${id}`);
      setInsp(data);
      setSummary(data.summary || "");
      if (data.rooms?.length && !openRoom) setOpenRoom(data.rooms[0].id);
      const { data: p } = await apiClient.get(`/properties/${data.property_id}`).catch(() => ({ data: null }));
      setProperty(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const updateRoom = async (room, patch) => {
    try {
      const newChecklist = patch.checklist || room.checklist;
      const { data } = await apiClient.patch(`/inspections/${id}/rooms/${room.id}`, {
        checklist: newChecklist,
        notes: patch.notes !== undefined ? patch.notes : room.notes,
        photo_paths: patch.photo_paths || room.photo_paths,
      });
      setInsp(data);
    } catch {
      toast.error("Save failed");
    }
  };

  const onItemStatus = (room, key, status) => {
    const checklist = room.checklist.map((c) => c.key === key ? { ...c, status } : c);
    updateRoom(room, { checklist });
  };

  const onRoomNotes = (room, notes) => {
    updateRoom(room, { notes });
  };

  const onPhotoUpload = async (room, files) => {
    if (!files?.length) return;
    try {
      const paths = [];
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        const { data } = await apiClient.post("/uploads", fd);
        paths.push(data.storage_path);
      }
      await updateRoom(room, { photo_paths: [...(room.photo_paths || []), ...paths] });
      toast.success(`${paths.length} photo(s) added`);
    } catch {
      toast.error("Upload failed");
    }
  };

  const onPhotoRemove = (room, path) => {
    updateRoom(room, { photo_paths: (room.photo_paths || []).filter((p) => p !== path) });
  };

  const updateStatus = async (status) => {
    try {
      const { data } = await apiClient.patch(`/inspections/${id}`, { status });
      setInsp(data);
      toast.success(`Inspection ${status.replace("_", " ")}`);
    } catch {
      toast.error("Failed");
    }
  };

  const saveSummary = async () => {
    try {
      const { data } = await apiClient.patch(`/inspections/${id}`, { summary });
      setInsp(data);
      toast.success("Summary saved");
    } catch {
      toast.error("Save failed");
    }
  };

  const [generatingSummary, setGeneratingSummary] = useState(false);
  const onGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const { data } = await apiClient.post(`/inspections/${id}/summarize`);
      setInsp(data);
      setSummary(data.summary || "");
      toast.success("AI summary generated");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI summary failed");
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (loading) return <AppShell><div className="p-8 text-slate-500">Loading…</div></AppShell>;
  if (!insp) return <AppShell><div className="p-8">Inspection not found.</div></AppShell>;

  const stats = (() => {
    let ok = 0, minor = 0, major = 0, total = 0;
    (insp.rooms || []).forEach((r) => (r.checklist || []).forEach((c) => {
      if (c.status === "ok") ok++;
      else if (c.status === "minor") minor++;
      else if (c.status === "major") major++;
      total++;
    }));
    return { ok, minor, major, total };
  })();

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <Link to="/inspections" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#004B87] mb-4">
          <ArrowLeft size={14} weight="bold" /> All inspections
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <Eyebrow>Inspection · {insp.id.slice(0, 8)}</Eyebrow>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2" data-testid="inspection-title">
              {property ? property.address : "Property"}
            </h1>
            {property && <div className="text-slate-600">{property.suburb}, {property.city}</div>}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={insp.status === "in_progress" ? "in_progress" : insp.status === "completed" ? "completed" : "open"}>
              {insp.status.replace("_", " ")}
            </StatusBadge>
            {insp.status !== "completed" && (
              <button
                onClick={() => updateStatus(insp.status === "scheduled" ? "in_progress" : "completed")}
                data-testid="inspection-advance-btn"
                className="bg-[#004B87] hover:bg-[#003A69] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider"
              >
                {insp.status === "scheduled" ? "Start walkthrough" : "Mark complete"}
              </button>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Stat label="Rooms" value={insp.rooms?.length || 0} />
          <Stat label="OK" value={stats.ok} accentClass="text-emerald-700" />
          <Stat label="Minor" value={stats.minor} accentClass="text-amber-700" />
          <Stat label="Major" value={stats.major} accentClass="text-red-700" />
        </div>

        {/* Rooms accordion */}
        <div className="space-y-3 mb-8">
          {(insp.rooms || []).map((room) => {
            const isOpen = openRoom === room.id;
            const roomStats = (room.checklist || []).reduce((acc, c) => {
              if (c.status === "major") acc.major++;
              else if (c.status === "minor") acc.minor++;
              else if (c.status === "ok") acc.ok++;
              return acc;
            }, { ok: 0, minor: 0, major: 0 });
            return (
              <div key={room.id} className="bg-white border border-slate-200" data-testid={`room-${room.id}`}>
                <button
                  onClick={() => setOpenRoom(isOpen ? null : room.id)}
                  data-testid={`room-toggle-${room.name.replace(/\s+/g, "-").toLowerCase()}`}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-display font-bold text-lg">{room.name}</div>
                    <div className="flex gap-1.5">
                      {roomStats.ok > 0 && <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300 px-1.5 py-0.5">{roomStats.ok} OK</span>}
                      {roomStats.minor > 0 && <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-300 px-1.5 py-0.5">{roomStats.minor} minor</span>}
                      {roomStats.major > 0 && <span className="text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-300 px-1.5 py-0.5">{roomStats.major} major</span>}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {room.photo_paths?.length || 0} photos · {isOpen ? "▴" : "▾"}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-200 p-5 space-y-5">
                    {/* Checklist */}
                    <div>
                      <div className="label-eyebrow mb-3">Checklist</div>
                      <div className="space-y-2">
                        {(room.checklist || []).map((item) => (
                          <div key={item.key} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                            <div className="font-semibold text-sm">{CHECK_LABELS[item.key] || item.key}</div>
                            <div className="flex gap-1.5">
                              {STATUSES.map((s) => (
                                <button
                                  key={s.value}
                                  onClick={() => onItemStatus(room, item.key, s.value)}
                                  data-testid={`check-${room.id}-${item.key}-${s.value}`}
                                  className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                                    item.status === s.value
                                      ? s.color + " ring-2 ring-offset-1 ring-[#004B87]/30"
                                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-400"
                                  }`}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <div className="label-eyebrow mb-2">Room notes</div>
                      <textarea
                        defaultValue={room.notes || ""}
                        onBlur={(e) => e.target.value !== (room.notes || "") && onRoomNotes(room, e.target.value)}
                        rows={2}
                        data-testid={`room-notes-${room.id}`}
                        className="w-full border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#004B87]"
                        placeholder="Observations, evidence, follow-ups…"
                      />
                    </div>

                    {/* Photos */}
                    <div>
                      <div className="label-eyebrow mb-2">Photos</div>
                      <div className="flex flex-wrap gap-3">
                        {(room.photo_paths || []).map((p) => (
                          <div key={p} className="relative w-24 h-24 border border-slate-200 overflow-hidden">
                            <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
                            <button onClick={() => onPhotoRemove(room, p)} className="absolute top-1 right-1 bg-black/70 text-white p-1">
                              <X size={12} weight="bold" />
                            </button>
                          </div>
                        ))}
                        <label className="w-24 h-24 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#004B87] hover:bg-slate-50 text-slate-500">
                          <Upload size={18} weight="bold" />
                          <span className="text-[10px] mt-1 uppercase tracking-wider">Add</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => onPhotoUpload(room, Array.from(e.target.files || []))}
                            className="hidden"
                            data-testid={`room-photo-input-${room.id}`}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="label-eyebrow">Inspection summary</div>
            <button
              onClick={onGenerateSummary}
              disabled={generatingSummary}
              data-testid="inspection-ai-summary-btn"
              className="text-xs font-bold uppercase tracking-wider bg-[#FF5722] hover:bg-[#E64A19] disabled:opacity-60 text-white px-3 py-1.5"
            >
              {generatingSummary ? "Generating…" : "Generate with AI"}
            </button>
          </div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            data-testid="inspection-summary-input"
            className="w-full border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#004B87]"
            placeholder="Overall observations, recurring issues, recommended actions…"
          />
          <button
            onClick={saveSummary}
            data-testid="inspection-save-summary-btn"
            className="mt-3 bg-[#004B87] hover:bg-[#003A69] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider"
          >
            Save summary
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, accentClass = "" }) {
  return (
    <div className="bg-white border border-slate-200 p-3">
      <div className="label-eyebrow">{label}</div>
      <div className={`font-display text-2xl font-bold mt-1 ${accentClass}`}>{value}</div>
    </div>
  );
}

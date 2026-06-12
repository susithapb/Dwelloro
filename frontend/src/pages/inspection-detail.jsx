import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiClient, fileUrl } from "../lib/api";
import { Eyebrow, StatusBadge } from "../components/Common";
import { ArrowLeft, Upload, X, CheckCircle, Warning, WarningCircle, FilePdf, Plus } from "@phosphor-icons/react";
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
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Controlled notes — avoids textarea losing content on re-render
  const [roomNotes, setRoomNotes] = useState({});
  const [itemNotes, setItemNotes] = useState({});

  // Add room
  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [addingRoomLoading, setAddingRoomLoading] = useState(false);

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

  // Seed controlled notes for any room/item not yet tracked (preserves in-progress edits)
  useEffect(() => {
    if (!insp) return;
    setRoomNotes(prev => {
      const next = { ...prev };
      for (const r of insp.rooms || []) {
        if (!(r.id in next)) next[r.id] = r.notes || '';
      }
      return next;
    });
    setItemNotes(prev => {
      const next = { ...prev };
      for (const r of insp.rooms || []) {
        for (const c of r.checklist || []) {
          const k = r.id + '_' + c.key;
          if (!(k in next)) next[k] = c.notes || '';
        }
      }
      return next;
    });
  }, [insp]);

  const updateRoom = async (room, patch) => {
    try {
      const { data } = await apiClient.patch(`/inspections/${id}/rooms/${room.id}`, {
        checklist: patch.checklist ?? room.checklist,
        notes: patch.notes !== undefined ? patch.notes : room.notes,
        photo_paths: patch.photo_paths ?? room.photo_paths,
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

  const onItemNotesSave = (room, key, notes) => {
    const checklist = room.checklist.map((c) => c.key === key ? { ...c, notes } : c);
    updateRoom(room, { checklist });
  };

  const onRoomNotesSave = (room) => {
    updateRoom(room, { notes: roomNotes[room.id] ?? '' });
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
      toast.success(`${paths.length} file(s) added`);
    } catch {
      toast.error("Upload failed");
    }
  };

  const onPhotoRemove = (room, path) => {
    updateRoom(room, { photo_paths: (room.photo_paths || []).filter((p) => p !== path) });
  };

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

  const updateStatus = async (newStatus) => {
    if (newStatus === 'completed') {
      let naCount = 0;
      for (const r of insp.rooms || []) {
        for (const c of r.checklist || []) {
          if (c.status === 'na') naCount++;
        }
      }
      if (naCount > 0 && !window.confirm(`${naCount} checklist item(s) are still unassessed. Mark as complete anyway?`)) return;
    }
    try {
      const { data } = await apiClient.patch(`/inspections/${id}`, { status: newStatus });
      setInsp(data);
      toast.success(`Inspection ${newStatus.replace('_', ' ')}`);
      if (newStatus === 'completed' && !data.summary) onGenerateSummary();
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

  const onAddRoom = async (e) => {
    e.preventDefault();
    const name = newRoomName.trim();
    if (!name) return;
    setAddingRoomLoading(true);
    try {
      const { data } = await apiClient.post(`/inspections/${id}/rooms`, { name });
      setInsp(data);
      setNewRoomName('');
      setAddingRoom(false);
      setOpenRoom(data.rooms[data.rooms.length - 1]?.id);
      toast.success(`"${name}" added`);
    } catch {
      toast.error("Failed to add room");
    } finally {
      setAddingRoomLoading(false);
    }
  };

  if (loading) return <AppShell><div className="p-8 text-slate-500">Loading…</div></AppShell>;
  if (!insp) return <AppShell><div className="p-8">Inspection not found.</div></AppShell>;

  const stats = (() => {
    let ok = 0, minor = 0, major = 0;
    (insp.rooms || []).forEach((r) => (r.checklist || []).forEach((c) => {
      if (c.status === "ok") ok++;
      else if (c.status === "minor") minor++;
      else if (c.status === "major") major++;
    }));
    return { ok, minor, major };
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
        <div className="space-y-3 mb-4">
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
                    {room.photo_paths?.length || 0} files · {isOpen ? "▴" : "▾"}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-200 p-5 space-y-5">
                    {/* Checklist */}
                    <div>
                      <div className="label-eyebrow mb-3">Checklist</div>
                      <div className="space-y-3">
                        {(room.checklist || []).map((item) => (
                          <div key={item.key} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="font-semibold text-sm">{CHECK_LABELS[item.key] || item.key}</div>
                              <div className="flex items-center gap-1.5">
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
                                {(item.status === 'minor' || item.status === 'major') && (
                                  <Link
                                    to={`/report?property_id=${insp.property_id}&title=${encodeURIComponent(`${CHECK_LABELS[item.key] || item.key} issue in ${room.name}`)}&urgency=${item.status === 'major' ? 'high' : 'medium'}`}
                                    className="ml-1 text-[10px] font-bold uppercase tracking-wider text-[#FF5722] border border-[#FF5722] px-2 py-1 hover:bg-[#FF5722] hover:text-white transition-colors whitespace-nowrap"
                                  >
                                    + Ticket
                                  </Link>
                                )}
                              </div>
                            </div>
                            {(item.status === 'minor' || item.status === 'major') && (
                              <input
                                type="text"
                                value={itemNotes[room.id + '_' + item.key] ?? ''}
                                onChange={(e) => setItemNotes(prev => ({ ...prev, [room.id + '_' + item.key]: e.target.value }))}
                                onBlur={(e) => onItemNotesSave(room, item.key, e.target.value)}
                                placeholder="Describe the finding…"
                                data-testid={`item-notes-${room.id}-${item.key}`}
                                className="mt-2 w-full text-xs border border-slate-200 px-2 py-1.5 outline-none focus:ring-1 focus:ring-[#004B87] bg-slate-50 placeholder:text-slate-400"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Room notes */}
                    <div>
                      <div className="label-eyebrow mb-2">Room notes</div>
                      <textarea
                        value={roomNotes[room.id] ?? ''}
                        onChange={(e) => setRoomNotes(prev => ({ ...prev, [room.id]: e.target.value }))}
                        onBlur={() => onRoomNotesSave(room)}
                        rows={2}
                        data-testid={`room-notes-${room.id}`}
                        className="w-full border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#004B87]"
                        placeholder="Observations, evidence, follow-ups…"
                      />
                    </div>

                    {/* Photos & documents */}
                    <div>
                      <div className="label-eyebrow mb-2">Photos &amp; documents</div>
                      <div className="flex flex-wrap gap-3">
                        {(room.photo_paths || []).map((p) => (
                          <div key={p} className="relative w-24 h-24 border border-slate-200 overflow-hidden">
                            {p.toLowerCase().endsWith('.pdf') ? (
                              <a href={fileUrl(p)} target="_blank" rel="noreferrer" className="w-full h-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-[#004B87]">
                                <FilePdf size={28} weight="duotone" />
                              </a>
                            ) : (
                              <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
                            )}
                            <button onClick={() => onPhotoRemove(room, p)} className="absolute top-1 right-1 bg-black/70 text-white p-1 z-10">
                              <X size={12} weight="bold" />
                            </button>
                          </div>
                        ))}
                        <label className="w-24 h-24 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#004B87] hover:bg-slate-50 text-slate-500">
                          <Upload size={18} weight="bold" />
                          <span className="text-[10px] mt-1 uppercase tracking-wider">Add</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
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

        {/* Add room */}
        <div className="mb-8">
          {!addingRoom ? (
            <button
              onClick={() => setAddingRoom(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 border border-dashed border-slate-300 px-4 py-2 hover:border-[#004B87] hover:text-[#004B87] transition-colors"
            >
              <Plus size={14} weight="bold" /> Add room
            </button>
          ) : (
            <form onSubmit={onAddRoom} className="flex items-center gap-2 flex-wrap">
              <input
                autoFocus
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name (e.g. Garage)"
                className="border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#004B87] w-52"
              />
              <button
                type="submit"
                disabled={addingRoomLoading || !newRoomName.trim()}
                className="px-4 py-2 bg-[#004B87] hover:bg-[#003A69] disabled:opacity-60 text-white text-sm font-semibold"
              >
                {addingRoomLoading ? "Adding…" : "Add"}
              </button>
              <button
                type="button"
                onClick={() => { setAddingRoom(false); setNewRoomName(''); }}
                className="px-3 py-2 border border-slate-300 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </form>
          )}
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

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiClient, fileUrl, useAuth } from "../lib/api";
import { Eyebrow } from "../components/Common";
import { toast } from "sonner";
import { Upload, Sparkle, X } from "@phosphor-icons/react";

export default function ReportIssue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState({
    property_id: searchParams.get("property_id") || "",
    title: searchParams.get("title") || "",
    description: searchParams.get("description") || "",
    urgency: searchParams.get("urgency") || "medium",
  });
  const [photoPaths, setPhotoPaths] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient.get("/properties").then(({ data }) => {
      setProperties(data);
      const prefill = searchParams.get("property_id");
      if (!prefill && data.length === 1) {
        setForm((f) => ({ ...f, property_id: data[0].id }));
      }
    });
  }, []);

  const onUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        const { data } = await apiClient.post("/uploads", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploaded.push(data.storage_path);
      }
      setPhotoPaths((p) => [...p, ...uploaded]);
      toast.success(`${uploaded.length} photo(s) uploaded`);
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onAnalyze = async () => {
    if (!form.title || !form.description) {
      toast.error("Add a title and description first");
      return;
    }
    setAnalyzing(true);
    try {
      const { data } = await apiClient.post("/ai/analyze-issue", {
        title: form.title,
        description: form.description,
        photo_paths: photoPaths,
      });
      setAiResult(data);
      setForm((f) => ({ ...f, urgency: data.urgency }));
      toast.success("AI analysis complete");
    } catch (err) {
      toast.error("AI analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.property_id) {
      toast.error("Select a property");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/tickets", {
        ...form,
        photo_paths: photoPaths,
        category: aiResult?.category,
      });
      if (aiResult) {
        await apiClient.patch(`/tickets/${data.id}`, { note: `AI summary: ${aiResult.summary}` });
      }
      toast.success("Ticket created");
      navigate(`/tickets/${data.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <Eyebrow>New ticket</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2 mb-1" data-testid="report-title">
          Report a maintenance issue
        </h1>
        <p className="text-slate-600 mb-8">Add photos for instant AI triage. Everything is timestamped and stored as evidence.</p>

        <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 p-6 space-y-5">
            <div>
              <label className="label-eyebrow block mb-2">Property</label>
              <select
                value={form.property_id}
                onChange={(e) => setForm({ ...form, property_id: e.target.value })}
                data-testid="report-property-select"
                className="w-full border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#004B87]"
                required
              >
                <option value="">Select a property…</option>
                {properties.map((p) => {
                  const label = `${p.address} — ${p.suburb}`;
                  return <option key={p.id} value={p.id}>{label}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="label-eyebrow block mb-2">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                data-testid="report-title-input"
                className="w-full border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#004B87]"
                placeholder="e.g. Mould on bedroom wall"
                required
              />
            </div>
            <div>
              <label className="label-eyebrow block mb-2">Describe what's happening</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={5}
                data-testid="report-description-input"
                className="w-full border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#004B87]"
                placeholder="When did it start? How big is the area? Any moisture, smell, electrical involvement?"
                required
              />
            </div>

            <div>
              <label className="label-eyebrow block mb-2">Photos</label>
              <div className="flex flex-wrap gap-3 mb-3">
                {photoPaths.map((p) => (
                  <div key={p} className="relative w-24 h-24 border border-slate-200 overflow-hidden">
                    <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoPaths((arr) => arr.filter((x) => x !== p))}
                      className="absolute top-1 right-1 bg-black/70 text-white p-1"
                    >
                      <X size={12} weight="bold" />
                    </button>
                  </div>
                ))}
                <label
                  className={`w-24 h-24 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#004B87] hover:bg-slate-50 text-slate-500 ${uploading ? "opacity-50" : ""}`}
                  data-testid="report-photo-upload-label"
                >
                  <Upload size={20} weight="bold" />
                  <span className="text-[10px] mt-1 uppercase tracking-wider">{uploading ? "Uploading" : "Add photo"}</span>
                  <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" data-testid="report-photo-input" />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              data-testid="report-submit-btn"
              className="w-full bg-[#FF5722] hover:bg-[#E64A19] disabled:opacity-60 text-white py-3 font-semibold transition-colors"
            >
              {submitting ? "Submitting…" : "Submit ticket"}
            </button>
          </div>

          {/* AI panel */}
          <aside className="space-y-4">
            <div className="bg-[#0F172A] text-white p-5">
              <div className="flex items-center gap-2 text-[#FF5722]">
                <Sparkle size={18} weight="fill" />
                <div className="label-eyebrow text-slate-400">AI Triage</div>
              </div>
              <h3 className="font-display font-bold text-lg mt-2">Get an instant AI assessment</h3>
              <p className="text-sm text-slate-300 mt-1">Claude reads your description &amp; photos to classify the issue and flag Healthy Homes risks.</p>
              <button
                type="button"
                onClick={onAnalyze}
                disabled={analyzing}
                data-testid="report-ai-analyze-btn"
                className="mt-4 w-full bg-[#FF5722] hover:bg-[#E64A19] disabled:opacity-60 text-white py-2.5 font-semibold text-sm transition-colors"
              >
                {analyzing ? "Analyzing…" : "Run AI analysis"}
              </button>
            </div>

            {aiResult && (
              <div className="bg-white border border-slate-200 p-5 fade-up" data-testid="report-ai-result">
                <div className="label-eyebrow text-[#FF5722]">AI Result</div>
                <div className="mt-3 space-y-3 text-sm">
                  <Row k="Category" v={aiResult.category} />
                  <Row k="Urgency" v={aiResult.urgency} />
                  <Row k="Contractor" v={aiResult.contractor_type} />
                  <Row k="Healthy Homes" v={aiResult.healthy_homes_relevant ? `Yes · ${aiResult.healthy_homes_area || "general"}` : "No"} />
                  <div>
                    <div className="label-eyebrow">Summary</div>
                    <div className="text-slate-700 mt-1">{aiResult.summary}</div>
                  </div>
                  {aiResult.risks?.length > 0 && (
                    <div>
                      <div className="label-eyebrow">Risks</div>
                      <ul className="list-disc list-inside text-slate-700 mt-1 space-y-0.5">
                        {aiResult.risks.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </form>
      </div>
    </AppShell>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2">
      <div className="label-eyebrow">{k}</div>
      <div className="font-mono text-slate-800 text-right">{v}</div>
    </div>
  );
}

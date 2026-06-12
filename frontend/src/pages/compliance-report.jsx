import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient, fileUrl } from "../lib/api";
import { ArrowLeft, Printer, FilePdf } from "@phosphor-icons/react";

const AREA_LABELS = {
  heating: "Heating",
  insulation: "Insulation",
  ventilation: "Ventilation",
  moisture: "Moisture / Drainage",
  draught_stopping: "Draught Stopping",
};

const STATUS_COLORS = {
  compliant: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", label: "Compliant" },
  missing_evidence: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", label: "Missing Evidence" },
  at_risk: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700", label: "At Risk" },
  non_compliant: { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", label: "Non-Compliant" },
};

export default function ComplianceReport() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [compliance, setCompliance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: p }, { data: c }] = await Promise.all([
          apiClient.get(`/properties/${id}`),
          apiClient.get(`/compliance/property/${id}`),
        ]);
        setProperty(p);
        setCompliance(c || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;
  if (!property) return <div className="p-8">Property not found.</div>;

  const compliantCount = compliance.filter((c) => c.status === "compliant").length;
  const reportDate = new Date().toLocaleDateString("en-NZ", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-white">
      {/* Print controls — hidden on print */}
      <div className="print:hidden bg-slate-100 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <Link to={`/properties/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#004B87]">
          <ArrowLeft size={14} weight="bold" /> Back to property
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-[#004B87] hover:bg-[#003A69] text-white px-4 py-2 text-sm font-semibold"
        >
          <Printer size={16} weight="bold" /> Print / Save PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="border-b-2 border-[#004B87] pb-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#004B87] mb-2">Healthy Homes Compliance Report</div>
              <h1 className="text-3xl font-bold text-[#0F172A]">{property.address}</h1>
              <div className="text-slate-600 mt-1">{property.suburb}, {property.city}{property.postcode ? ` ${property.postcode}` : ""}</div>
              <div className="text-slate-500 text-sm mt-1">{property.bedrooms} bedrooms · {property.bathrooms} bathrooms</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">Report date</div>
              <div className="font-semibold">{reportDate}</div>
              <div className="mt-3 text-sm text-slate-500">Overall status</div>
              <div className={`text-xl font-bold mt-0.5 ${compliantCount === compliance.length ? "text-emerald-700" : "text-amber-700"}`}>
                {compliantCount}/{compliance.length} Compliant
              </div>
            </div>
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {Object.entries(STATUS_COLORS).map(([key, meta]) => {
            const count = compliance.filter((c) => c.status === key).length;
            return (
              <div key={key} className={`border p-3 text-center ${meta.bg} ${meta.border}`}>
                <div className={`text-2xl font-bold ${meta.text}`}>{count}</div>
                <div className={`text-[11px] font-semibold uppercase tracking-wider mt-0.5 ${meta.text}`}>{meta.label}</div>
              </div>
            );
          })}
        </div>

        {/* Compliance areas */}
        <div className="space-y-6">
          {compliance.map((item) => {
            const statusMeta = STATUS_COLORS[item.status] || STATUS_COLORS.missing_evidence;
            return (
              <div key={item.id} className="border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold">{AREA_LABELS[item.area] || item.area}</h2>
                  <span className={`text-xs font-bold uppercase tracking-wider border px-2 py-1 ${statusMeta.bg} ${statusMeta.border} ${statusMeta.text}`}>
                    {statusMeta.label}
                  </span>
                </div>
                {item.notes && (
                  <p className="text-sm text-slate-700 mb-3 whitespace-pre-wrap">{item.notes}</p>
                )}
                {item.last_checked && (
                  <div className="text-xs text-slate-500 mb-3">Last checked: {new Date(item.last_checked).toLocaleDateString("en-NZ")}</div>
                )}
                {item.evidence_paths?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Evidence ({item.evidence_paths.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {item.evidence_paths.map((p) => (
                        p.toLowerCase().endsWith(".pdf") ? (
                          <a key={p} href={fileUrl(p)} target="_blank" rel="noreferrer" title="Open PDF" className="flex flex-col items-center gap-1">
                            <div className="w-20 h-20 border border-slate-200 bg-slate-50 flex items-center justify-center text-[#004B87]">
                              <FilePdf size={28} weight="duotone" />
                            </div>
                            <span className="text-[10px] text-slate-500">PDF</span>
                          </a>
                        ) : (
                          <img key={p} src={fileUrl(p)} alt="" className="w-20 h-20 object-cover border border-slate-200" />
                        )
                      ))}
                    </div>
                  </div>
                )}
                {!item.evidence_paths?.length && (
                  <div className="text-xs text-slate-400 italic">No evidence uploaded</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-slate-200 text-xs text-slate-400 flex items-center justify-between">
          <span>Generated by Dwelloro · Healthy Homes compliance platform for NZ rentals</span>
          <span>{reportDate}</span>
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 1.5cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

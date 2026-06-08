import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiClient } from "../lib/api";
import { Eyebrow, StatusBadge, SkeletonTable, EmptyState } from "../components/Common";
import { Link } from "react-router-dom";
import { ShieldCheck, Plus } from "@phosphor-icons/react";

const AREAS = ["heating", "insulation", "ventilation", "moisture", "draught_stopping"];

export default function Compliance() {
  const [props, setProps] = useState([]);
  const [byProp, setByProp] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: pr } = await apiClient.get("/properties");
        setProps(pr);
        const map = {};
        await Promise.all(
          pr.map(async (p) => {
            const { data } = await apiClient.get(`/compliance/property/${p.id}`).catch(() => ({ data: [] }));
            map[p.id] = Object.fromEntries(data.map((i) => [i.area, i]));
          })
        );
        setByProp(map);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppShell>
      <div className="p-6 md:p-8">
        <Eyebrow>Audit-ready</Eyebrow>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2 mb-8" data-testid="compliance-title">
          Healthy Homes compliance
        </h1>
        {loading ? (
          <SkeletonTable rows={3} cols={6} />
        ) : props.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No properties to review"
            description="Add a property first — compliance records are created automatically."
            action={
              <Link to="/properties" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#004B87] hover:bg-[#003A69] text-white font-semibold text-sm">
                <Plus size={14} weight="bold" /> Add property
              </Link>
            }
          />
        ) : (
          <div className="bg-white border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left">
                  <th className="px-5 py-3 label-eyebrow">Property</th>
                  {AREAS.map((a) => (
                    <th key={a} className="px-3 py-3 label-eyebrow">{a.replace("_", " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {props.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link to={`/properties/${p.id}`} className="font-semibold hover:text-[#004B87]">{p.address}</Link>
                      <div className="text-xs text-slate-500">{p.suburb}, {p.city}</div>
                    </td>
                    {AREAS.map((a) => {
                      const it = byProp[p.id]?.[a];
                      return (
                        <td key={a} className="px-3 py-3">
                          {it ? <StatusBadge status={it.status} /> : <span className="text-slate-400">—</span>}
                        </td>
                      );
                    })}
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

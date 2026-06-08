const CATEGORY_COST_NZD = {
  plumbing: 280,
  electrical: 320,
  mould_moisture: 650,
  heating: 480,
  ventilation: 360,
  insulation: 1200,
  structural: 1600,
  appliance: 340,
  pest: 200,
  general: 220,
};

const HH_CATEGORIES = ['mould_moisture', 'heating', 'ventilation', 'insulation'];

const now = () => new Date();
const daysSince = (iso) => (now() - new Date(iso)) / (1000 * 60 * 60 * 24);

function quarterKey(d) {
  const dt = new Date(d);
  const q = Math.floor(dt.getUTCMonth() / 3) + 1;
  return `${dt.getUTCFullYear()}-Q${q}`;
}

export function computeRiskBreakdown({ compliance = [], tickets = [], inspections = [] }) {
  const gaps = compliance.filter((c) =>
    ['missing_evidence', 'at_risk', 'non_compliant'].includes(c.status)
  );
  const complianceScore = Math.min(30, gaps.length * 6);

  const openTks = tickets.filter((t) => !['completed', 'closed'].includes(t.status));
  const ticketScore = Math.min(
    20,
    openTks.reduce((acc, t) => {
      const w = t.urgency === 'critical' ? 8 : t.urgency === 'high' ? 5 : t.urgency === 'medium' ? 2 : 1;
      return acc + w;
    }, 0)
  );

  const hhTks = openTks.filter(
    (t) => t.ai_analysis?.healthy_homes_relevant || HH_CATEGORIES.includes(t.category)
  );
  const hhScore = Math.min(20, hhTks.length * 5);

  const sorted = [...inspections].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const latest = sorted[0];
  let inspectionScore = 0;
  let majorFindings = 0;
  if (latest) {
    majorFindings = (latest.rooms || []).reduce(
      (n, r) => n + (r.checklist || []).filter((c) => c.status === 'major').length,
      0
    );
    inspectionScore = Math.min(15, majorFindings * 3);
  }

  let staleScore = 0;
  let staleDays = null;
  if (!latest) staleScore = 15;
  else {
    staleDays = Math.round(daysSince(latest.created_at));
    if (staleDays > 365) staleScore = 15;
    else if (staleDays > 270) staleScore = 10;
    else if (staleDays > 180) staleScore = 5;
  }

  const total = Math.min(100, complianceScore + ticketScore + hhScore + inspectionScore + staleScore);
  const sev = (s, mid, high) => (s >= high ? 'high' : s >= mid ? 'medium' : s > 0 ? 'low' : 'ok');

  return {
    total,
    signals: [
      { key: 'compliance_gaps', label: 'Compliance gaps', score: complianceScore, max: 30, count: gaps.length, detail: gaps.map((g) => g.area), severity: sev(complianceScore, 6, 18) },
      { key: 'open_tickets', label: 'Open ticket load', score: ticketScore, max: 20, count: openTks.length, severity: sev(ticketScore, 5, 12) },
      { key: 'healthy_homes', label: 'Active Healthy Homes issues', score: hhScore, max: 20, count: hhTks.length, severity: sev(hhScore, 5, 12) },
      { key: 'inspection_findings', label: 'Major inspection findings', score: inspectionScore, max: 15, count: majorFindings, severity: sev(inspectionScore, 3, 9) },
      { key: 'inspection_stale', label: 'Inspection recency', score: staleScore, max: 15, count: staleDays, severity: sev(staleScore, 5, 10) },
    ],
  };
}

export function seasonalPattern(tickets) {
  const cur = now();
  const quarters = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(cur);
    d.setUTCMonth(d.getUTCMonth() - i * 3);
    quarters.push(quarterKey(d));
  }
  const byQ = Object.fromEntries(quarters.map((q) => [q, { total: 0, hh: 0, moisture: 0, heating: 0 }]));
  for (const t of tickets) {
    const q = quarterKey(t.created_at);
    if (!byQ[q]) continue;
    byQ[q].total += 1;
    if (t.ai_analysis?.healthy_homes_relevant || HH_CATEGORIES.includes(t.category)) byQ[q].hh += 1;
    if (t.category === 'mould_moisture') byQ[q].moisture += 1;
    if (t.category === 'heating') byQ[q].heating += 1;
  }
  const series = quarters.map((q) => ({ quarter: q, ...byQ[q] }));
  const recent = series.slice(2).reduce((s, x) => s + x.total, 0);
  const prior = series.slice(0, 2).reduce((s, x) => s + x.total, 0);
  let trend = 'flat';
  if (prior === 0 && recent > 0) trend = 'up';
  else if (prior > 0 && recent / prior >= 1.5) trend = 'up';
  else if (prior > 0 && recent / prior <= 0.5) trend = 'down';
  return { series, trend };
}

export function costIntelligence(tickets) {
  const completed = tickets.filter((t) => t.status === 'completed');
  const byCategory = {};
  let total = 0;
  for (const t of completed) {
    const cat = t.category || 'general';
    const cost = CATEGORY_COST_NZD[cat] || CATEGORY_COST_NZD.general;
    byCategory[cat] = (byCategory[cat] || 0) + cost;
    total += cost;
  }
  const last12 = completed.filter((t) => daysSince(t.created_at) <= 365);
  const last12Total = last12.reduce(
    (s, t) => s + (CATEGORY_COST_NZD[t.category || 'general'] || CATEGORY_COST_NZD.general),
    0
  );
  return {
    estimated_total_nzd: total,
    estimated_last_12_months_nzd: last12Total,
    completed_count: completed.length,
    by_category: Object.entries(byCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    note: 'Estimated using NZ category baselines; not actual invoiced cost.',
  };
}

function monthKey(d) {
  const dt = new Date(d);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthsBack(n) {
  const out = [];
  const cur = now();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() - i, 1));
    out.push(monthKey(d));
  }
  return out;
}

export function portfolioTrends({ properties, tickets, inspections }, months = 12) {
  const keys = monthsBack(months);
  const base = () => ({ opened: 0, resolved: 0, hh_opened: 0, est_spend_nzd: 0, resolution_hours_sum: 0, resolution_hours_count: 0, inspections: 0 });
  const series = Object.fromEntries(keys.map((k) => [k, base()]));

  for (const t of tickets) {
    const openedK = monthKey(t.created_at);
    if (series[openedK]) {
      series[openedK].opened += 1;
      if (t.ai_analysis?.healthy_homes_relevant || HH_CATEGORIES.includes(t.category)) {
        series[openedK].hh_opened += 1;
      }
    }
    if (t.status === 'completed' && t.updated_at) {
      const resolvedK = monthKey(t.updated_at);
      if (series[resolvedK]) {
        series[resolvedK].resolved += 1;
        series[resolvedK].est_spend_nzd += CATEGORY_COST_NZD[t.category || 'general'] || CATEGORY_COST_NZD.general;
        const hours = (new Date(t.updated_at) - new Date(t.created_at)) / (1000 * 60 * 60);
        if (hours >= 0) {
          series[resolvedK].resolution_hours_sum += hours;
          series[resolvedK].resolution_hours_count += 1;
        }
      }
    }
  }
  for (const i of inspections) {
    const k = monthKey(i.created_at);
    if (series[k]) series[k].inspections += 1;
  }

  const seriesArr = keys.map((k) => {
    const s = series[k];
    return {
      month: k,
      opened: s.opened,
      resolved: s.resolved,
      hh_opened: s.hh_opened,
      est_spend_nzd: s.est_spend_nzd,
      inspections: s.inspections,
      avg_resolution_hours: s.resolution_hours_count
        ? Math.round((s.resolution_hours_sum / s.resolution_hours_count) * 10) / 10
        : null,
    };
  });

  const byCat = {};
  const last3Threshold = new Date();
  last3Threshold.setUTCMonth(last3Threshold.getUTCMonth() - 3);
  for (const t of tickets) {
    const cat = t.category || 'general';
    if (!byCat[cat]) byCat[cat] = { category: cat, total: 0, last_3m: 0 };
    byCat[cat].total += 1;
    if (new Date(t.created_at) >= last3Threshold) byCat[cat].last_3m += 1;
  }
  const categoryBreakdown = Object.values(byCat).sort((a, b) => b.total - a.total).slice(0, 8);

  const dayMs = 1000 * 60 * 60 * 24;
  const cutA = new Date(Date.now() - 30 * dayMs);
  const cutB = new Date(Date.now() - 60 * dayMs);
  const ticketsByProp = {};
  for (const t of tickets) {
    (ticketsByProp[t.property_id] = ticketsByProp[t.property_id] || []).push(t);
  }
  const deteriorating = [];
  for (const p of properties) {
    const list = ticketsByProp[p.id] || [];
    const recent = list.filter((t) => new Date(t.created_at) >= cutA).length;
    const prior = list.filter((t) => new Date(t.created_at) >= cutB && new Date(t.created_at) < cutA).length;
    const delta = recent - prior;
    if (delta >= 2 || (prior === 0 && recent >= 2)) {
      deteriorating.push({ id: p.id, address: p.address, suburb: p.suburb, current_risk: p.risk_score, tickets_last_30d: recent, tickets_prior_30d: prior, delta });
    }
  }
  deteriorating.sort((a, b) => b.delta - a.delta);

  const recent3 = seriesArr.slice(-3);
  const prior3 = seriesArr.slice(-6, -3);
  const sum = (arr, k) => arr.reduce((s, x) => s + (x[k] || 0), 0);
  const safeDelta = (r, p) => (p === 0 ? (r > 0 ? 100 : 0) : Math.round(((r - p) / p) * 100));
  const kpis = {
    opened_last_3m: sum(recent3, 'opened'),
    opened_delta_pct: safeDelta(sum(recent3, 'opened'), sum(prior3, 'opened')),
    resolved_last_3m: sum(recent3, 'resolved'),
    resolved_delta_pct: safeDelta(sum(recent3, 'resolved'), sum(prior3, 'resolved')),
    hh_last_3m: sum(recent3, 'hh_opened'),
    hh_delta_pct: safeDelta(sum(recent3, 'hh_opened'), sum(prior3, 'hh_opened')),
    spend_last_3m: sum(recent3, 'est_spend_nzd'),
    spend_delta_pct: safeDelta(sum(recent3, 'est_spend_nzd'), sum(prior3, 'est_spend_nzd')),
  };

  return {
    range: { months, from: keys[0], to: keys[keys.length - 1] },
    series: seriesArr,
    category_breakdown: categoryBreakdown,
    deteriorating_properties: deteriorating.slice(0, 10),
    kpis,
  };
}

export function buildAlerts({ properties, compliance, tickets, inspections }) {
  const alerts = [];
  const propMap = Object.fromEntries(properties.map((p) => [p.id, p]));

  for (const c of compliance) {
    if (!propMap[c.property_id]) continue;
    if (c.status === 'compliant' && c.last_checked) {
      const days = daysSince(c.last_checked);
      if (days > 335 && days <= 365) {
        alerts.push({
          id: `compl-expiring-${c.id}`,
          severity: 'medium',
          type: 'compliance_expiring',
          property_id: c.property_id,
          property_address: propMap[c.property_id].address,
          title: `${c.area.replace('_', ' ')} evidence expiring soon`,
          detail: `Compliant for ${Math.round(days)} days — re-check before 365d mark.`,
          target: `/properties/${c.property_id}`,
        });
      } else if (days > 365) {
        alerts.push({
          id: `compl-stale-${c.id}`,
          severity: 'high',
          type: 'compliance_stale',
          property_id: c.property_id,
          property_address: propMap[c.property_id].address,
          title: `${c.area.replace('_', ' ')} evidence is stale`,
          detail: `Last checked ${Math.round(days)} days ago — annual review needed.`,
          target: `/properties/${c.property_id}`,
        });
      }
    }
    if (['non_compliant', 'at_risk'].includes(c.status)) {
      alerts.push({
        id: `compl-risk-${c.id}`,
        severity: c.status === 'non_compliant' ? 'high' : 'medium',
        type: 'compliance_risk',
        property_id: c.property_id,
        property_address: propMap[c.property_id].address,
        title: `${c.area.replace('_', ' ')} ${c.status.replace('_', ' ')}`,
        detail: c.notes || 'Needs landlord attention',
        target: `/properties/${c.property_id}`,
      });
    }
  }

  for (const t of tickets) {
    if (['completed', 'closed'].includes(t.status)) continue;
    const days = daysSince(t.created_at);
    if (days > 30) {
      alerts.push({
        id: `tk-overdue-${t.id}`,
        severity: 'medium',
        type: 'ticket_overdue',
        property_id: t.property_id,
        property_address: propMap[t.property_id]?.address || '—',
        title: `Ticket open ${Math.round(days)} days`,
        detail: t.title,
        target: `/tickets/${t.id}`,
      });
    }
    if (['critical', 'high'].includes(t.urgency) && !t.assigned_contractor_id && daysSince(t.created_at) > 2) {
      alerts.push({
        id: `tk-unassigned-${t.id}`,
        severity: 'high',
        type: 'ticket_unassigned',
        property_id: t.property_id,
        property_address: propMap[t.property_id]?.address || '—',
        title: `${t.urgency.toUpperCase()} urgency unassigned >48h`,
        detail: t.title,
        target: `/tickets/${t.id}`,
      });
    }
  }

  const inspByProp = {};
  for (const i of inspections) {
    (inspByProp[i.property_id] = inspByProp[i.property_id] || []).push(i);
  }
  for (const p of properties) {
    const list = (inspByProp[p.id] || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const latest = list[0];
    if (!latest) {
      alerts.push({
        id: `insp-missing-${p.id}`,
        severity: 'medium',
        type: 'inspection_missing',
        property_id: p.id,
        property_address: p.address,
        title: 'No inspection on record',
        detail: 'Schedule a baseline inspection.',
        target: '/inspections',
      });
    } else {
      const days = daysSince(latest.created_at);
      if (days > 365) {
        alerts.push({
          id: `insp-stale-${p.id}`,
          severity: 'medium',
          type: 'inspection_stale',
          property_id: p.id,
          property_address: p.address,
          title: 'Inspection >12 months old',
          detail: `Last inspection ${Math.round(days)} days ago.`,
          target: '/inspections',
        });
      }
    }
  }

  const order = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
  return alerts;
}

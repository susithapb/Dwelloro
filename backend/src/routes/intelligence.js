import Property from '../models/Property.js';
import Compliance from '../models/Compliance.js';
import Ticket from '../models/Ticket.js';
import Inspection from '../models/Inspection.js';
import { authenticate } from '../middleware/auth.js';
import { loadPropertyContext, recomputeRiskScore } from '../services/risk.js';
import {
  computeRiskBreakdown,
  seasonalPattern,
  costIntelligence,
  buildAlerts,
  portfolioTrends,
} from '../services/intelligence.js';
import { strip, now } from '../utils/helpers.js';

function allowedForProperty(user, property) {
  if (!property) return false;
  if (user.role === 'property_manager') return property.manager_id === user.sub;
  if (user.role === 'landlord') return property.landlord_id === user.sub;
  if (user.role === 'tenant') return property.tenant_id === user.sub;
  if (user.role === 'inspector') return true;
  return false;
}

export default async function intelligenceRoutes(app) {
  app.get('/property/:id', { preHandler: authenticate }, async (req, reply) => {
    const property = await Property.findOne({ id: req.params.id });
    if (!property) return reply.code(404).send({ detail: 'Property not found' });
    if (!allowedForProperty(req.user, property)) {
      return reply.code(403).send({ detail: 'Forbidden' });
    }

    const ctx = await loadPropertyContext(property.id);
    const breakdown = computeRiskBreakdown(ctx);
    if (property.risk_score !== breakdown.total) {
      property.risk_score = breakdown.total;
      await property.save();
    }

    return {
      property_id: property.id,
      risk: breakdown,
      seasonal: seasonalPattern(ctx.tickets),
      cost: costIntelligence(ctx.tickets),
      generated_at: now(),
    };
  });

  app.get('/portfolio', { preHandler: authenticate }, async (req, reply) => {
    const { role, sub } = req.user;
    if (!['property_manager', 'landlord'].includes(role)) {
      return reply.code(403).send({ detail: 'Forbidden' });
    }

    const query = role === 'property_manager' ? { manager_id: sub } : { landlord_id: sub };
    const properties = (await Property.find(query)).map(strip);
    const pids = properties.map((p) => p.id);

    const [compliance, tickets, inspections] = await Promise.all([
      Compliance.find({ property_id: { $in: pids } }),
      Ticket.find({ property_id: { $in: pids } }),
      Inspection.find({ property_id: { $in: pids } }),
    ]);

    const C = compliance.map(strip);
    const T = tickets.map(strip);
    const I = inspections.map(strip);

    const groupBy = (arr, key) =>
      arr.reduce((map, x) => {
        (map[x[key]] = map[x[key]] || []).push(x);
        return map;
      }, {});

    const cG = groupBy(C, 'property_id');
    const tG = groupBy(T, 'property_id');
    const iG = groupBy(I, 'property_id');

    const ranked = properties
      .map((p) => {
        const ctx = {
          compliance: cG[p.id] || [],
          tickets: tG[p.id] || [],
          inspections: iG[p.id] || [],
        };
        const breakdown = computeRiskBreakdown(ctx);
        const cost = costIntelligence(ctx.tickets);
        const topSignal = breakdown.signals
          .filter((s) => s.score > 0)
          .sort((a, b) => b.score - a.score)[0];
        return {
          id: p.id,
          address: p.address,
          suburb: p.suburb,
          city: p.city,
          risk_score: breakdown.total,
          top_driver: topSignal ? topSignal.label : 'No active signals',
          open_tickets: (tG[p.id] || []).filter(
            (t) => !['completed', 'closed'].includes(t.status),
          ).length,
          estimated_12m_cost_nzd: cost.estimated_last_12_months_nzd,
        };
      })
      .sort((a, b) => b.risk_score - a.risk_score);

    const median = (arr) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };

    return {
      property_count: ranked.length,
      avg_risk_score: ranked.length
        ? Math.round(ranked.reduce((s, x) => s + x.risk_score, 0) / ranked.length)
        : 0,
      median_risk_score: median(ranked.map((x) => x.risk_score)),
      high_risk_count: ranked.filter((x) => x.risk_score >= 50).length,
      total_estimated_12m_spend_nzd: ranked.reduce(
        (s, x) => s + x.estimated_12m_cost_nzd,
        0,
      ),
      ranked,
      generated_at: now(),
    };
  });

  app.get('/portfolio/trends', { preHandler: authenticate }, async (req, reply) => {
    const { role, sub } = req.user;
    if (!['property_manager', 'landlord'].includes(role)) {
      return reply.code(403).send({ detail: 'Forbidden' });
    }

    const months = Math.min(24, Math.max(3, parseInt(req.query.months || '12', 10)));
    const query = role === 'property_manager' ? { manager_id: sub } : { landlord_id: sub };
    const properties = (await Property.find(query)).map(strip);
    const pids = properties.map((p) => p.id);

    if (!pids.length) {
      return {
        range: { months, from: null, to: null },
        series: [],
        category_breakdown: [],
        deteriorating_properties: [],
        kpis: {
          opened_last_3m: 0,
          opened_delta_pct: 0,
          resolved_last_3m: 0,
          resolved_delta_pct: 0,
          hh_last_3m: 0,
          hh_delta_pct: 0,
          spend_last_3m: 0,
          spend_delta_pct: 0,
        },
      };
    }

    const [tickets, inspections] = await Promise.all([
      Ticket.find({ property_id: { $in: pids } }),
      Inspection.find({ property_id: { $in: pids } }),
    ]);

    return portfolioTrends(
      { properties, tickets: tickets.map(strip), inspections: inspections.map(strip) },
      months,
    );
  });

  // Alerts (registered outside /intelligence prefix via app.register prefix, but kept here logically)
  app.get('/notifications/alerts', { preHandler: authenticate }, async (req, reply) => {
    const { role, sub } = req.user;
    if (!['property_manager', 'landlord', 'inspector'].includes(role)) {
      return reply.code(403).send({ detail: 'Forbidden' });
    }

    const query =
      role === 'property_manager'
        ? { manager_id: sub }
        : role === 'landlord'
        ? { landlord_id: sub }
        : {};

    const properties = (await Property.find(query)).map(strip);
    const pids = properties.map((p) => p.id);
    if (!pids.length) return { count: 0, alerts: [] };

    const [compliance, tickets, inspections] = await Promise.all([
      Compliance.find({ property_id: { $in: pids } }),
      Ticket.find({ property_id: { $in: pids } }),
      Inspection.find({ property_id: { $in: pids } }),
    ]);

    const alerts = buildAlerts({
      properties,
      compliance: compliance.map(strip),
      tickets: tickets.map(strip),
      inspections: inspections.map(strip),
    });

    return { count: alerts.length, alerts };
  });
}

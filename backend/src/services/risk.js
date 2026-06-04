import Compliance from '../models/Compliance.js';
import Ticket from '../models/Ticket.js';
import Inspection from '../models/Inspection.js';
import Property from '../models/Property.js';
import { computeRiskBreakdown } from './intelligence.js';
import { strip } from '../utils/helpers.js';

export async function loadPropertyContext(propertyId) {
  const [compliance, tickets, inspections] = await Promise.all([
    Compliance.find({ property_id: propertyId }),
    Ticket.find({ property_id: propertyId }),
    Inspection.find({ property_id: propertyId }),
  ]);
  return {
    compliance: compliance.map(strip),
    tickets: tickets.map(strip),
    inspections: inspections.map(strip),
  };
}

export async function recomputeRiskScore(propertyId) {
  const ctx = await loadPropertyContext(propertyId);
  const breakdown = computeRiskBreakdown(ctx);
  await Property.updateOne({ id: propertyId }, { risk_score: breakdown.total });
  return breakdown.total;
}

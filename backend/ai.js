// Dwelloro AI service — Claude Sonnet via official Anthropic SDK.
// Replaces the Python emergentintegrations service.

import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-DUMMY-KEY-REPLACE-ME';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const hasRealKey = () =>
  !!ANTHROPIC_API_KEY && !ANTHROPIC_API_KEY.includes('DUMMY') && ANTHROPIC_API_KEY.startsWith('sk-ant-');

// ---------- Prompts ----------
const ISSUE_SYSTEM =
  'You are an expert NZ rental property maintenance triage assistant. ' +
  'Analyze maintenance issues reported by tenants and respond with strict JSON ONLY. ' +
  'You must determine: category, urgency, NZ Healthy Homes relevance, suggested contractor type, ' +
  'a concise summary, and any safety/health risks. Be precise, factual, evidence-driven.';

const BRIEF_SYSTEM =
  'You are a maintenance coordinator drafting a clear, professional brief for a NZ tradesperson. ' +
  'Output: a 4-6 sentence brief covering the issue, suspected cause, access notes, safety considerations, ' +
  'and what to bring. No greetings, no signoff.';

const INSPECTION_SYSTEM =
  'You are an experienced NZ rental property inspector. Given a room-by-room inspection ' +
  'with checklist statuses (ok/minor/major/na) and notes, write a concise 4-7 sentence ' +
  'inspection summary covering: overall property condition, key issues found (with rooms), ' +
  'Healthy Homes concerns, deterioration trends vs prior inspections if any, and recommended ' +
  'follow-up actions. Plain prose, no lists, no greetings.';

// ---------- Helpers ----------
function extractJson(text) {
  if (!text) return {};
  let s = text.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a === -1 || b === -1) return {};
  try {
    return JSON.parse(s.slice(a, b + 1));
  } catch {
    return {};
  }
}

function textFromResponse(resp) {
  if (!resp?.content?.length) return '';
  return resp.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n')
    .trim();
}

// ---------- Public API ----------
export async function analyzeIssue(title, description, imageBase64List = []) {
  // Fallback if no real key — keep the app fully functional with sensible defaults
  if (!hasRealKey()) {
    return {
      category: 'general',
      urgency: 'medium',
      healthy_homes_relevant: false,
      healthy_homes_area: null,
      contractor_type: 'handyman',
      summary: (description || '').slice(0, 200),
      risks: [],
      _ai_disabled: true,
    };
  }

  const schemaHint = `{
  "category": "plumbing|electrical|mould_moisture|heating|ventilation|insulation|structural|appliance|pest|general",
  "urgency": "low|medium|high|critical",
  "healthy_homes_relevant": true|false,
  "healthy_homes_area": "heating|insulation|ventilation|moisture|draught_stopping|null",
  "contractor_type": "plumber|electrician|builder|hvac|painter|handyman|specialist",
  "summary": "1-2 sentence operational summary",
  "risks": ["short risk strings"]
}`;

  const userText =
    `Tenant report:\nTitle: ${title}\nDescription: ${description}\n\n` +
    `Respond with JSON matching this schema (no prose, no markdown):\n${schemaHint}`;

  const content = [];
  for (const b64 of (imageBase64List || []).slice(0, 4)) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
    });
  }
  content.push({ type: 'text', text: userText });

  let data = {};
  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: ISSUE_SYSTEM,
      messages: [{ role: 'user', content }],
    });
    data = extractJson(textFromResponse(resp));
  } catch (e) {
    console.error('[ai] analyzeIssue failed:', e.message);
    data = {};
  }

  const validUrgency = new Set(['low', 'medium', 'high', 'critical']);
  const validAreas = new Set(['heating', 'insulation', 'ventilation', 'moisture', 'draught_stopping']);
  let urgency = (data.urgency || 'medium').toLowerCase();
  if (!validUrgency.has(urgency)) urgency = 'medium';
  let hhArea = data.healthy_homes_area;
  if (!validAreas.has(hhArea)) hhArea = null;

  return {
    category: (data.category || 'general').toLowerCase(),
    urgency,
    healthy_homes_relevant: Boolean(data.healthy_homes_relevant),
    healthy_homes_area: hhArea,
    contractor_type: (data.contractor_type || 'handyman').toLowerCase(),
    summary: ((data.summary || (description || '').slice(0, 200)) + '').slice(0, 500),
    risks: (data.risks || []).slice(0, 6).map((r) => String(r).slice(0, 120)),
  };
}

export async function generateContractorBrief(ticket = {}, propertyInfo = {}) {
  if (!hasRealKey()) {
    return `Issue at ${propertyInfo.address || 'property'}: ${ticket.title || ''}.`;
  }
  const text =
    `Property: ${propertyInfo.address || ''}, ${propertyInfo.suburb || ''}, ${propertyInfo.city || ''}\n` +
    `Bedrooms: ${propertyInfo.bedrooms || 0} / Bathrooms: ${propertyInfo.bathrooms || 0}\n` +
    `Ticket: ${ticket.title || ''}\n` +
    `Description: ${ticket.description || ''}\n` +
    `Urgency: ${ticket.urgency || 'medium'}\n` +
    `Category: ${ticket.category || ''}\n` +
    `AI analysis: ${JSON.stringify(ticket.ai_analysis || {})}\n\n` +
    `Write the brief now.`;

  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: BRIEF_SYSTEM,
      messages: [{ role: 'user', content: text }],
    });
    return textFromResponse(resp);
  } catch (e) {
    console.error('[ai] generateContractorBrief failed:', e.message);
    return `Issue at ${propertyInfo.address || 'property'}: ${ticket.title || ''}.`;
  }
}

export async function summarizeInspection(inspection = {}, propertyInfo = {}, priorSummaries = []) {
  if (!hasRealKey()) return '';

  const priorBlock = priorSummaries.slice(-3).map((s) => `- ${s}`).join('\n') || '(none)';
  const roomsBlock = (inspection.rooms || [])
    .map((r) => {
      const items = (r.checklist || [])
        .map((c) => `${c.key}=${c.status}${c.note ? ` (${c.note})` : ''}`)
        .join(', ');
      return `• ${r.name}: ${items} | notes: ${r.notes || ''}`;
    })
    .join('\n');

  const text =
    `Property: ${propertyInfo.address || ''}, ${propertyInfo.suburb || ''}, ${propertyInfo.city || ''}\n` +
    `Bedrooms: ${propertyInfo.bedrooms || 0} / Bathrooms: ${propertyInfo.bathrooms || 0}\n` +
    `Prior inspection summaries:\n${priorBlock}\n\n` +
    `This inspection rooms:\n${roomsBlock}\n\n` +
    `Write the inspection summary now.`;

  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: INSPECTION_SYSTEM,
      messages: [{ role: 'user', content: text }],
    });
    return textFromResponse(resp);
  } catch (e) {
    console.error('[ai] summarizeInspection failed:', e.message);
    return '';
  }
}

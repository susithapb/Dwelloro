import { Resend } from 'resend';
import env from '../config/env.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function notifyContractorAssigned(contractor, ticket, property) {
  if (!resend) {
    console.log('[notify] Resend key missing — skipping email');
    return { skipped: true };
  }
  if (!contractor?.email) return { skipped: true };

  const url = env.APP_PUBLIC_URL
    ? `${env.APP_PUBLIC_URL}/tickets/${ticket.id}`
    : '#';
  const addr = property
    ? `${property.address}, ${property.suburb}, ${property.city}`
    : 'Property';
  const urgency = (ticket.urgency || 'medium').toUpperCase();
  const brief = ticket.contractor_brief || ticket.description || '';
  const urgencyColor =
    urgency === 'CRITICAL' || urgency === 'HIGH' ? '#FF5722' : '#004B87';

  const html = `
    <table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;max-width:560px;border:1px solid #e2e8f0">
      <tr><td style="background:#004B87;color:#fff;padding:20px">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.8">New job · Dwelloro</div>
        <h2 style="margin:6px 0 0">${ticket.title}</h2>
      </td></tr>
      <tr><td style="padding:20px;color:#0F172A">
        <p style="margin:0 0 10px"><strong>Kia ora ${contractor.full_name || ''},</strong></p>
        <p style="margin:0 0 14px">You've been assigned a maintenance ticket.</p>
        <table cellpadding="6" style="font-size:14px;border-collapse:collapse">
          <tr><td style="color:#64748b">Property</td><td><strong>${addr}</strong></td></tr>
          <tr><td style="color:#64748b">Urgency</td><td><strong style="color:${urgencyColor}">${urgency}</strong></td></tr>
          <tr><td style="color:#64748b">Category</td><td>${ticket.category || '—'}</td></tr>
        </table>
        <p style="margin:16px 0;line-height:1.5">${brief.replace(/</g, '&lt;')}</p>
        <a href="${url}" style="display:inline-block;background:#FF5722;color:#fff;padding:12px 20px;text-decoration:none;font-weight:600">Open ticket →</a>
      </td></tr>
      <tr><td style="background:#F1F5F9;padding:14px;color:#64748b;font-size:12px">Dwelloro · Operational evidence for NZ rentals</td></tr>
    </table>`;

  try {
    const r = await resend.emails.send({
      from: env.SENDER_EMAIL,
      to: [contractor.email],
      subject: `[${urgency}] ${ticket.title} — ${addr}`,
      html,
    });
    return { sent: true, id: r.data?.id };
  } catch (e) {
    console.error('[notify] Resend error', e.message);
    return { error: e.message };
  }
}

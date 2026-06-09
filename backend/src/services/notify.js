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

export async function notifyTicketStatusUpdate(reporter, ticket, property, newStatus) {
  if (!resend || !reporter?.email) return { skipped: true };

  const url = env.APP_PUBLIC_URL ? `${env.APP_PUBLIC_URL}/tickets/${ticket.id}` : '#';
  const addr = property ? `${property.address}, ${property.suburb}, ${property.city}` : 'Property';
  const statusLabel = { assigned: 'In progress', completed: 'Completed', closed: 'Closed' }[newStatus] || newStatus;
  const statusColor = newStatus === 'completed' ? '#10b981' : newStatus === 'closed' ? '#64748b' : '#004B87';

  const html = `
    <table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;max-width:560px;border:1px solid #e2e8f0">
      <tr><td style="background:#004B87;color:#fff;padding:20px">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.8">Ticket update · Dwelloro</div>
        <h2 style="margin:6px 0 0">${ticket.title}</h2>
      </td></tr>
      <tr><td style="padding:20px;color:#0F172A">
        <p style="margin:0 0 10px">Kia ora ${reporter.full_name || ''},</p>
        <p style="margin:0 0 14px">Your maintenance request has been updated.</p>
        <table cellpadding="6" style="font-size:14px;border-collapse:collapse">
          <tr><td style="color:#64748b">Property</td><td><strong>${addr}</strong></td></tr>
          <tr><td style="color:#64748b">New status</td><td><strong style="color:${statusColor}">${statusLabel}</strong></td></tr>
        </table>
        <a href="${url}" style="display:inline-block;margin-top:20px;background:#004B87;color:#fff;padding:12px 20px;text-decoration:none;font-weight:600">View ticket →</a>
      </td></tr>
      <tr><td style="background:#F1F5F9;padding:14px;color:#64748b;font-size:12px">Dwelloro · Operational evidence for NZ rentals</td></tr>
    </table>`;

  try {
    const r = await resend.emails.send({
      from: env.SENDER_EMAIL,
      to: [reporter.email],
      subject: `[${statusLabel}] ${ticket.title} — ${addr}`,
      html,
    });
    return { sent: true, id: r.data?.id };
  } catch (e) {
    console.error('[notify] Resend error', e.message);
    return { error: e.message };
  }
}

export async function notifyQuoteSubmitted(manager, ticket, property, contractor) {
  if (!resend || !manager?.email) return { skipped: true };

  const url = env.APP_PUBLIC_URL ? `${env.APP_PUBLIC_URL}/tickets/${ticket.id}` : '#';
  const addr = property ? `${property.address}, ${property.suburb}, ${property.city}` : 'Property';
  const amount = ticket.quote_amount != null ? `NZD ${Number(ticket.quote_amount).toFixed(2)}` : '—';

  const html = `
    <table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;max-width:560px;border:1px solid #e2e8f0">
      <tr><td style="background:#004B87;color:#fff;padding:20px">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.8">Quote received · Dwelloro</div>
        <h2 style="margin:6px 0 0">${ticket.title}</h2>
      </td></tr>
      <tr><td style="padding:20px;color:#0F172A">
        <p style="margin:0 0 14px">Kia ora ${manager.full_name || ''},</p>
        <p style="margin:0 0 14px"><strong>${contractor?.full_name || 'A contractor'}</strong> has submitted a quote for your approval.</p>
        <table cellpadding="6" style="font-size:14px;border-collapse:collapse">
          <tr><td style="color:#64748b">Property</td><td><strong>${addr}</strong></td></tr>
          <tr><td style="color:#64748b">Quote amount</td><td><strong style="color:#004B87;font-size:18px">${amount}</strong></td></tr>
          ${ticket.quote_notes ? `<tr><td style="color:#64748b;vertical-align:top">Notes</td><td>${ticket.quote_notes.replace(/</g, '&lt;')}</td></tr>` : ''}
        </table>
        <a href="${url}" style="display:inline-block;margin-top:20px;background:#FF5722;color:#fff;padding:12px 20px;text-decoration:none;font-weight:600">Review &amp; approve quote →</a>
      </td></tr>
      <tr><td style="background:#F1F5F9;padding:14px;color:#64748b;font-size:12px">Dwelloro · Operational evidence for NZ rentals</td></tr>
    </table>`;

  try {
    const r = await resend.emails.send({
      from: env.SENDER_EMAIL,
      to: [manager.email],
      subject: `Quote received: ${ticket.title} — ${amount}`,
      html,
    });
    return { sent: true, id: r.data?.id };
  } catch (e) {
    console.error('[notify] Resend error', e.message);
    return { error: e.message };
  }
}

export async function notifyQuoteDecision(contractor, ticket, property, decision, reason) {
  if (!resend || !contractor?.email) return { skipped: true };

  const url = env.APP_PUBLIC_URL ? `${env.APP_PUBLIC_URL}/tickets/${ticket.id}` : '#';
  const addr = property ? `${property.address}, ${property.suburb}, ${property.city}` : 'Property';
  const approved = decision === 'approved';
  const amount = ticket.quote_amount != null ? `NZD ${Number(ticket.quote_amount).toFixed(2)}` : '—';

  const html = `
    <table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;max-width:560px;border:1px solid #e2e8f0">
      <tr><td style="background:${approved ? '#004B87' : '#64748b'};color:#fff;padding:20px">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.8">Quote ${approved ? 'approved' : 'rejected'} · Dwelloro</div>
        <h2 style="margin:6px 0 0">${ticket.title}</h2>
      </td></tr>
      <tr><td style="padding:20px;color:#0F172A">
        <p style="margin:0 0 14px">Kia ora ${contractor.full_name || ''},</p>
        <p style="margin:0 0 14px">Your quote of <strong>${amount}</strong> for <strong>${addr}</strong> has been <strong style="color:${approved ? '#10b981' : '#ef4444'}">${approved ? 'approved' : 'rejected'}</strong>.</p>
        ${!approved && reason ? `<p style="margin:0 0 14px;color:#64748b"><em>Reason: ${reason.replace(/</g, '&lt;')}</em></p>` : ''}
        ${approved ? '<p style="margin:0 0 14px">Please proceed with the work as agreed.</p>' : '<p style="margin:0 0 14px">You may revise and resubmit your quote.</p>'}
        <a href="${url}" style="display:inline-block;margin-top:8px;background:#004B87;color:#fff;padding:12px 20px;text-decoration:none;font-weight:600">View ticket →</a>
      </td></tr>
      <tr><td style="background:#F1F5F9;padding:14px;color:#64748b;font-size:12px">Dwelloro · Operational evidence for NZ rentals</td></tr>
    </table>`;

  try {
    const r = await resend.emails.send({
      from: env.SENDER_EMAIL,
      to: [contractor.email],
      subject: `Quote ${approved ? 'approved' : 'rejected'}: ${ticket.title}`,
      html,
    });
    return { sent: true, id: r.data?.id };
  } catch (e) {
    console.error('[notify] Resend error', e.message);
    return { error: e.message };
  }
}

export async function sendPasswordResetEmail(user, resetUrl) {
  if (!resend) {
    console.log('[notify] Resend key missing — skipping password reset email');
    return { skipped: true };
  }

  const html = `
    <table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;max-width:560px;border:1px solid #e2e8f0">
      <tr><td style="background:#004B87;color:#fff;padding:20px">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.8">Dwelloro</div>
        <h2 style="margin:6px 0 0">Password reset request</h2>
      </td></tr>
      <tr><td style="padding:20px;color:#0F172A">
        <p style="margin:0 0 14px">Kia ora ${user.full_name || ''},</p>
        <p style="margin:0 0 14px">We received a request to reset your password. Click the button below to choose a new one. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#FF5722;color:#fff;padding:12px 20px;text-decoration:none;font-weight:600">Reset my password →</a>
        <p style="margin:20px 0 0;font-size:13px;color:#64748b">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
      </td></tr>
      <tr><td style="background:#F1F5F9;padding:14px;color:#64748b;font-size:12px">Dwelloro · Operational evidence for NZ rentals</td></tr>
    </table>`;

  try {
    const r = await resend.emails.send({
      from: env.SENDER_EMAIL,
      to: [user.email],
      subject: 'Reset your Dwelloro password',
      html,
    });
    return { sent: true, id: r.data?.id };
  } catch (e) {
    console.error('[notify] Resend error', e.message);
    return { error: e.message };
  }
}

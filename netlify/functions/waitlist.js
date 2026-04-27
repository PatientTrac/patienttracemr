// Netlify serverless function: /.netlify/functions/waitlist
// Handles waitlist submissions:
//   1. Creates/updates HubSpot contact with custom properties
//   2. Sends Resend confirmation email to the prospect
//   3. Sends Resend internal notification to sales@patienttrac.com
//
// Required Netlify environment variables:
//   HUBSPOT_ACCESS_TOKEN  - HubSpot Private App token
//   RESEND_API_KEY        - Resend API key
//   RESEND_FROM_EMAIL     - sender address verified in Resend (e.g. "PatientTrac <noreply@patienttracemr.com>")
//   INTERNAL_NOTIFY_EMAIL - where internal notifications go (e.g. "sales@patienttrac.com")

const HUBSPOT_API = 'https://api.hubapi.com';
const RESEND_API = 'https://api.resend.com';

const ALLOWED_MODULES = new Set([
  'Pain Management',
  'Dermatology',
  'InPatient & Trauma',
  'OutPatient Surgical Centers',
  'Surgeon Suite'
]);

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  // ---- validation ----
  const name = (body.name || '').toString().trim();
  const email = (body.email || '').toString().trim().toLowerCase();
  const organization = (body.organization || '').toString().trim();
  const phone = (body.phone || '').toString().trim();
  const role = (body.role || '').toString().trim();
  const message = (body.message || '').toString().trim();
  const modules = Array.isArray(body.modules)
    ? body.modules.filter((m) => ALLOWED_MODULES.has(m))
    : [];

  // honeypot — silent success if bots fill it
  if ((body.website || '').toString().trim() !== '') {
    return json(200, { ok: true });
  }

  if (!name || !email) {
    return json(400, { error: 'Name and email are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: 'Invalid email address' });
  }
  if (modules.length === 0) {
    return json(400, { error: 'Please select at least one module of interest' });
  }

  const moduleList = modules.join('; ');

  // ---- HubSpot contact upsert ----
  const hubspotResult = await upsertHubSpotContact({
    email,
    firstname: name.split(' ')[0] || name,
    lastname: name.split(' ').slice(1).join(' ') || '',
    company: organization,
    phone,
    jobtitle: role,
    pt_waitlist_modules: moduleList,
    pt_waitlist_message: message,
    pt_lead_source: 'patienttracemr.com waitlist',
    pt_signup_date: new Date().toISOString()
  });

  // ---- Resend emails (confirmation + internal) ----
  const [confirmResult, notifyResult] = await Promise.all([
    sendConfirmationEmail({ name, email, modules }),
    sendInternalNotification({ name, email, organization, phone, role, modules, message })
  ]);

  return json(200, {
    ok: true,
    hubspot: hubspotResult.ok,
    confirmation: confirmResult.ok,
    notification: notifyResult.ok
  });
};

// ---------- HubSpot ----------
async function upsertHubSpotContact(props) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    console.warn('HUBSPOT_ACCESS_TOKEN not set — skipping HubSpot');
    return { ok: false, reason: 'missing_token' };
  }

  const properties = {};
  for (const [k, v] of Object.entries(props)) {
    if (v !== undefined && v !== null && v !== '') properties[k] = v;
  }

  try {
    // Try to create first
    const createRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ properties })
    });

    if (createRes.ok) return { ok: true, action: 'created' };

    const createBody = await createRes.json().catch(() => ({}));
    const isConflict =
      createRes.status === 409 ||
      (createBody.message || '').toLowerCase().includes('already exists') ||
      (createBody.category || '').toLowerCase().includes('conflict');

    if (!isConflict) {
      console.error('HubSpot create failed:', createRes.status, createBody);
      return { ok: false, reason: 'create_failed', detail: createBody };
    }

    // Contact exists — update by email
    const updateRes = await fetch(
      `${HUBSPOT_API}/crm/v3/objects/contacts/${encodeURIComponent(props.email)}?idProperty=email`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ properties })
      }
    );

    if (updateRes.ok) return { ok: true, action: 'updated' };
    const updBody = await updateRes.json().catch(() => ({}));
    console.error('HubSpot update failed:', updateRes.status, updBody);
    return { ok: false, reason: 'update_failed', detail: updBody };
  } catch (err) {
    console.error('HubSpot error:', err);
    return { ok: false, reason: 'exception', detail: err.message };
  }
}

// ---------- Resend ----------
async function sendConfirmationEmail({ name, email, modules }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn('Resend env not set — skipping confirmation email');
    return { ok: false, reason: 'missing_env' };
  }

  const moduleListHtml = modules.map((m) => `<li style="margin: 4px 0;">${escapeHtml(m)}</li>`).join('');

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background:#020610; font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#020610; padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#0a1628; border:1px solid rgba(92,214,255,0.28);">
        <tr><td style="padding:36px 36px 24px;">
          <div style="font-family: 'Courier New', monospace; font-size:11px; letter-spacing:0.22em; color:#5cd6ff; text-transform:uppercase; margin-bottom:18px;">PatientTrac · Roadmap Waitlist</div>
          <h1 style="margin:0 0 18px; font-size:26px; line-height:1.2; font-weight:500; color:#e8f1ff; letter-spacing:-0.01em;">
            Thank you, ${escapeHtml(name.split(' ')[0] || name)}.
          </h1>
          <p style="margin:0 0 16px; color:#a8b8cc; font-size:15px; line-height:1.65;">
            We've added you to the early-access list for the following PatientTrac modules:
          </p>
          <ul style="margin:0 0 24px; padding-left:20px; color:#5cd6ff; font-size:15px; line-height:1.7;">
            ${moduleListHtml}
          </ul>
          <p style="margin:0 0 16px; color:#a8b8cc; font-size:15px; line-height:1.65;">
            A member of our team will reach out personally as each module approaches release. In the meantime, the four production platforms are already live:
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
            <tr>
              <td style="padding:6px 0; color:#a3e8ff; font-size:14px;"><a href="https://patienttracforge.com" style="color:#a3e8ff; text-decoration:none;">→ patienttracforge.com</a> · scheduling foundation</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#a3e8ff; font-size:14px;"><a href="https://patienttrac-revela.com" style="color:#a3e8ff; text-decoration:none;">→ patienttrac-revela.com</a> · plastic surgery</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#a3e8ff; font-size:14px;"><a href="https://patienttracmind.com" style="color:#a3e8ff; text-decoration:none;">→ patienttracmind.com</a> · behavioral health</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#a3e8ff; font-size:14px;"><a href="https://patienttracprofiler.com" style="color:#a3e8ff; text-decoration:none;">→ patienttracprofiler.com</a> · patient intake</td>
            </tr>
          </table>
          <hr style="border:none; border-top:1px solid rgba(92,214,255,0.18); margin:28px 0;" />
          <p style="margin:0; color:#6c7c92; font-size:12px; line-height:1.6;">
            Questions? Reply to this email or write to <a href="mailto:sales@patienttrac.com" style="color:#5cd6ff;">sales@patienttrac.com</a>.
          </p>
        </td></tr>
        <tr><td style="padding:18px 36px; background:#050b1a; border-top:1px solid rgba(92,214,255,0.12); font-family:'Courier New', monospace; font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:#6c7c92;">
          PatientTrac Corp · Est. 2001 · HIPAA Compliant
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Thank you, ${name.split(' ')[0] || name}.

We've added you to the early-access list for:
${modules.map((m) => `  - ${m}`).join('\n')}

A member of our team will reach out personally as each module approaches release.

In the meantime, our four production platforms are already live:
  - patienttracforge.com   (scheduling foundation)
  - patienttrac-revela.com (plastic surgery)
  - patienttracmind.com    (behavioral health)
  - patienttracprofiler.com (patient intake)

Questions? Reply to this email or write to sales@patienttrac.com.

— PatientTrac Corp`;

  try {
    const res = await fetch(`${RESEND_API}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Welcome to the PatientTrac roadmap waitlist',
        html,
        text
      })
    });
    if (res.ok) return { ok: true };
    const errBody = await res.json().catch(() => ({}));
    console.error('Resend confirmation failed:', res.status, errBody);
    return { ok: false, detail: errBody };
  } catch (err) {
    console.error('Resend confirmation error:', err);
    return { ok: false, detail: err.message };
  }
}

async function sendInternalNotification({ name, email, organization, phone, role, modules, message }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.INTERNAL_NOTIFY_EMAIL;
  if (!apiKey || !from || !to) {
    console.warn('Resend internal env incomplete — skipping notification');
    return { ok: false, reason: 'missing_env' };
  }

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; background:#f7fafc; padding:24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background:#fff; border:1px solid #e2e8f0;">
    <tr><td style="padding:24px 28px; background:#0a1628; color:#5cd6ff;">
      <strong style="font-family:'Courier New', monospace; font-size:11px; letter-spacing:0.22em; text-transform:uppercase;">New Waitlist Signup</strong>
    </td></tr>
    <tr><td style="padding:28px;">
      <h2 style="margin:0 0 16px; font-size:20px; color:#0a1628;">${escapeHtml(name)}</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px; color:#2d3748;">
        <tr><td style="padding:6px 0; width:130px; color:#718096;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#1f9fd9;">${escapeHtml(email)}</a></td></tr>
        ${organization ? `<tr><td style="padding:6px 0; color:#718096;">Organization</td><td style="padding:6px 0;">${escapeHtml(organization)}</td></tr>` : ''}
        ${role ? `<tr><td style="padding:6px 0; color:#718096;">Role</td><td style="padding:6px 0;">${escapeHtml(role)}</td></tr>` : ''}
        ${phone ? `<tr><td style="padding:6px 0; color:#718096;">Phone</td><td style="padding:6px 0;">${escapeHtml(phone)}</td></tr>` : ''}
        <tr><td style="padding:6px 0; color:#718096; vertical-align:top;">Modules</td><td style="padding:6px 0;"><strong>${modules.map(escapeHtml).join('</strong>, <strong>')}</strong></td></tr>
      </table>
      ${message ? `<div style="margin-top:18px; padding:14px 16px; background:#f7fafc; border-left:3px solid #1f9fd9; color:#2d3748; font-size:14px; line-height:1.6;">${escapeHtml(message).replace(/\n/g, '<br>')}</div>` : ''}
      <p style="margin:24px 0 0; font-size:12px; color:#a0aec0;">Submitted ${new Date().toUTCString()} · Synced to HubSpot</p>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const res = await fetch(`${RESEND_API}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Waitlist · ${name} · ${modules.join(', ')}`,
        html
      })
    });
    if (res.ok) return { ok: true };
    const errBody = await res.json().catch(() => ({}));
    console.error('Resend notification failed:', res.status, errBody);
    return { ok: false, detail: errBody };
  } catch (err) {
    console.error('Resend notification error:', err);
    return { ok: false, detail: err.message };
  }
}

// ---------- helpers ----------
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    body: JSON.stringify(body)
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

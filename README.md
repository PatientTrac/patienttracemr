# patienttracemr

The flagship corporate site for **PatientTrac Corp** — futuristic AI-powered health informatics.

**Live:** https://patienttracemr.com
**Repo:** github.com/PatientTrac/patienttracemr
**Deployed:** Netlify → auto-deploy on push to `master`

---

## What this is

The umbrella corporate site:
- 25-year history (2001 → today)
- Four production platforms: PatientTracForge, Revela, PatientTrac Mind, Patient Profiler
- Five upcoming specialty modules with **interactive waitlist**
- AI / 550-table story
- Leadership, press, careers, contact

The waitlist is wired to **HubSpot** (CRM contact creation) and **Resend** (instant confirmation email + internal sales notification).

---

## File structure

```
patienttracemr/
├── index.html                          ← entire site (HTML + CSS + client JS)
├── netlify.toml                        ← functions config + security headers + /api redirect
├── README.md                           ← this file
├── HUBSPOT_SETUP.md                    ← one-time HubSpot custom-property setup
├── assets/
│   └── logo.jpg                        ← hero brand image
└── netlify/
    └── functions/
        └── waitlist.js                 ← serverless: HubSpot upsert + Resend emails
```

---

## How the waitlist works

```
User clicks 1+ module cards (Pain Mgmt, Dermatology, etc.)
        ↓
Fills name + email (other fields optional)
        ↓
POST /api/waitlist  (rewrites to /.netlify/functions/waitlist)
        ↓
┌───────────────────────┬────────────────────────────────┐
│ HubSpot CRM           │ Resend                         │
│ POST contact (upsert) │ Email 1: confirm → user        │
│ Custom properties:    │ Email 2: notify → sales@       │
│  - pt_waitlist_modules│                                │
│  - pt_waitlist_message│                                │
│  - pt_lead_source     │                                │
│  - pt_signup_date     │                                │
└───────────────────────┴────────────────────────────────┘
        ↓
User sees inline success card with checkmark
```

Both calls run in parallel via `Promise.all`. If HubSpot fails, the user still gets the confirmation email. If Resend fails, HubSpot still has the contact. The submission only returns 4xx/5xx if validation fails.

---

## One-time setup

### 1. HubSpot Private App

1. HubSpot → **Settings → Integrations → Private Apps → Create**
2. Name: `PatientTrac EMR Site`
3. Scopes needed: `crm.objects.contacts.write`, `crm.objects.contacts.read`, `crm.schemas.contacts.write`
4. Copy the access token (starts with `pat-na1-...`)
5. **Create the four custom contact properties** — see `HUBSPOT_SETUP.md` for exact field definitions

### 2. Resend

1. Sign up / log in to https://resend.com
2. Add and verify the domain `patienttracemr.com` (DNS records: SPF, DKIM, return-path)
3. Create API key → copy it (starts with `re_...`)
4. Decide on a sender address — recommend `noreply@patienttracemr.com` or `sales@patienttracemr.com`

### 3. Netlify environment variables

Netlify dashboard → site → **Site configuration → Environment variables → Add variable**:

| Key | Example value |
|---|---|
| `HUBSPOT_ACCESS_TOKEN` | `pat-na1-xxxx-xxxx-xxxx` |
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxxxxxxx` |
| `RESEND_FROM_EMAIL` | `PatientTrac Corp <noreply@patienttracemr.com>` |
| `INTERNAL_NOTIFY_EMAIL` | `sales@patienttrac.com` |

After saving, trigger a redeploy so the function picks them up.

### 4. Test

1. Visit https://patienttracemr.com/#roadmap
2. Click 1+ module cards (they should glow cyan when selected)
3. Submit with a real email
4. Verify:
   - User receives confirmation email (cyan-branded HTML)
   - `sales@patienttrac.com` receives the internal notification
   - Contact appears in HubSpot with custom properties populated

---

## Local development (optional)

```bash
npm install -g netlify-cli
netlify dev
# Site runs at http://localhost:8888
# Functions runs at http://localhost:8888/.netlify/functions/waitlist
# /api/waitlist redirect works locally too
```

Set the same env vars in a `.env` file (gitignored) for local testing.

---

## Deploy

```bash
git add .
git commit -m "Add roadmap waitlist with HubSpot + Resend"
git push https://ghp_TOKEN@github.com/PatientTrac/patienttracemr.git master
```

Netlify auto-deploys. Functions deploy alongside the static site.

---

## Design system

| | |
|---|---|
| BG deep / base / card | `#020610` / `#050b1a` / `#0d1c33` |
| Cyan / bright / soft | `#5cd6ff` / `#7de4ff` / `#a3e8ff` |
| Display font | Space Grotesk (300/500/600) |
| Italic accent | Instrument Serif |
| Mono | JetBrains Mono |

---

## Sections (in order)

1. Hero — logo in HUD frame + scan line
2. About / History — origin story + 25-year timeline
3. Intelligence — 550-table glow + 4 AI features + schema bar
4. Products — 4 live platforms (Forge, Revela, Mind, Profiler)
5. **Roadmap — 5 toggleable upcoming modules + waitlist form** ← new
6. Leadership — 3 cards
7. Press — 4 quote cells
8. Careers — role pills + careers@ CTA
9. Contact — email directory + briefing form
10. Footer

---

*PatientTrac Corp · 2001–2026 · HIPAA Compliant*

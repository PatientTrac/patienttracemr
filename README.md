# patienttracemr

The corporate site for **PatientTrac Corp** — *The Clinical Intelligence Network.*

**Live:** https://patienttracemr.com
**Repo:** github.com/PatientTrac/patienttracemr
**Deployed:** Netlify → auto-deploy on push to `master`

---

## What this is

The umbrella marketing site for the PatientTrac family. No PHI, no auth, no database
connection — a single static `index.html` with one Netlify serverless function for the
waitlist. It tells the company story and showcases the **seven live platforms**:

| App | Site | What it is |
|-----|------|------------|
| **Forge** | patienttracforge.com | Scheduling, billing & practice-management hub — source of `encounter_id` |
| **Revela** | patienttrac-revela.com | Plastic & reconstructive surgery EMR |
| **Mind** | patienttracmind.com | Behavioral health EMR |
| **OR** | patienttracsurgery.com | Operating room & perioperative operations |
| **Surgery** | patienttracsurg.com | Surgical documentation |
| **Profiler** | patienttracprofiler.com | Patient-facing intake portal |
| **Companion** | patienttraccompanion.com | Patient self-management & monitoring |

Plus the AI/intelligence story, the 837P/835 revenue-cycle pipeline, the Profiler→Companion
patient continuum, a trimmed roadmap (Pain Management, Dermatology, Cardiology, InPatient &
Trauma), leadership, and contact.

---

## Brand (locked)

| Element | Value |
|---|---|
| Logo | Networked-P mark (deep-blue→teal gradient, gold rim + filaments, white/gold nodes) |
| Wordmark | `Patient` charcoal `#3a4452` · `Trac` gold `#D4AF37` · Poppins. Reversed on dark = ice `Patient` + gold `Trac` |
| Byline | "The Clinical Intelligence Network" · gold flanking rules |
| Palette | Deep Blue `#0B2D4D` · Teal `#0097A7` · Sky `#4DB6E5` · Gold `#D4AF37` · site navy `#060e1c` / cyan `#00d4ff` |
| Fonts | Rajdhani (headers) · DM Sans (body) · DM Mono (labels) · Poppins (wordmark) |

Login is **email + password + TOTP only** — there is no OAuth/"Continue with Google" anywhere on the site.

---

## Languages

Trilingual **EN / ES / FR**, switchable in the top bar. Strings live in the `I18N` object
in `index.html`; elements use `data-i18n` (text) and `data-i18n-html` (markup). Choice is
saved to `localStorage` and falls back to the browser language.

---

## Medical image cards

Each product card loads a real photo from `public/cards/<app>.jpg` with a branded gradient +
icon fallback. See `public/cards/README.md` for the per-card sourcing list (search terms,
dimensions, license-clean sources). No code change needed when files land.

---

## Structure

```
patienttracemr/
├── index.html              ← the entire site (HTML + CSS + JS + i18n)
├── netlify.toml            ← build + security headers
├── public/cards/           ← drop-in product photos (+ sourcing README)
├── netlify/functions/
│   └── waitlist.js          ← HubSpot + Resend waitlist handler
├── assets/                 ← founder photo
├── HUBSPOT_SETUP.md
└── README.md
```

`ALLOWED_MODULES` in `waitlist.js` is kept in sync with the roadmap cards in `index.html`.

---

## Deploy

```bash
git config --global --add safe.directory '*'   # Windows / Git Bash: clears "dubious ownership"
git pull                                        # always pull before pushing
git add .
git commit -m "Rebuild corporate site: locked brand, 7-app roster, revenue + continuum, trilingual"
git push https://ghp_TOKEN@github.com/PatientTrac/patienttracemr.git master
```

Netlify: build command empty · publish dir `.` · branch `master`. Env vars for the waitlist:
`HUBSPOT_ACCESS_TOKEN`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `INTERNAL_NOTIFY_EMAIL`.

---

*PatientTrac Corp — The Clinical Intelligence Network · HIPAA Compliant · ONC §170.315*

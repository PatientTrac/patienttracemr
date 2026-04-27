# HubSpot Setup — Custom Contact Properties

The waitlist function writes four **custom properties** onto the HubSpot Contact object. You must create these once in HubSpot before the integration will populate them.

**Where:** HubSpot → Settings (gear icon) → **Properties** → Object type: **Contact** → **Create property**

---

## Property 1 — Waitlist Modules

| Field | Value |
|---|---|
| Group | Contact information (or create a "PatientTrac" group) |
| Label | `PatientTrac Waitlist Modules` |
| **Internal name** | `pt_waitlist_modules` |
| Field type | **Multi-line text** |
| Description | Specialty modules the contact requested early access to via patienttracemr.com waitlist |

---

## Property 2 — Waitlist Message

| Field | Value |
|---|---|
| Group | Contact information |
| Label | `PatientTrac Waitlist Message` |
| **Internal name** | `pt_waitlist_message` |
| Field type | **Multi-line text** |
| Description | Free-form message submitted with the waitlist signup |

---

## Property 3 — Lead Source

| Field | Value |
|---|---|
| Group | Contact information |
| Label | `PatientTrac Lead Source` |
| **Internal name** | `pt_lead_source` |
| Field type | **Single-line text** |
| Description | Source of the lead within the PatientTrac product family |

---

## Property 4 — Signup Date

| Field | Value |
|---|---|
| Group | Contact information |
| Label | `PatientTrac Signup Date` |
| **Internal name** | `pt_signup_date` |
| Field type | **Date picker** |
| Description | When the contact joined the PatientTrac waitlist |

---

## Why the exact internal names matter

The serverless function (`netlify/functions/waitlist.js`) sends payloads like:

```json
{
  "properties": {
    "email": "dr.smith@example.com",
    "firstname": "Jane",
    "lastname": "Smith",
    "company": "Coastal Surgery Group",
    "pt_waitlist_modules": "Pain Management; OutPatient Surgical Centers",
    "pt_waitlist_message": "Multi-site practice, evaluating for Q3 rollout.",
    "pt_lead_source": "patienttracemr.com waitlist",
    "pt_signup_date": "2026-04-26T18:42:13.000Z"
  }
}
```

If the internal names don't match exactly (case-sensitive, no spaces), HubSpot will silently drop those properties and only the standard fields (`email`, `firstname`, `lastname`, `company`, `phone`, `jobtitle`) will populate.

---

## Recommended HubSpot follow-on

Once data flows in, build these in HubSpot:

1. **Active list** — "PatientTrac Waitlist · 2026" filtered by `pt_lead_source = patienttracemr.com waitlist`
2. **Workflow** — when `pt_waitlist_modules` contains a specific module, assign to the appropriate sales rep and create a follow-up task
3. **Dashboard** — Contacts grouped by `pt_waitlist_modules` to see demand signal per module
4. **View segmentation** — sub-lists per module: "Pain Management interest", "Surgeon Suite interest", etc.

---

## Verifying setup

After creating the four properties, run a test submission from the live site (or `netlify dev` locally). The created/updated contact in HubSpot should show all four custom properties populated. If any are blank, double-check the internal name spelling.

# JFS Business Hub — Jangid Furniture Studio

Fast, simple, and mobile-friendly lead management operations hub for **Jangid Furniture Studio (Ahmedabad)**.

Designed specifically for a non-technical furniture business owner to easily track incoming inquiries, site visits, quotations, and active follow-ups until they turn into paying customers.

---

## 🚀 Key Highlights & Philosophy

- **Zero Complication**: Fast, clean UI with zero decorative bloat, no fake AI chatbots, no complex enterprise databases, and no login barriers.
- **Mobile First**: Fully responsive on any phone (portrait or landscape), tablet, or desktop. Installable as a PWA ("Add to Home Screen").
- **Google Sheets As Source of Truth**: Integrates directly with the JFS owner's personal Gmail Google Sheet via Google Apps Script. Leads from the website flow straight to the Google Sheet and sync into this Hub.
- **Works 100% Offline / Locally**: Pre-loaded with realistic Ahmedabad modular furniture leads and backed by browser storage (`localStorage`), so the app works even with poor internet on construction sites.

---

## 📋 Standard JFS Lead Stages

Every lead moves through these 11 standard stages:
1. **Lead** — Fresh incoming enquiry (website, call, walk-in, WhatsApp).
2. **Contact** — First phone contact made to qualify requirement.
3. **Qualify** — Scope, budget, and timeline established.
4. **Site Visit** — On-site laser measurements and space inspection.
5. **Requirement** — Detailed design specifications, materials, and layout finalized.
6. **Quotation** — Estimate / quotation prepared and sent to client.
7. **Follow-up** — Active follow-up on design / quotation.
8. **Negotiation** — Final discussions on price, finishes, and payment schedule.
9. **WON** — Order confirmed and advance deposit received!
10. **Installation** — Factory manufacturing completed; on-site installation in progress.
11. **Referral** — Project delivered successfully; customer referral touchpoint.
*(Plus **Lost** to keep records organized if a deal cancels).*

> **Golden Rule**: Every active lead includes a **Next Action** (e.g. *"Call to review 3D layout"*) and a **Next Follow-up Date** (with automatic badges: *Due Today*, *Overdue*, *Upcoming*).

---

## ⚡ Instant Action Tools on Every Lead Card

- **1-Click WhatsApp**: Opens WhatsApp with a pre-filled professional Gujarati/Hindi/English greeting mentioning the customer's name, service, and Jangid Furniture Studio.
- **1-Click Call**: Dials the customer's mobile number directly (`tel:`).
- **Fast Status Update**: Change stage, update next action, and pick follow-up dates (*Today*, *Tomorrow*, *+3 Days*, *+1 Week*) with one tap.

---

## 📊 Google Sheets Connection (Owner's Personal Gmail Account)

The hub is designed around a direct, clean connection to the owner's personal Google Sheet:

1. In your personal Google account, create a Google Sheet called **"JFS Leads Database"**.
2. Open **Extensions → Apps Script**, paste the code from `website/google-apps-script.js`, and click **Deploy → New deployment → Web app** (Access: Anyone).
3. Copy the Web App URL and paste it into the **Google Sheet & Settings** tab in this Hub.
4. Click **Sync From Sheet** anytime to pull incoming website leads into the Hub!
5. You can also click **Export CSV** anytime to download your entire database for backup or offline review in Excel.

---

## 💻 Local Development & Build

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript typecheck
npm run typecheck

# Build optimized production bundle
npm run build
```

---

## 📁 Repository Deliverables for Manual Upload

This repository contains two cleanly separated deliverables:

1. **JFS Customer Website** (in `website/`):
   - `website/index.html` (Standalone customer-facing website with photo gallery, site visit & quote forms, WhatsApp links, and Google Sheets lead capture).
   - `website/google-apps-script.js` (Web App script for the owner's Google Sheet).
   - `website/README.md` (Setup instructions).
   - Can be uploaded to a dedicated repository or static host (Netlify, Vercel, GitHub Pages).

2. **JFS Business Hub** (Root files):
   - `src/App.tsx`, `src/lib/`, `src/index.css`, `index.html`, `vite.config.ts`, `package.json`.
   - Production build in `dist/`.
   - Can be uploaded to a dedicated repository and deployed to Vercel/Netlify.

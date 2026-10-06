# Jangid Furniture Studio — Customer-Facing Website

This directory contains the complete, production-ready customer-facing website for **Jangid Furniture Studio (Ahmedabad)**.

## Deliverable Overview
- **File**: `index.html` (Standalone single-page responsive website with zero external build step needed)
- **Companion Script**: `google-apps-script.js` (Web App script for the owner's personal Gmail Google Sheet)

## Key Features & Repairs Applied
1. **Seamless Lead Capture Flow**:
   - Both "Book Free Site Visit" and "Request a Quote" forms collect structured lead data.
   - Automatically posts to the owner's Google Apps Script Web App (Google Sheet) when configured.
   - Automatically backs up all inquiries locally in browser storage (`localStorage`) so no leads are ever lost if internet is slow or offline.
   - Displays a prominent **"Send on WhatsApp Directly"** button upon submission pre-filled with all customer and project details for instant 1-click chatting.
2. **Repaired Navigation & Tab Routing**:
   - Header "Get Quote" button switches to the Contact page AND immediately activates the Quote tab.
   - "Get Free Site Visit" and "Book Site Visit" CTA buttons activate the Site Visit tab.
   - Added direct "Request Quote" buttons inside each service detail (Modular Kitchen, Wardrobes, Office Partitions, etc.) with pre-selected service fields.
   - Fixed mobile hamburger menu drawer and overlay closing behavior.
3. **WhatsApp Flows**:
   - Floating WhatsApp button now has a pre-filled greeting specifically mentioning Jangid Furniture Studio and Ahmedabad modular furniture inquiry.
   - Direct WhatsApp buttons with Indian phone number `+91 97144 61172`.
4. **Mobile Responsiveness**:
   - Form inputs intelligently switch to single-column layout on mobile screens (`<= 600px`).
   - Hero buttons stack properly on small mobile devices.
   - Lightbox navigation controls and touch-friendly targets.
5. **Branding & Integrity**:
   - Preserved all original branding, Playfair Display & DM Sans typography, colors, and gallery images.
   - Did not invent fake reviews, statistics, or unsupported claims.

## How to Connect to Google Sheets (Owner's Personal Gmail Account)
1. Open [Google Sheets](https://sheets.google.com) logged into your personal Google account.
2. Create a new Sheet called **"JFS Leads Database"**.
3. In the menu, go to **Extensions** → **Apps Script**.
4. Copy and paste the code from `google-apps-script.js` into the script editor.
5. Click **Deploy** → **New deployment**.
6. Select **Web app**, set execute as **"Me"**, and access to **"Anyone"**.
7. Copy the generated Web App URL (`https://script.google.com/macros/s/.../exec`).
8. In `index.html`, open it and look for `JFS_CONFIG` at the bottom in the `<script>` tag:
   ```javascript
   const JFS_CONFIG = {
     googleSheetUrl: 'YOUR_COPIED_URL_HERE',
     whatsappNumber: '919714461172',
     businessName: 'Jangid Furniture Studio'
   };
   ```
9. That's it! Every lead from the website will automatically flow straight into your Google Sheet.

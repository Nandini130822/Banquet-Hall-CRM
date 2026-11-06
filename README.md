# Evara Banquet CRM (demo)

A CRM for Evara banquet hall, disguised as a calculator app (PWA).

## Unlock
Open the app. It works as a normal calculator. Type a staff code and press `=` to open the CRM:

| Staff | Code |
| --- | --- |
| Owner | `9-4` |
| Amit | `7+2` |
| Priya | `8×3` |

Codes are stored only as SHA-256 hashes in `app.js`. The CRM locks back to the calculator when the app is minimised or left idle for 3 minutes.

## Features
- Live hall availability (Hall 1, Hall 2, or both, full-day bookings) with double-booking protection
- Digital enquiry form matching the paper form, with duplicate-mobile check
- Leads from Meta ads and offline in one pipeline (New → Booked / Lost)
- Payments: package value, advances, balance due
- Month calendar, dashboard, Meta campaign performance, team stats, lost reasons
- "Demo: Meta lead" button simulates an incoming Meta lead

## Demo limitations
Data is stored in the browser (localStorage) with sample data. Live sync works between tabs on the same device. Production needs a shared database (e.g. Supabase), the Meta Lead Ads webhook and a WhatsApp API.

## Run
Static site, no build step. Serve the folder over HTTPS (e.g. Vercel, Netlify) so the PWA can be installed and the unlock works. Locally: `python3 -m http.server` and open http://localhost:8000.

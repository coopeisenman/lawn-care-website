# Westward Property Care — Website & Customer Portal

## Business details
- **Name:** Westward Property Care
- **Service area:** Millard, Papillion, Bellevue & Plattsmouth, Nebraska
- **Services:** Lawn Service (mowing & trimming), Leaf Cleanup, Snow Removal
- **Phone (call or text):** 402-202-7197
- **Free estimates**
- **Email:** not set up yet
- Owner is a new business owner and not a developer — explain steps plainly.

## Current state
- `index.html` is the live marketing site on GitHub Pages:
  https://coopeisenman.github.io/lawn-care-website/
- Design: deep green (#1f4d2c / #14321d) + sunset amber (#e9a23b), cream background (#faf7f0),
  Fraunces (headings) + Inter (body). Keep this look in the new app.
- No real customer reviews yet; do not invent any.

## Goal: custom app with customer portal + admin side (no monthly fees)

### Stack
- **Next.js** (App Router, TypeScript)
- **Supabase** — auth (email magic-link login) + Postgres database, with row-level security
  so customers only see their own data
- **Stripe** — Stripe Invoicing: Stripe emails the invoice and hosts the payment page
  (card + ACH). A webhook marks invoices paid in our database. Build entirely in **test mode** first.
- **Netlify** free tier for hosting (allows commercial use)
- Secrets go in environment variables only — never committed to the repo

### Phases
1. **Setup** — create Next.js app in this repo; port the current homepage design into it
2. **Database & logins** — tables: customers, properties, services (scheduled jobs; one-time or
   recurring), invoices, invoice line items. Roles: admin vs customer. RLS policies.
3. **Admin side** — manage customers & properties, schedule services, mark services completed,
   create an invoice from completed services, send it
4. **Payments** — Stripe invoice creation/sending, webhook → update invoice status
5. **Customer portal** — upcoming services, invoice history (paid/unpaid), Pay button → Stripe page
6. **Go live** — deploy to Netlify, switch Stripe to live mode, optional custom domain

### Accounts the owner still needs to create
- Supabase (project named `westward`)
- Stripe (test mode is fine to start)
- Netlify (sign up with GitHub)

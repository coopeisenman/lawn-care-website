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
- **Next.js** (App Router, TypeScript), deployed with the OpenNext Cloudflare adapter
- **Cloudflare Workers** — hosting (free plan allows commercial use). Auto-deploys from `main`
  via Workers Builds connected to GitHub.
- **Cloudflare D1** — database (SQLite). Access rules are enforced in app code: every
  customer-facing query is filtered to the logged-in customer's own records.
- **Logins** — email magic-link login handled by the app itself (planned: Better Auth on D1).
  Sending login emails needs an email provider and a domain the business owns.
- **Stripe** — Stripe Invoicing: Stripe emails the invoice and hosts the payment page
  (card + ACH). A webhook marks invoices paid in our database. Build entirely in **test mode** first.
- Secrets go in Cloudflare secrets / `.dev.vars` only — never committed to the repo

### Phases
1. **Setup** — create Next.js app in this repo; port the current homepage design into it;
   configure for Cloudflare Workers ✅
2. **Database & logins** — D1 tables: customers, properties, services (scheduled jobs; one-time or
   recurring), invoices, invoice line items. Roles: admin vs customer. Access checks in app code. ✅ built — owner password login,
   customer email-link login (emails switch on once a domain is set up)
3. **Admin side** — manage customers & properties, schedule services, mark services completed,
   create an invoice from completed services, send it. ✅ built (sending arrives with Stripe in Phase 4).
   Prices vary per yard: each visit has its own price, pre-filled from the last one at that property.
4. **Payments** — Stripe invoice creation/sending, webhook → update invoice status
5. **Customer portal** — upcoming services, invoice history (paid/unpaid), Pay button → Stripe page
6. **Go live** — switch Stripe to live mode, connect custom domain, retire GitHub Pages

### Accounts the owner still needs to create
- Cloudflare (free plan)
- Stripe (test mode is fine to start)
- A domain name (needed to send login emails; can be bought through Cloudflare)

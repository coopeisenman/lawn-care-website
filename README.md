# Westward Property Care

Website, customer portal and admin tools for Westward Property Care.
See `PROJECT_PLAN.md` for the full plan and phases.

## What's here

- `app/` — the pages of the site (`app/page.tsx` is the homepage)
- `components/` — reusable pieces (header, footer, quote form, logo)
- `lib/business.ts` — business name, phone and service areas in one place
- `app/globals.css` — colors and styles (change the colors at the top to re-theme)
- `index.html` — the original one-page site, still served by GitHub Pages until Cloudflare is live
- `wrangler.jsonc` — Cloudflare settings (no secrets in here)

## Running it on a computer (for developers)

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

To test the Cloudflare version locally: `npm run preview`. To deploy by hand: `npm run deploy`.

## Secrets

Never commit API keys. They go in a `.env.local` file (ignored by git) locally,
and in Cloudflare secrets in production. Local Cloudflare secrets go in `.dev.vars` (also ignored).

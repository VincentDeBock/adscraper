# AdScraper

A visual explorer for the **active Meta (Facebook/Instagram) ads** any company
is running. Search by **company name** or **Meta Page ID** and browse the
results as a gallery.

Powered by the official [Meta Ad Library API](https://www.facebook.com/ads/library/api/).
See [docs/ADR-001-data-source.md](docs/ADR-001-data-source.md) for the
architecture decision and the API's coverage/field limitations.

## Two known limits of the free official API

1. **No images/video.** The Ad Library API never returns ad creative media — it
   only exposes ad copy, destination URL, platforms, and dates. The creative
   lives on Meta's JS-rendered snapshot page and can't be scraped server-side.
   AdScraper therefore shows a rich text-forward card with a **"View ad ↗"**
   link that opens the real creative on Meta. (True in-app visuals would require
   a paid ad-intelligence API — Option C in the ADR.)
2. **Name search ≠ official brand.** Searching a name uses Meta's fuzzy text
   match, which surfaces *any* advertiser mentioning the term (resellers,
   dropshippers). Big brands' official pages often don't appear by name. For an
   exact brand, use **Search by Page ID** — find a page's ID on
   facebook.com/ads/library and paste it in.

## Stack

- **Frontend:** Vite + React (vanilla CSS, no UI framework)
- **Backend:** one Netlify Function (`netlify/functions/ads.js`) that proxies
  the Meta API and keeps the access token server-side
- **Hosting:** Netlify, auto-deployed from GitHub

## Demo mode

If `META_ACCESS_TOKEN` is **not** set, the app runs in **demo mode** and returns
realistic sample ads. This lets you deploy and click around before your Meta API
access is approved. Set the token to switch to live data — no code change needed.

## Local development

Run two processes (in two terminals):

```bash
npm install
npm run dev:fn       # terminal 1: runs the function locally on :9999
npm run dev          # terminal 2: vite dev server, proxies function calls to :9999
```

Open the vite URL (http://localhost:5173). With no token set you'll see demo
data. To test **live** data locally, set the token before starting `dev:fn`:

```bash
META_ACCESS_TOKEN=your_token_here npm run dev:fn
```

> Note: `npx netlify dev` also works but its SPA-redirect handling can intercept
> Vite's dev modules — the two-process approach above is the reliable local path.

## Deploy

1. Push this repo to GitHub.
2. In Netlify: **Add new site → Import from GitHub** → pick this repo.
   Build settings are read automatically from `netlify.toml`.
3. In **Site settings → Environment variables**, add:
   - `META_ACCESS_TOKEN` = your Meta Ad Library API token
4. Trigger a deploy. Done.

## Getting a Meta Ad Library API token

See [docs/META_TOKEN_SETUP.md](docs/META_TOKEN_SETUP.md).

# ADR-001: AdScraper — Data Source & Deployment Architecture

**Status:** Proposed
**Date:** 2026-05-30
**Deciders:** Vincent (owner), Claude (implementer)

## Context

We want a webapp ("AdScraper") that lets a user search by **company name** or
**Meta (Facebook/Instagram) account/page ID** and view that advertiser's
**currently active Meta ads**, presented visually (creative thumbnails, copy,
platforms, run dates).

The single decision that governs the entire build is **where the ad data comes
from**. Everything else (frontend, hosting) is conventional. Two forces dominate:

1. **Legality / Terms of Service.** Meta publishes ads via the official **Ad
   Library** (`facebook.com/ads/library`) and an official **Ad Library API**.
   Scraping the website violates Meta's ToS, gets IP-blocked quickly, and is
   especially fragile from serverless/cloud IPs (exactly what Netlify uses).
2. **Coverage limits of the official API.** The Ad Library API is the
   sanctioned path, but it has real constraints (below) that shape what
   "see all active ads" can actually mean.

### What the official Meta Ad Library API actually gives us

- Endpoint: `GET https://graph.facebook.com/v21.0/ads_archive`
- **Requires** a Meta developer app + access token, and the account must
  complete **identity confirmation** and be in a supported country.
- `ad_reached_countries` is **required** on every query.
- `ad_type=ALL` returns commercial ads, but with a **limited field set**: no
  spend/impressions/demographics (those exist only for
  `POLITICAL_AND_ISSUE_ADS`).
- For commercial ads you get: `id`, `page_id`, `page_name`,
  `ad_creative_bodies/titles/link_captions/descriptions`,
  `ad_delivery_start_time/stop_time`, `publisher_platforms`, and
  `ad_snapshot_url`.
- **Visual creative is not returned as a clean image URL.** The reliable visual
  is `ad_snapshot_url` — a Meta-hosted preview page (rendered in an iframe / new
  tab). We design the "visual" presentation around snapshot previews + extracted
  copy, not around guaranteed raw image/video URLs.
- Search by company is via `search_terms` (fuzzy) or `search_page_ids` (exact —
  this is the "Meta account ID" path and is far more accurate).

**Implication:** "all active ads for a company" is achievable and legal via the
API, but coverage is strongest for EU-targeted ads (DSA transparency rules) and
the richness is capped for commercial advertisers. We set that expectation in
the UI.

## Decision

Build **AdScraper as a static frontend + Netlify serverless function that proxies
the official Meta Ad Library API**, keeping the access token server-side. Search
supports both fuzzy company-name (`search_terms`) and exact page-ID
(`search_page_ids`). Ads are presented as a visual gallery using
`ad_snapshot_url` previews plus parsed creative copy, platform badges, and
active-since dates.

We explicitly **reject website scraping** as the primary mechanism.

## Options Considered

### Option A: Official Ad Library API via Netlify Function proxy  ✅ recommended
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low–Med |
| Cost | Free (Netlify free tier + free Meta API) |
| Scalability | Good (API rate limits apply, easily cached) |
| Legality | Fully compliant |
| Team familiarity | High (standard JAMstack) |

**Pros:** Legal & durable; no infra to babysit; token hidden in a function;
deploys cleanly to Netlify from GitHub; free.
**Cons:** Requires Meta app + identity verification (a few days of approval);
commercial-ad fields are limited; visual = snapshot preview, not raw media;
coverage skews EU.

### Option B: Headless-browser scraping of the Ad Library site
| Dimension | Assessment |
|-----------|------------|
| Complexity | High |
| Cost | Med–High (needs a persistent server + proxies) |
| Scalability | Poor |
| Legality | Violates Meta ToS |
| Team familiarity | Low |

**Pros:** Potentially richer raw creative; no API approval.
**Cons:** Breaks constantly; blocked from cloud IPs; **cannot run on Netlify**
(needs a long-running headless browser + rotating proxies); legal exposure. Not
recommended.

### Option C: Third-party ad-intelligence API (e.g. a paid SaaS data provider)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | High (subscription) |
| Scalability | Good |
| Legality | Provider's responsibility |
| Team familiarity | Med |

**Pros:** Richest data, often includes raw media + spend estimates; no scraping
on our side.
**Cons:** Ongoing cost; vendor lock-in; overkill for a personal tool.

## Trade-off Analysis

The real tension is **richness vs. legality/operability**. Option B looks
attractive for raw creative but is operationally untenable on the
GitHub→Netlify stack you have and is against ToS. Option C buys richness for
money. Option A is the only choice that is free, legal, and deployable
*independently* on your existing accounts — at the cost of accepting Meta's
field/coverage limits. For a tool you own and run yourself, A wins clearly.

## Consequences

- **Easier:** Zero-server deploy, free hosting, no scraping maintenance, secrets
  stay server-side, CI/CD via GitHub auto-deploy.
- **Harder:** We depend on Meta API approval (identity verification gate).
  Visual presentation is built around snapshot previews. Some advertisers/regions
  will show fewer or no results.
- **Revisit if:** you need raw media downloads, spend estimates, or non-EU
  commercial coverage at scale → reconsider Option C.

## Proposed Stack

- **Frontend:** Vite + React + Tailwind (fast, visual gallery, responsive).
- **Backend:** One Netlify Function (`/.netlify/functions/ads`) that holds
  `META_ACCESS_TOKEN`, calls `ads_archive`, normalizes results, handles paging.
- **Hosting:** Netlify, auto-deployed from a GitHub repo.
- **Caching:** Short-TTL in-function cache / Netlify edge cache to respect rate
  limits.

## Action Items
1. [ ] Confirm data-source decision (Option A).
2. [ ] You create a Meta developer app + complete Ad Library identity verification.
3. [ ] You provide the access token (set as Netlify env var, never committed).
4. [ ] I scaffold the React frontend + Netlify function.
5. [ ] Connect GitHub repo → Netlify project for auto-deploy.
6. [ ] Set `META_ACCESS_TOKEN` + default `ad_reached_countries` in Netlify env.
7. [ ] Ship + verify with a real advertiser search.

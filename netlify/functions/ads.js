// Netlify Function: proxy to the official Meta Ad Library API.
// The access token never reaches the browser — it lives only in this function's
// environment (set META_ACCESS_TOKEN in the Netlify dashboard).
//
// Two modes:
//   type=name    -> discover advertiser Pages matching the name (returns a
//                   picker list, so the user can choose the real brand and avoid
//                   ads from unrelated advertisers that merely mention the name)
//   type=page_id -> return the ACTIVE ads published by that exact Page, with
//                   creative thumbnails extracted from each ad's snapshot.
//
// If no token is configured, the function returns realistic demo data.

const GRAPH_VERSION = "v21.0";

// EU member states — used to expand the "All EU" region option.
const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
];

const AD_FIELDS = [
  "id",
  "page_id",
  "page_name",
  "ad_creative_bodies",
  "ad_creative_link_titles",
  "ad_creative_link_captions",
  "ad_creative_link_descriptions",
  "ad_delivery_start_time",
  "ad_delivery_stop_time",
  "ad_snapshot_url",
  "publisher_platforms",
].join(",");

export async function handler(event) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=300",
  };

  const { q = "", type = "name", country = "ALL_EU" } = event.queryStringParameters || {};

  if (!q.trim()) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing query." }) };
  }

  const token = process.env.META_ACCESS_TOKEN;
  const countries = country === "ALL_EU" ? EU_COUNTRIES : [country];

  // --- Demo mode (no token configured) ---
  if (!token) {
    if (type === "page_id") {
      return json(headers, { demo: true, mode: "ads", query: q, ads: demoAds(q) });
    }
    return json(headers, { demo: true, mode: "advertisers", query: q, advertisers: demoAdvertisers(q) });
  }

  try {
    if (type === "page_id") {
      const ads = await fetchAdsForPage(token, q.trim(), countries);
      return json(headers, { demo: false, mode: "ads", query: q, ads });
    }
    const advertisers = await discoverAdvertisers(token, q.trim(), countries);
    return json(headers, { demo: false, mode: "advertisers", query: q, advertisers });
  } catch (err) {
    if (err.metaError) {
      return json({ ...headers }, { error: `Meta API: ${err.metaError}` }, 502);
    }
    return json(headers, { error: `Failed to reach Meta API: ${err.message}` }, 500);
  }
}

function json(headers, obj, statusCode = 200) {
  return { statusCode, headers, body: JSON.stringify(obj) };
}

// ---------- Advertiser discovery (name search) ----------
async function discoverAdvertisers(token, query, countries) {
  const params = baseParams(token, countries, "100");
  params.set("search_terms", query);
  params.set("fields", "page_id,page_name");

  const data = await metaGet(params);

  const byPage = new Map();
  for (const ad of data.data || []) {
    if (!ad.page_id) continue;
    const entry = byPage.get(ad.page_id) || { pageId: ad.page_id, pageName: ad.page_name, count: 0 };
    entry.count += 1;
    byPage.set(ad.page_id, entry);
  }

  const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const nq = norm(query);

  return [...byPage.values()]
    .map((a) => {
      const np = norm(a.pageName);
      let score = a.count;
      if (np === nq) score += 100000;        // exact name match wins
      else if (np.startsWith(nq)) score += 50000;
      else if (np.includes(nq)) score += 10000;
      return { ...a, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map(({ score, ...a }) => a);
}

// ---------- Ads for a specific Page ----------
async function fetchAdsForPage(token, pageId, countries) {
  const params = baseParams(token, countries, "50");
  params.set("search_page_ids", JSON.stringify([pageId]));
  params.set("fields", AD_FIELDS);

  const data = await metaGet(params);
  return (data.data || []).map(normalizeAd);
}

function baseParams(token, countries, limit) {
  return new URLSearchParams({
    access_token: token,
    ad_reached_countries: JSON.stringify(countries),
    ad_active_status: "ACTIVE",
    ad_type: "ALL",
    limit,
  });
}

async function metaGet(params) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/ads_archive?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    const e = new Error(data.error.message || "request failed");
    e.metaError = data.error.message || "request failed";
    throw e;
  }
  return data;
}

function normalizeAd(ad) {
  return {
    id: ad.id,
    pageId: ad.page_id,
    pageName: ad.page_name,
    body: firstOf(ad.ad_creative_bodies),
    title: firstOf(ad.ad_creative_link_titles),
    caption: firstOf(ad.ad_creative_link_captions),
    description: firstOf(ad.ad_creative_link_descriptions),
    startTime: ad.ad_delivery_start_time,
    stopTime: ad.ad_delivery_stop_time,
    platforms: ad.publisher_platforms || [],
    snapshotUrl: ad.ad_snapshot_url,
    // Public Ad Library page for this ad — works without a token in the browser.
    viewUrl: `https://www.facebook.com/ads/library/?id=${ad.id}`,
    thumbnailUrl: null,
  };
}

function firstOf(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : null;
}

// ---------- Demo data ----------
function demoAdvertisers(query) {
  const brand = /^\d+$/.test(query) ? "Demo Brand" : capitalize(query);
  return [
    { pageId: "1001", pageName: brand, count: 42 },
    { pageId: "1002", pageName: `${brand} Store`, count: 8 },
    { pageId: "1003", pageName: `${brand} Official`, count: 5 },
  ];
}

function demoAds(query) {
  const brand = /^\d+$/.test(query) ? "Demo Brand" : capitalize(query);
  const platforms = [
    ["facebook", "instagram"],
    ["instagram"],
    ["facebook", "instagram", "audience_network"],
    ["facebook"],
    ["instagram", "messenger"],
    ["facebook", "instagram"],
  ];
  const copies = [
    `Summer sale is live — up to 40% off everything at ${brand}. Limited time only.`,
    `Meet the new collection from ${brand}. Designed for everyday. Shop now.`,
    `Join thousands who switched to ${brand}. Free shipping on your first order.`,
    `${brand} — built different. Discover why customers can't stop talking about it.`,
    `Last chance: ${brand} members get early access. Sign up today.`,
    `The ${brand} app is here. Track, shop, and save — all in one place.`,
  ];
  return copies.map((body, i) => ({
    id: `demo-${i}`,
    pageId: "1001",
    pageName: brand,
    body,
    title: null,
    caption: null,
    description: null,
    startTime: new Date(Date.now() - (i + 1) * 6 * 86400000).toISOString(),
    stopTime: null,
    platforms: platforms[i],
    snapshotUrl: "https://www.facebook.com/ads/library/",
    viewUrl: "https://www.facebook.com/ads/library/",
    thumbnailUrl: null,
  }));
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

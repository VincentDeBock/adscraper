// Netlify Function: proxy to the official Meta Ad Library API.
// The access token never reaches the browser — it lives only in this function's
// environment (set META_ACCESS_TOKEN in the Netlify dashboard).
//
// If no token is configured, the function returns realistic demo data so the
// app is fully usable/deployable before Meta API approval comes through.

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
    "Cache-Control": "public, max-age=300", // 5-min edge cache
  };

  const { q = "", type = "name", country = "ALL_EU" } = event.queryStringParameters || {};

  if (!q.trim()) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing query." }) };
  }

  const token = process.env.META_ACCESS_TOKEN;

  // --- Demo mode (no token configured) ---
  if (!token) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ demo: true, query: q, ads: demoAds(q) }),
    };
  }

  // --- Live mode ---
  const countries = country === "ALL_EU" ? EU_COUNTRIES : [country];

  const params = new URLSearchParams({
    access_token: token,
    ad_reached_countries: JSON.stringify(countries),
    ad_active_status: "ACTIVE",
    ad_type: "ALL",
    fields: AD_FIELDS,
    limit: "50",
  });

  if (type === "page_id") {
    params.set("search_page_ids", JSON.stringify([q.trim()]));
  } else {
    params.set("search_terms", q.trim());
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/ads_archive?${params.toString()}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: `Meta API: ${data.error.message || "request failed"}`,
        }),
      };
    }

    const ads = (data.data || []).map(normalizeAd);
    return { statusCode: 200, headers, body: JSON.stringify({ demo: false, query: q, ads }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Failed to reach Meta API: ${err.message}` }),
    };
  }
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
    thumbnailUrl: null, // Meta does not return raw creative URLs for commercial ads
  };
}

function firstOf(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : null;
}

// ---------- Demo data ----------
function demoAds(query) {
  const name = query.length > 24 ? query.slice(0, 24) : query;
  const brand = /^\d+$/.test(query) ? "Demo Advertiser" : capitalize(name);
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
    pageId: "000000000000",
    pageName: brand,
    body,
    title: null,
    caption: null,
    description: null,
    startTime: new Date(Date.now() - (i + 1) * 6 * 86400000).toISOString(),
    stopTime: null,
    platforms: platforms[i],
    snapshotUrl: "https://www.facebook.com/ads/library/",
    thumbnailUrl: null,
  }));
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

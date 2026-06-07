// Extracts the REAL creative (image or playable video) for an ad by loading
// Meta's PUBLIC Ad Library page in a stealth headless browser.
//
// Why a headless browser: Meta serves plain server requests an anti-bot JS
// challenge (and render_ad demands login). A real browser with stealth solves
// the challenge, the page's JS runs, and the creative loads from fbcdn — we
// read the image/video URL straight from the DOM. Those fbcdn URLs are signed
// and load directly in <img>/<video> from any browser (they expire in hours,
// so responses are cached only briefly).
//
// Works locally (system Chrome) and on Netlify (Lambda Chromium).

import { addExtra } from "puppeteer-extra";
import puppeteerCore from "puppeteer-core";
import Stealth from "puppeteer-extra-plugin-stealth";
import chromium from "@sparticuz/chromium";

const puppeteer = addExtra(puppeteerCore);
puppeteer.use(Stealth());

const isLambda = !!(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
const LOCAL_CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

let browserPromise = null;
async function getBrowser() {
  if (browserPromise) {
    const b = await browserPromise;
    if (b.connected) return b;
    browserPromise = null;
  }
  browserPromise = puppeteer.launch(
    isLambda
      ? {
          args: [...chromium.args, "--disable-blink-features=AutomationControlled"],
          defaultViewport: { width: 800, height: 900 },
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        }
      : {
          args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
          defaultViewport: { width: 800, height: 900 },
          executablePath: LOCAL_CHROME,
          headless: true,
        }
  );
  return browserPromise;
}

// Runs in the page: pull the ad creative (video preferred), excluding the
// advertiser's profile picture and cropped thumbnails.
const EXTRACT = () => {
  const v = document.querySelector("video");
  if (v && (v.src || v.poster)) {
    return {
      type: "video",
      video: v.src && !v.src.startsWith("blob:") ? v.src : null,
      poster: v.poster || null,
    };
  }
  const imgs = [...document.querySelectorAll("img")]
    .map((i) => ({ u: i.src, w: i.naturalWidth || 0, h: i.naturalHeight || 0 }))
    .filter((i) => /fbcdn|cdninstagram/.test(i.u) && !/static\./.test(i.u))
    .filter((i) => !/t39\.30808|s60x60|p\d+x\d+|_s\.|spS\d/.test(i.u))
    .filter((i) => i.w >= 240)
    .sort((a, b) => b.w * b.h - a.w * a.h);
  return imgs[0] ? { type: "image", image: imgs[0].u, poster: imgs[0].u } : null;
};

export async function handler(event) {
  const id = (event.queryStringParameters?.id || "").trim();
  let country = (event.queryStringParameters?.country || "ALL").trim();
  if (country === "ALL_EU") country = "ALL";

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (!/^\d+$/.test(id)) {
    return { statusCode: 404, headers: { ...headers, "Cache-Control": "no-store" }, body: JSON.stringify({ error: "bad id" }) };
  }

  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Capture fbcdn video bytes seen on the network (fallback if the <video>
    // element uses a blob: src we can't read).
    const netVideos = [];
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      (r.resourceType() === "font" ? r.abort() : r.continue()).catch(() => {});
    });
    page.on("response", (r) => {
      const u = r.url();
      if (/video[\w.-]*\.fbcdn|cdninstagram/.test(u) && /\.mp4/.test(u)) netVideos.push(u);
    });

    const url = `https://www.facebook.com/ads/library/?id=${id}&country=${encodeURIComponent(country)}&active_status=all&ad_type=all`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    await sleep(1500); // let the anti-bot reload + render settle

    let media = null;
    for (let i = 0; i < 22; i++) {
      try {
        const m = await page.evaluate(EXTRACT);
        if (m && (m.video || m.image || m.poster)) {
          media = m;
          if (m.type === "video" || m.type === "image") break;
        }
      } catch {
        /* page navigated (challenge reload) — retry */
      }
      await sleep(200);
    }

    await page.close();

    if (media && media.type === "video" && !media.video) {
      media.video = netVideos[0] || null;
    }
    if (!media || (!media.video && !media.image && !media.poster)) {
      return { statusCode: 204, headers: { ...headers, "Cache-Control": "no-store" }, body: JSON.stringify({ id }) };
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Cache-Control": "public, max-age=3600",
        "Netlify-CDN-Cache-Control": "public, durable, max-age=10800",
      },
      body: JSON.stringify({ id, ...media }),
    };
  } catch (err) {
    if (page) await page.close().catch(() => {});
    return { statusCode: 502, headers: { ...headers, "Cache-Control": "no-store" }, body: JSON.stringify({ error: err.message }) };
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

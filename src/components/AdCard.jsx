import { useState } from "react";

const PLATFORM_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  audience_network: "Audience Network",
  messenger: "Messenger",
  threads: "Threads",
};

// Deterministic gradient per ad so fallbacks look varied but stable.
const GRADIENTS = [
  ["#4f8cff", "#7b5cff"],
  ["#ff6b6b", "#ff9472"],
  ["#2bd576", "#1f9e9e"],
  ["#f5a623", "#f76b1c"],
  ["#a06bff", "#ff6bcb"],
  ["#19c8ff", "#4f8cff"],
];

function gradientFor(id) {
  let h = 0;
  for (let i = 0; i < (id || "").length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

// Build the screenshot URL for a real (non-demo) ad. thum.io renders Meta's
// snapshot (via our token-injecting /render redirect) and returns a PNG.
function screenshotUrl(adId) {
  if (!adId || String(adId).startsWith("demo")) return null;
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const target = `${origin}/.netlify/functions/render?id=${adId}`;
  return `https://image.thum.io/get/width/600/wait/8/noanimate/${target}`;
}

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function daysActive(iso) {
  if (!iso) return null;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return null;
  const days = Math.floor((Date.now() - start) / 86400000);
  return days >= 0 ? days : null;
}

export function AdCard({ ad }) {
  const [imgFailed, setImgFailed] = useState(false);
  const started = formatDate(ad.startTime);
  const days = daysActive(ad.startTime);
  const [c1, c2] = gradientFor(ad.id);
  const headline = ad.title || ad.body || "";
  const shot = screenshotUrl(ad.id);
  const showShot = shot && !imgFailed;

  return (
    <article className="card">
      <div
        className="card-hero"
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      >
        {showShot && (
          <img
            className="card-shot"
            src={shot}
            alt={`Ad creative from ${ad.pageName || "advertiser"}`}
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        )}
        {days != null && <span className="badge-active">● Active {days}d</span>}
        {!showShot && (
          <>
            <p className="card-hero-text">{truncate(headline, 120)}</p>
            {ad.caption && <span className="card-hero-url">{ad.caption}</span>}
          </>
        )}
      </div>

      <div className="card-body">
        <div className="card-page">{ad.pageName || "Unknown advertiser"}</div>
        {ad.body && <p className="card-copy">{ad.body}</p>}

        <div className="card-platforms">
          {(ad.platforms || []).map((p) => (
            <span className="chip" key={p}>
              {PLATFORM_LABELS[p] || p}
            </span>
          ))}
        </div>

        <div className="card-foot">
          {started && <span className="card-date">Since {started}</span>}
          {(ad.viewUrl || ad.snapshotUrl) && (
            <a
              className="card-link"
              href={ad.viewUrl || ad.snapshotUrl}
              target="_blank"
              rel="noreferrer"
            >
              View ad ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

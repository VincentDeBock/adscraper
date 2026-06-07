import { useState, useEffect, useRef } from "react";

const PLATFORM_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  audience_network: "Audience Network",
  messenger: "Messenger",
  threads: "Threads",
};

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

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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

// Lazily fetch the real creative (image/video) only when the card scrolls into
// view, so we don't hammer the headless renderer for off-screen ads.
function useAdMedia(ad) {
  const ref = useRef(null);
  const [state, setState] = useState({ status: "idle", media: null });

  useEffect(() => {
    if (!ad.id || String(ad.id).startsWith("demo")) return;
    const el = ref.current;
    if (!el) return;
    let done = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !done) {
          done = true;
          io.disconnect();
          setState({ status: "loading", media: null });
          const params = new URLSearchParams({ id: ad.id, country: ad.country || "ALL" });
          fetch(`/.netlify/functions/media?${params}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((m) => {
              if (m && (m.video || m.image || m.poster)) setState({ status: "done", media: m });
              else setState({ status: "failed", media: null });
            })
            .catch(() => setState({ status: "failed", media: null }));
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ad.id, ad.country]);

  return { ref, ...state };
}

export function AdCard({ ad }) {
  const { ref, status, media } = useAdMedia(ad);
  const [mediaError, setMediaError] = useState(false);
  const started = formatDate(ad.startTime);
  const days = daysActive(ad.startTime);
  const [c1, c2] = gradientFor(ad.id);
  const headline = ad.title || ad.body || "";

  const hasVideo = media?.video && !mediaError;
  const hasImage = !hasVideo && (media?.image || media?.poster) && !mediaError;
  const showFallback = !hasVideo && !hasImage;

  return (
    <article className="card" ref={ref}>
      <div className="card-hero" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
        {hasVideo && (
          <video
            className="card-shot"
            src={media.video}
            poster={media.poster || undefined}
            controls
            preload="none"
            playsInline
            onError={() => setMediaError(true)}
          />
        )}
        {hasImage && (
          <img
            className="card-shot"
            src={media.image || media.poster}
            alt={`Ad creative from ${ad.pageName || "advertiser"}`}
            loading="lazy"
            onError={() => setMediaError(true)}
          />
        )}
        {days != null && <span className="badge-active">● Active {days}d</span>}
        {status === "loading" && <span className="badge-loading">Loading creative…</span>}
        {showFallback && (
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
            <a className="card-link" href={ad.viewUrl || ad.snapshotUrl} target="_blank" rel="noreferrer">
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

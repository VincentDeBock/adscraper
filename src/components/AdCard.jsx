const PLATFORM_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  audience_network: "Audience Network",
  messenger: "Messenger",
  threads: "Threads",
};

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
  const started = formatDate(ad.startTime);
  const days = daysActive(ad.startTime);
  const body = ad.body || "";

  return (
    <article className="card">
      <div className="card-media">
        {ad.thumbnailUrl ? (
          <img src={ad.thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <div className="card-media-placeholder">
            <span>{(ad.pageName || "?").slice(0, 1).toUpperCase()}</span>
          </div>
        )}
        {days != null && (
          <span className="badge-active">● Active {days}d</span>
        )}
      </div>

      <div className="card-body">
        <div className="card-page">{ad.pageName || "Unknown advertiser"}</div>
        {body && <p className="card-copy">{body}</p>}

        <div className="card-platforms">
          {(ad.platforms || []).map((p) => (
            <span className="chip" key={p}>
              {PLATFORM_LABELS[p] || p}
            </span>
          ))}
        </div>

        <div className="card-foot">
          {started && <span className="card-date">Since {started}</span>}
          {ad.snapshotUrl && (
            <a
              className="card-link"
              href={ad.snapshotUrl}
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

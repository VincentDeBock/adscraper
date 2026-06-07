export function AdvertiserPicker({ advertisers, query, onSelect }) {
  if (!advertisers || advertisers.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">🫥</div>
        <h2>No advertisers found</h2>
        <p>
          No advertisers matching “{query}” are running active ads in this region.
          Try a different spelling, region, or search by Page ID.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="results-meta">
        <span>
          Select the advertiser for <strong>“{query}”</strong> to see only their
          ads:
        </span>
      </div>
      <div className="advertiser-grid">
        {advertisers.map((a) => (
          <button
            key={a.pageId}
            className="advertiser-card"
            onClick={() => onSelect(a)}
          >
            <div className="advertiser-avatar">
              {(a.pageName || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="advertiser-info">
              <div className="advertiser-name">{a.pageName || "Unknown Page"}</div>
              <div className="advertiser-meta">
                {a.count}+ active ad{a.count === 1 ? "" : "s"} · ID {a.pageId}
              </div>
            </div>
            <span className="advertiser-arrow">→</span>
          </button>
        ))}
      </div>
    </>
  );
}

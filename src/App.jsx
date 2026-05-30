import { useState, useCallback } from "react";
import { AdCard } from "./components/AdCard.jsx";
import { SearchBar } from "./components/SearchBar.jsx";

const FUNCTION_URL = "/.netlify/functions/ads";

export default function App() {
  const [ads, setAds] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null); // { demo, query, country }
  const [lastQuery, setLastQuery] = useState(null);

  const search = useCallback(async ({ query, searchType, country }) => {
    if (!query.trim()) return;
    setStatus("loading");
    setError(null);
    setAds([]);
    setLastQuery({ query, searchType, country });

    const params = new URLSearchParams({
      q: query.trim(),
      type: searchType, // "name" | "page_id"
      country,
    });

    try {
      const res = await fetch(`${FUNCTION_URL}?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setAds(data.ads || []);
      setMeta({ demo: data.demo, query, country });
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }, []);

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-inner">
          <div className="brand">
            <span className="brand-mark">◎</span>
            <h1>AdScraper</h1>
          </div>
          <p className="tagline">
            See the active Meta ads any company is running right now. Search by
            company name or Meta Page ID.
          </p>
          <SearchBar onSearch={search} loading={status === "loading"} />
        </div>
      </header>

      <main className="results">
        {meta?.demo && (
          <div className="banner banner-demo">
            <strong>Demo mode.</strong> Showing sample data because no Meta API
            token is configured yet. Add <code>META_ACCESS_TOKEN</code> in
            Netlify to see live ads.
          </div>
        )}

        {status === "idle" && (
          <EmptyState
            icon="🔍"
            title="Search for an advertiser"
            text="Try a brand name like “Nike”, or paste a Meta Page ID for exact results."
          />
        )}

        {status === "loading" && (
          <div className="grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="card skeleton" key={i} />
            ))}
          </div>
        )}

        {status === "error" && (
          <EmptyState
            icon="⚠️"
            title="Something went wrong"
            text={error}
            tone="error"
          />
        )}

        {status === "done" && ads.length === 0 && (
          <EmptyState
            icon="🫥"
            title="No active ads found"
            text={`No active ads for “${lastQuery?.query}” in the selected region. Try a different name, region, or the exact Page ID.`}
          />
        )}

        {status === "done" && ads.length > 0 && (
          <>
            <div className="results-meta">
              <span>
                <strong>{ads.length}</strong> active ad
                {ads.length === 1 ? "" : "s"} for{" "}
                <strong>“{meta.query}”</strong>
              </span>
            </div>
            <div className="grid">
              {ads.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="footer">
        <p>
          Data via the official{" "}
          <a
            href="https://www.facebook.com/ads/library/api/"
            target="_blank"
            rel="noreferrer"
          >
            Meta Ad Library API
          </a>
          . Coverage and fields are limited by Meta's transparency rules.
        </p>
      </footer>
    </div>
  );
}

function EmptyState({ icon, title, text, tone }) {
  return (
    <div className={`empty ${tone === "error" ? "empty-error" : ""}`}>
      <div className="empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

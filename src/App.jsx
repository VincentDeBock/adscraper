import { useState, useCallback } from "react";
import { AdCard } from "./components/AdCard.jsx";
import { AdvertiserPicker } from "./components/AdvertiserPicker.jsx";
import { SearchBar } from "./components/SearchBar.jsx";

const FUNCTION_URL = "/.netlify/functions/ads";

export default function App() {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState(null);
  const [demo, setDemo] = useState(false);

  // Result can be a list of advertisers (name search) or a list of ads (page search).
  const [mode, setMode] = useState(null); // "advertisers" | "ads"
  const [advertisers, setAdvertisers] = useState([]);
  const [ads, setAds] = useState([]);

  const [lastQuery, setLastQuery] = useState(null); // { label, country }
  const [country, setCountry] = useState("ALL_EU");

  const run = useCallback(async ({ q, type, country: c, label }) => {
    setStatus("loading");
    setError(null);
    setAdvertisers([]);
    setAds([]);
    setCountry(c);
    setLastQuery({ label: label || q, country: c });

    const params = new URLSearchParams({ q, type, country: c });
    try {
      const res = await fetch(`${FUNCTION_URL}?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setDemo(!!data.demo);
      setMode(data.mode);
      if (data.mode === "ads") setAds((data.ads || []).map((a) => ({ ...a, country: c })));
      else setAdvertisers(data.advertisers || []);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }, []);

  // From the search bar.
  const search = useCallback(
    ({ query, searchType, country: c }) => {
      if (!query.trim()) return;
      run({ q: query.trim(), type: searchType, country: c });
    },
    [run]
  );

  // From clicking an advertiser in the picker.
  const selectAdvertiser = useCallback(
    (advertiser) => {
      run({ q: advertiser.pageId, type: "page_id", country, label: advertiser.pageName });
    },
    [run, country]
  );

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-inner">
          <div className="brand">
            <span className="brand-mark">◎</span>
            <h1>AdScraper</h1>
          </div>
          <p className="tagline">
            See the active Meta ads any company is running right now. Search a
            brand, pick the advertiser, and view only their ads.
          </p>
          <SearchBar onSearch={search} loading={status === "loading"} />
        </div>
      </header>

      <main className="results">
        {demo && (
          <div className="banner banner-demo">
            <strong>Demo mode.</strong> Showing sample data because no Meta API
            token is configured. Add <code>META_ACCESS_TOKEN</code> in Netlify to
            see live ads.
          </div>
        )}

        {status === "idle" && (
          <EmptyState
            icon="🔍"
            title="Search for an advertiser"
            text="Type a brand name like “Nike”, then pick the official advertiser to see only their ads."
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
          <EmptyState icon="⚠️" title="Something went wrong" text={error} tone="error" />
        )}

        {status === "done" && mode === "advertisers" && (
          <AdvertiserPicker
            advertisers={advertisers}
            query={lastQuery?.label}
            onSelect={selectAdvertiser}
          />
        )}

        {status === "done" && mode === "ads" && (
          <>
            <div className="results-meta">
              {ads.length > 0 ? (
                <span>
                  <strong>{ads.length}</strong> active ad{ads.length === 1 ? "" : "s"} from{" "}
                  <strong>{ads[0]?.pageName || lastQuery?.label}</strong>
                </span>
              ) : (
                <span>
                  No active ads from <strong>{lastQuery?.label}</strong> in this region.
                </span>
              )}
            </div>
            {ads.length === 0 ? (
              <EmptyState
                icon="🫥"
                title="No active ads found"
                text="This advertiser has no active ads in the selected region right now. Try another region."
              />
            ) : (
              <div className="grid">
                {ads.map((ad) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <p>
          Data via the official{" "}
          <a href="https://www.facebook.com/ads/library/api/" target="_blank" rel="noreferrer">
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

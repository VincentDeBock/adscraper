import { useState } from "react";

// Common EU countries + a few majors. EU-wide is the default per project setup.
const COUNTRIES = [
  { code: "ALL_EU", label: "🇪🇺 All EU" },
  { code: "NL", label: "🇳🇱 Netherlands" },
  { code: "BE", label: "🇧🇪 Belgium" },
  { code: "DE", label: "🇩🇪 Germany" },
  { code: "FR", label: "🇫🇷 France" },
  { code: "ES", label: "🇪🇸 Spain" },
  { code: "IT", label: "🇮🇹 Italy" },
  { code: "GB", label: "🇬🇧 United Kingdom" },
  { code: "US", label: "🇺🇸 United States" },
];

export function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("name");
  const [country, setCountry] = useState("ALL_EU");

  const submit = (e) => {
    e.preventDefault();
    onSearch({ query, searchType, country });
  };

  return (
    <form className="searchbar" onSubmit={submit}>
      <div className="search-row">
        <input
          className="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            searchType === "name"
              ? "Company name, e.g. Nike"
              : "Meta Page ID, e.g. 15087023444"
          }
          aria-label="Search query"
          autoFocus
        />
        <button className="search-btn" type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search ads"}
        </button>
      </div>

      <div className="search-controls">
        <div className="segmented" role="tablist" aria-label="Search by">
          <button
            type="button"
            className={searchType === "name" ? "seg active" : "seg"}
            onClick={() => setSearchType("name")}
          >
            By name
          </button>
          <button
            type="button"
            className={searchType === "page_id" ? "seg active" : "seg"}
            onClick={() => setSearchType("page_id")}
          >
            By Page ID
          </button>
        </div>

        <label className="country-select">
          <span>Region</span>
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </form>
  );
}

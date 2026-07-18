"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export default function TickerSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/dcf/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  function goToTicker(ticker: string) {
    router.push(`/dcf/${encodeURIComponent(ticker.toUpperCase())}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) goToTicker(query.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="relative mb-10">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Søk selskap eller skriv ticker, f.eks. EQNR.OL"
        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
      />
      {query.trim().length >= 2 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
          {loading && <div className="px-3 py-2 text-sm text-zinc-400">Søker …</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-zinc-400">
              Ingen treff — trykk Enter for å bruke &ldquo;{query}&rdquo; som ticker
            </div>
          )}
          {results.map((r) => (
            <button
              type="button"
              key={r.symbol}
              onClick={() => goToTicker(r.symbol)}
              className="w-full text-left px-3 py-2 hover:bg-zinc-50 transition-colors flex items-center justify-between gap-4"
            >
              <span className="text-zinc-900 font-medium truncate">{r.name}</span>
              <span className="font-mono text-xs text-zinc-400 shrink-0">{r.symbol}</span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}

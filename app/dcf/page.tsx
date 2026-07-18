"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OSLO_BORS_TICKERS } from "@/lib/tickers";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export default function DcfPickerPage() {
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
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2 tracking-tight">DCF-verdsettelse</h1>
        <p className="text-zinc-500 leading-relaxed">
          Skriv inn en ticker og juster forutsetningene selv — vekst, diskonteringsrente og terminalvekst.
        </p>
      </div>

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

      <h2 className="text-sm font-medium text-zinc-500 mb-3 uppercase tracking-wider">Oslo Børs</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {OSLO_BORS_TICKERS.map((t) => (
          <Link
            key={t.ticker}
            href={`/dcf/${t.ticker}`}
            className="px-3 py-2 rounded-lg border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-colors text-sm"
          >
            <span className="text-zinc-900 font-medium">{t.name}</span>
            <span className="text-zinc-400 font-mono text-xs block">{t.ticker}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

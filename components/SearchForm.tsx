"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  symbol: string;
  name: string;
  exchangeShortName: string;
}

export default function SearchForm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setResults(data);
          setShowDropdown(data.length > 0);
        }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim().toUpperCase();
    if (trimmed) {
      router.push(`/analyse/${trimmed}`);
      setShowDropdown(false);
    }
  }

  function selectTicker(symbol: string) {
    setQuery(symbol);
    setShowDropdown(false);
    router.push(`/analyse/${symbol}`);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Ticker (f.eks. EQNR.OL) eller selskapsnavn..."
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-base"
            autoComplete="off"
            spellCheck={false}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button
          type="submit"
          className="px-5 py-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-700 transition-colors text-base"
        >
          Analyser
        </button>
      </form>

      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => selectTicker(r.symbol)}
              className="w-full text-left px-4 py-3 hover:bg-zinc-50 flex items-center justify-between border-b border-zinc-100 last:border-0 transition-colors"
            >
              <span className="font-medium text-zinc-900">{r.symbol}</span>
              <span className="text-zinc-500 text-sm ml-3 truncate">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

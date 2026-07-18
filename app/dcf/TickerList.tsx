"use client";

import { useState } from "react";
import Link from "next/link";
import type { DefaultValuation } from "@/lib/dcf";

interface TickerValuation {
  ticker: string;
  name: string;
  valuation: DefaultValuation | null;
}

type Filter = "all" | "under" | "over";

function filterButtonClass(active: boolean): string {
  return active
    ? "px-3 py-1.5 rounded-full bg-zinc-900 text-white text-xs font-medium"
    : "px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-500 text-xs font-medium hover:border-zinc-300 transition-colors";
}

export default function TickerList({ tickers }: { tickers: TickerValuation[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const underCount = tickers.filter((t) => t.valuation && t.valuation.diffPct >= 0).length;
  const overCount = tickers.filter((t) => t.valuation && t.valuation.diffPct < 0).length;

  const filtered = tickers.filter((t) => {
    if (filter === "under") return t.valuation && t.valuation.diffPct >= 0;
    if (filter === "over") return t.valuation && t.valuation.diffPct < 0;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!a.valuation && !b.valuation) return 0;
    if (!a.valuation) return 1;
    if (!b.valuation) return -1;
    return b.valuation.diffPct - a.valuation.diffPct;
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => setFilter("all")} className={filterButtonClass(filter === "all")}>
          Alle ({tickers.length})
        </button>
        <button onClick={() => setFilter("under")} className={filterButtonClass(filter === "under")}>
          Undervurdert ({underCount})
        </button>
        <button onClick={() => setFilter("over")} className={filterButtonClass(filter === "over")}>
          Overvurdert ({overCount})
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-zinc-400 text-sm py-8 text-center">Ingen selskaper i denne kategorien.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {sorted.map((t) => (
            <Link
              key={t.ticker}
              href={`/dcf/${t.ticker}`}
              className="px-3 py-2 rounded-lg border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-colors text-sm"
            >
              <span className="text-zinc-900 font-medium">{t.name}</span>
              <span className="text-zinc-400 font-mono text-xs block mb-1">{t.ticker}</span>
              {t.valuation ? (
                <span
                  className={
                    t.valuation.diffPct >= 0
                      ? "text-emerald-600 text-xs font-medium"
                      : "text-red-500 text-xs font-medium"
                  }
                >
                  {t.valuation.diffPct >= 0 ? "Undervurdert" : "Overvurdert"}{" "}
                  {Math.abs(t.valuation.diffPct * 100).toFixed(0)}%
                </span>
              ) : (
                <span className="text-zinc-300 text-xs">Ingen data</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

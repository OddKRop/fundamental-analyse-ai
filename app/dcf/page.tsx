import Link from "next/link";
import { OSLO_BORS_TICKERS } from "@/lib/tickers";
import { fetchFundamentalData } from "@/lib/yahoo";
import { computeDefaultValuation, type DefaultValuation } from "@/lib/dcf";
import TickerSearch from "./TickerSearch";

export const revalidate = 3600; // 1 time — unngå å kalle Yahoo Finance for alle tickere på hvert besøk

async function getValuation(ticker: string): Promise<DefaultValuation | null> {
  try {
    const data = await fetchFundamentalData(ticker);
    return computeDefaultValuation(data);
  } catch {
    return null;
  }
}

export default async function DcfPickerPage() {
  const valuations = await Promise.all(
    OSLO_BORS_TICKERS.map(async (t) => ({ ...t, valuation: await getValuation(t.ticker) }))
  );

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2 tracking-tight">DCF-verdsettelse</h1>
        <p className="text-zinc-500 leading-relaxed">
          Skriv inn en ticker og juster forutsetningene selv — vekst, diskonteringsrente og terminalvekst.
        </p>
      </div>

      <TickerSearch />

      <h2 className="text-sm font-medium text-zinc-500 mb-3 uppercase tracking-wider">Oslo Børs</h2>
      <p className="text-xs text-zinc-400 mb-4">
        Over-/undervurdert er regnet ut med standardforutsetninger (8 % vekst, 5 år, 2,5 % terminalvekst) —
        klikk inn for å justere selv.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {valuations.map((t) => (
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
    </div>
  );
}

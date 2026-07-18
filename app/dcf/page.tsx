import { DCF_TICKERS } from "@/lib/dcfTickers";
import { fetchFundamentalData } from "@/lib/yahoo";
import { computeDefaultValuation, type DefaultValuation } from "@/lib/dcf";
import TickerSearch from "./TickerSearch";
import TickerList from "./TickerList";

export const revalidate = 3600; // 1 time — unngå å kalle Yahoo Finance for alle tickere på hvert besøk

async function getValuation(ticker: string): Promise<DefaultValuation | null> {
  try {
    const data = await fetchFundamentalData(ticker);
    return computeDefaultValuation(data);
  } catch {
    return null;
  }
}

/**
 * Kjører fn over items med maks `concurrency` samtidig — Yahoo Finance rate-limiter
 * aggressivt ved store, ubegrensede parallelle kall (verifisert: 40 samtidige kall uten
 * throttling feilet 100 %, med begrenset samtidighet fungerte det fint).
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export default async function DcfPickerPage() {
  const valuations = await mapWithConcurrency(DCF_TICKERS, 4, async (t) => ({
    ...t,
    valuation: await getValuation(t.ticker),
  }));

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2 tracking-tight">DCF-verdsettelse</h1>
        <p className="text-zinc-500 leading-relaxed">
          Skriv inn en ticker og juster forutsetningene selv — vekst, diskonteringsrente og terminalvekst.
        </p>
      </div>

      <TickerSearch />

      <h2 className="text-sm font-medium text-zinc-500 mb-1 uppercase tracking-wider">
        Oslo Børs ({DCF_TICKERS.length} selskaper)
      </h2>
      <p className="text-xs text-zinc-400 mb-4">
        Over-/undervurdert er regnet ut med standardforutsetninger (8 % vekst, 5 år, 2,5 % terminalvekst) —
        klikk inn for å justere selv.
      </p>

      <TickerList tickers={valuations} />
    </div>
  );
}

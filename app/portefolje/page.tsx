import Link from "next/link";
import { getHoldings } from "@/lib/portfolio/db";
import { enrichHoldings, exposureBySector, exposureByCountry, portfolioTotals } from "@/lib/portfolio/analysis";
import HoldingsManager from "./HoldingsManager";

export const dynamic = "force-dynamic";

function formatKr(n: number, currency = "NOK"): string {
  return `${Math.round(n).toLocaleString("no-NO")} ${currency}`;
}

export default async function PortfolioPage() {
  const holdings = await getHoldings();
  const enriched = await enrichHoldings(holdings);
  const totals = portfolioTotals(enriched);
  const sectors = exposureBySector(enriched);
  const countries = exposureByCountry(enriched);

  return (
    <div>
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2 tracking-tight">Portefølje</h1>
          <p className="text-zinc-500 leading-relaxed">Hva er du eksponert for?</p>
        </div>
        <Link
          href="/portefolje/import"
          className="text-sm text-zinc-500 hover:text-zinc-900 underline underline-offset-2 shrink-0 mt-1"
        >
          + Importer CSV
        </Link>
      </div>

      {enriched.length > 0 && (
        <>
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
              Totalt
            </h2>
            <div className="flex flex-wrap gap-6 text-sm">
              <span className="text-zinc-700">
                Markedsverdi <span className="font-medium">{formatKr(totals.totalValue)}</span>
              </span>
              <span className={totals.totalGainLoss >= 0 ? "text-emerald-600" : "text-red-500"}>
                Urealisert gevinst/tap{" "}
                <span className="font-medium">{formatKr(totals.totalGainLoss)}</span> (
                {(totals.totalGainLossPct * 100).toFixed(1)}%)
              </span>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
              Sektoreksponering
            </h2>
            <div className="space-y-2">
              {sectors.map((s) => (
                <div key={s.key} className="flex items-center gap-4">
                  <span className="text-sm text-zinc-700 w-40 shrink-0 truncate">{s.key}</span>
                  <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${s.pct * 100}%` }} />
                  </div>
                  <span className="text-sm text-zinc-500 w-16 text-right shrink-0">
                    {(s.pct * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
              Geografisk eksponering
            </h2>
            <div className="space-y-2">
              {countries.map((c) => (
                <div key={c.key} className="flex items-center gap-4">
                  <span className="text-sm text-zinc-700 w-40 shrink-0 truncate">{c.key}</span>
                  <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${c.pct * 100}%` }} />
                  </div>
                  <span className="text-sm text-zinc-500 w-16 text-right shrink-0">
                    {(c.pct * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <HoldingsManager holdings={enriched} />
    </div>
  );
}

import Link from "next/link";
import { getAllAnalyses } from "@/lib/supabase";
import { getTransactions } from "@/lib/economy/db";
import { summarizeByMonth } from "@/lib/economy/analysis";
import { getHoldings } from "@/lib/portfolio/db";
import { enrichHoldings, portfolioTotals, exposureBySector } from "@/lib/portfolio/analysis";

export const dynamic = "force-dynamic";

function formatKr(n: number, currency = "NOK"): string {
  return `${Math.round(n).toLocaleString("no-NO")} ${currency}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("no-NO", { day: "numeric", month: "short", year: "numeric" });
}

function Card({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-zinc-100 rounded-xl p-5 flex flex-col">
      <h2 className="text-sm font-medium text-zinc-500 mb-3 uppercase tracking-wider">{title}</h2>
      <div className="flex-1">{children}</div>
      <Link
        href={href}
        className="mt-4 text-sm text-zinc-500 hover:text-zinc-900 underline underline-offset-2 self-start"
      >
        {linkLabel} →
      </Link>
    </div>
  );
}

export default async function DashboardPage() {
  const [analyses, transactions, holdings] = await Promise.all([
    getAllAnalyses(),
    getTransactions(),
    getHoldings(),
  ]);

  const enriched = await enrichHoldings(holdings);
  const months = summarizeByMonth(transactions);
  const latestMonth = months[months.length - 1];
  const totals = portfolioTotals(enriched);
  const sectors = exposureBySector(enriched);
  const topSector = sectors[0];
  const lastAnalysisUpdate = analyses.reduce(
    (latest, a) => (a.updated_at > latest ? a.updated_at : latest),
    ""
  );

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2 tracking-tight">Oversikt</h1>
        <p className="text-zinc-500 leading-relaxed">Samlet status på tvers av alle moduler.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card title="Personlig økonomi" href="/okonomi" linkLabel="Se full oversikt">
          {latestMonth ? (
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400 font-mono">{latestMonth.month}</p>
              <p className="text-zinc-700">
                Inntekt <span className="font-medium">{formatKr(latestMonth.income)}</span>
              </p>
              <p className="text-zinc-700">
                Utgift <span className="font-medium">{formatKr(latestMonth.expense)}</span>
              </p>
              <p className={latestMonth.savings >= 0 ? "text-emerald-600" : "text-red-500"}>
                Sparerate <span className="font-medium">{(latestMonth.savingsRate * 100).toFixed(0)}%</span>
              </p>
            </div>
          ) : (
            <p className="text-zinc-400 text-sm">Ingen transaksjoner importert ennå.</p>
          )}
        </Card>

        <Card title="Portefølje" href="/portefolje" linkLabel="Se full oversikt">
          {enriched.length > 0 ? (
            <div className="space-y-1 text-sm">
              <p className="text-zinc-700">
                Markedsverdi <span className="font-medium">{formatKr(totals.totalValue)}</span>
              </p>
              <p className={totals.totalGainLoss >= 0 ? "text-emerald-600" : "text-red-500"}>
                Gevinst/tap{" "}
                <span className="font-medium">
                  {totals.totalGainLoss >= 0 ? "+" : ""}
                  {(totals.totalGainLossPct * 100).toFixed(1)}%
                </span>
              </p>
              {topSector && (
                <p className="text-zinc-400">
                  Størst eksponering: {topSector.key} ({(topSector.pct * 100).toFixed(0)}%)
                </p>
              )}
            </div>
          ) : (
            <p className="text-zinc-400 text-sm">Ingen beholdninger registrert ennå.</p>
          )}
        </Card>

        <Card title="Fundamental analyse" href="/analyse" linkLabel="Se alle selskaper">
          {analyses.length > 0 ? (
            <div className="space-y-1 text-sm">
              <p className="text-zinc-700">
                <span className="font-medium">{analyses.length}</span> selskaper analysert
              </p>
              <p className="text-zinc-400">Sist oppdatert {formatDate(lastAnalysisUpdate)}</p>
            </div>
          ) : (
            <p className="text-zinc-400 text-sm">Ingen analyser generert ennå.</p>
          )}
        </Card>

        <Card title="DCF-verdsettelse" href="/dcf" linkLabel="Verdsett en aksje">
          <p className="text-zinc-400 text-sm">
            Interaktiv kalkulator — juster vekst, diskonteringsrente og terminalvekst selv for å verdsette en
            aksje.
          </p>
        </Card>
      </div>
    </div>
  );
}

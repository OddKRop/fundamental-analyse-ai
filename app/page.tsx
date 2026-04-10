import { getAllAnalyses } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatMarketCap(n: number, currency: string): string {
  if (!n) return "";
  if (n >= 1e9) return `${currency} ${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${currency} ${(n / 1e6).toFixed(1)}M`;
  return "";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("no-NO", { month: "short", year: "numeric" });
}

export default async function HomePage() {
  const analyses = await getAllAnalyses();

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900 mb-3 tracking-tight">
          Fundamental analyse
        </h1>
        <p className="text-zinc-500 leading-relaxed">
          AI-genererte fundamentalanalyser av norske aksjer på Oslo Børs. Oppdateres kvartalsvis.
        </p>
      </div>

      {analyses.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <p className="mb-2">Ingen analyser er generert enda.</p>
          <p className="text-sm">Kjør <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-600">POST /api/admin/refresh</code> for å generere analyser.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {analyses.map((a) => (
            <Link
              key={a.ticker}
              href={`/analyse/${a.ticker}`}
              className="flex items-center justify-between py-4 hover:bg-zinc-50 -mx-2 px-2 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-zinc-400 w-28 shrink-0">{a.ticker}</span>
                <div>
                  <p className="font-medium text-zinc-900 group-hover:text-zinc-700">{a.company_name}</p>
                  {a.sector && <p className="text-sm text-zinc-400">{a.sector}</p>}
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                {a.market_cap > 0 && (
                  <p className="text-sm font-medium text-zinc-700">{formatMarketCap(a.market_cap, a.currency)}</p>
                )}
                <p className="text-xs text-zinc-400">{formatDate(a.updated_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

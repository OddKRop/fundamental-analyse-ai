import Link from "next/link";
import { getTransactions } from "@/lib/economy/db";
import {
  summarizeByMonth,
  summarizeByCategory,
  topMerchants,
  recurringCosts,
  summarizeExcluded,
} from "@/lib/economy/analysis";
import InsightsPanel from "./InsightsPanel";

export const dynamic = "force-dynamic";

function formatKr(n: number): string {
  return `${Math.round(n).toLocaleString("no-NO")} kr`;
}

export default async function EconomyPage() {
  const transactions = await getTransactions();

  if (transactions.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-400">
        <p className="mb-4">Ingen transaksjoner importert enda.</p>
        <Link
          href="/okonomi/import"
          className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
        >
          Importer transaksjoner →
        </Link>
      </div>
    );
  }

  const months = summarizeByMonth(transactions);
  const categories = summarizeByCategory(transactions);
  const merchants = topMerchants(transactions);
  const recurring = recurringCosts(transactions);
  const excluded = summarizeExcluded(transactions);
  const totalExpense = categories.reduce((s, c) => s + c.total, 0);

  return (
    <div>
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2 tracking-tight">Personlig økonomi</h1>
          <p className="text-zinc-500 leading-relaxed">
            Oversikt over inntekter, utgifter og sparepotensial.
          </p>
        </div>
        <Link
          href="/okonomi/import"
          className="text-sm text-zinc-500 hover:text-zinc-900 underline underline-offset-2 shrink-0 mt-1"
        >
          + Importer
        </Link>
      </div>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
          Månedsoversikt
        </h2>
        <div className="divide-y divide-zinc-100">
          {months.map((m) => (
            <div key={m.month} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3 text-sm">
              <span className="font-mono text-zinc-400 w-20 shrink-0">{m.month}</span>
              <span className="text-zinc-700">
                Inntekt <span className="font-medium">{formatKr(m.income)}</span>
              </span>
              <span className="text-zinc-700">
                Utgift <span className="font-medium">{formatKr(m.expense)}</span>
              </span>
              <span className={m.savings >= 0 ? "text-emerald-600" : "text-red-500"}>
                Sparing <span className="font-medium">{formatKr(m.savings)}</span> (
                {(m.savingsRate * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
        {excluded.count > 0 && (
          <p className="text-xs text-zinc-400 mt-3">
            {formatKr(excluded.total)} i interne overføringer og kredittkortoppgjør ({excluded.count}{" "}
            transaksjoner) er holdt utenfor for å unngå dobbelttelling med kjøpene de gjelder.
          </p>
        )}
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
          Hvor pengene går
        </h2>
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.category} className="flex items-center gap-4">
              <span className="text-sm text-zinc-700 w-36 shrink-0 truncate">{c.category}</span>
              <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-900 rounded-full"
                  style={{ width: `${totalExpense > 0 ? (c.total / totalExpense) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm text-zinc-500 w-24 text-right shrink-0">{formatKr(c.total)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
          Topp kjøpesteder
        </h2>
        <div className="divide-y divide-zinc-100">
          {merchants.map((m) => (
            <div key={m.merchant} className="flex items-center justify-between py-3 text-sm gap-4">
              <span className="text-zinc-900 font-medium truncate">{m.merchant}</span>
              <span className="text-zinc-400 shrink-0">
                {m.count} kjøp · snitt {formatKr(m.avg)}
              </span>
              <span className="text-zinc-700 font-medium shrink-0">{formatKr(m.total)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
          Faste kostnader
        </h2>
        <p className="text-sm text-zinc-500 mb-4">Kandidater for oppsigelse eller reforhandling.</p>
        <div className="divide-y divide-zinc-100">
          {recurring.map((r) => (
            <div key={r.description} className="flex items-center justify-between py-3 text-sm gap-4">
              <div className="min-w-0">
                <p className="text-zinc-900 font-medium truncate">{r.description}</p>
                <p className="text-zinc-400">
                  {r.category} · {r.occurrences}x
                </p>
              </div>
              <span className="text-zinc-700 font-medium shrink-0">{formatKr(r.avgAmount)}/gang</span>
            </div>
          ))}
        </div>
      </section>

      <InsightsPanel />
    </div>
  );
}

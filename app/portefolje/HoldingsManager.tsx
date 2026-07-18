"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EnrichedHolding } from "@/lib/portfolio/analysis";

interface Props {
  holdings: EnrichedHolding[];
}

function formatKr(n: number, currency = "NOK"): string {
  return `${Math.round(n).toLocaleString("no-NO")} ${currency}`;
}

export default function HoldingsManager({ holdings }: Props) {
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [currency, setCurrency] = useState("NOK");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...holdings].sort((a, b) => b.marketValue - a.marketValue);

  async function handleDelete(id?: number) {
    if (!id) return;
    await fetch(`/api/portfolio/holdings/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/portfolio/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: ticker.trim().toUpperCase(),
          quantity: Number(quantity),
          avg_price: Number(avgPrice),
          currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ukjent feil");
      setTicker("");
      setQuantity("");
      setAvgPrice("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2 className="text-xl font-semibold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
        Beholdninger
      </h2>

      {sorted.length > 0 && (
        <div className="divide-y divide-zinc-100 mb-8">
          {sorted.map((h) => (
            <div key={h.id} className="flex items-center justify-between py-3 text-sm gap-4">
              <div className="min-w-0">
                <p className="text-zinc-900 font-medium truncate">
                  {h.companyName} <span className="text-zinc-400 font-mono text-xs">{h.ticker}</span>
                </p>
                <p className="text-zinc-400">
                  {h.quantity} stk · GAV {formatKr(h.avg_price, h.currency)}
                  {h.priceError && <span className="text-red-500"> · fant ikke kurs</span>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-zinc-700 font-medium">{formatKr(h.marketValue, h.currency)}</p>
                {!h.priceError && (
                  <p className={h.gainLoss >= 0 ? "text-emerald-600 text-xs" : "text-red-500 text-xs"}>
                    {h.gainLoss >= 0 ? "+" : ""}
                    {(h.gainLossPct * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(h.id)}
                className="text-zinc-300 hover:text-red-500 transition-colors shrink-0"
                aria-label="Slett beholdning"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
        <label className="text-sm text-zinc-500">
          Ticker
          <input
            type="text"
            required
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="EQNR.OL"
            className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </label>
        <label className="text-sm text-zinc-500">
          Antall
          <input
            type="number"
            required
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </label>
        <label className="text-sm text-zinc-500">
          GAV
          <input
            type="number"
            required
            step="any"
            value={avgPrice}
            onChange={(e) => setAvgPrice(e.target.value)}
            className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </label>
        <label className="text-sm text-zinc-500">
          Valuta
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="col-span-2 sm:col-span-4 bg-zinc-900 text-white rounded-lg px-3 py-2 font-medium hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Legger til …" : "Legg til beholdning"}
        </button>
      </form>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  calculateDcf,
  DEFAULT_GROWTH_RATE,
  DEFAULT_PROJECTION_YEARS,
  DEFAULT_TERMINAL_GROWTH_RATE,
} from "@/lib/dcf";

interface Props {
  currency: string;
  currentPrice: number;
  baseFcf: number;
  netDebt: number;
  sharesOutstanding: number;
  defaultWacc: number;
}

function formatMoney(n: number, currency: string): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${currency} ${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${currency} ${(n / 1e6).toFixed(1)}M`;
  return `${currency} ${n.toLocaleString("no-NO", { maximumFractionDigits: 0 })}`;
}

export default function DcfCalculator({
  currency,
  currentPrice,
  baseFcf,
  netDebt,
  sharesOutstanding,
  defaultWacc,
}: Props) {
  const [growthRate, setGrowthRate] = useState(DEFAULT_GROWTH_RATE);
  const [projectionYears, setProjectionYears] = useState(DEFAULT_PROJECTION_YEARS);
  const [discountRate, setDiscountRate] = useState(Number(defaultWacc.toFixed(3)));
  const [terminalGrowthRate, setTerminalGrowthRate] = useState(DEFAULT_TERMINAL_GROWTH_RATE);

  const result = useMemo(() => {
    if (discountRate <= terminalGrowthRate) return null;
    try {
      return calculateDcf({
        baseFcf,
        growthRate,
        projectionYears,
        discountRate,
        terminalGrowthRate,
        netDebt,
        sharesOutstanding,
      });
    } catch {
      return null;
    }
  }, [baseFcf, growthRate, projectionYears, discountRate, terminalGrowthRate, netDebt, sharesOutstanding]);

  const diffPct = result && currentPrice > 0 ? (result.valuePerShare - currentPrice) / currentPrice : null;

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
          Forutsetninger
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm text-zinc-500">
            Vekstrate, % (prognoseperiode)
            <input
              type="number"
              step="0.5"
              value={(growthRate * 100).toFixed(1)}
              onChange={(e) => setGrowthRate(Number(e.target.value) / 100)}
              className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
            />
          </label>
          <label className="text-sm text-zinc-500">
            Antall prognoseår
            <input
              type="number"
              step="1"
              min="1"
              max="15"
              value={projectionYears}
              onChange={(e) => setProjectionYears(Math.max(1, Math.min(15, Number(e.target.value))))}
              className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
            />
          </label>
          <label className="text-sm text-zinc-500">
            Diskonteringsrente (WACC), %
            <input
              type="number"
              step="0.5"
              value={(discountRate * 100).toFixed(1)}
              onChange={(e) => setDiscountRate(Number(e.target.value) / 100)}
              className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
            />
          </label>
          <label className="text-sm text-zinc-500">
            Terminal vekstrate, %
            <input
              type="number"
              step="0.1"
              value={(terminalGrowthRate * 100).toFixed(1)}
              onChange={(e) => setTerminalGrowthRate(Number(e.target.value) / 100)}
              className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
            />
          </label>
        </div>
        <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
          Diskonteringsrenten er forhåndsutfylt med en CAPM-basert startgjetning fra selskapets beta — juster
          selv etter eget skjønn.
        </p>
      </section>

      {!result && (
        <p className="text-sm text-red-500 mb-10">
          Diskonteringsrenten må være høyere enn terminal vekstrate.
        </p>
      )}

      {result && (
        <>
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
              Prognostisert fri kontantstrøm
            </h2>
            <div className="divide-y divide-zinc-100">
              {result.projectedFcfs.map((p) => (
                <div key={p.year} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-zinc-500">År {p.year}</span>
                  <span className="text-zinc-700">{formatMoney(p.fcf, currency)}</span>
                  <span className="text-zinc-400">NV: {formatMoney(p.presentValue, currency)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
              Verdsettelse
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Terminalverdi (nåverdi)</span>
                <span className="text-zinc-700 font-medium">
                  {formatMoney(result.presentValueOfTerminalValue, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Enterprise value</span>
                <span className="text-zinc-700 font-medium">{formatMoney(result.enterpriseValue, currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Netto gjeld</span>
                <span className="text-zinc-700 font-medium">{formatMoney(netDebt, currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Equity value</span>
                <span className="text-zinc-700 font-medium">{formatMoney(result.equityValue, currency)}</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
              Konklusjon
            </h2>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-zinc-500">Beregnet verdi per aksje</span>
              <span className="text-zinc-900 font-semibold text-lg">
                {currency} {result.valuePerShare.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mb-4">
              <span className="text-zinc-500">Dagens kurs</span>
              <span className="text-zinc-700">
                {currency} {currentPrice.toFixed(2)}
              </span>
            </div>
            {diffPct !== null && (
              <p className={diffPct >= 0 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                {diffPct >= 0
                  ? `Potensielt undervurdert med ${(diffPct * 100).toFixed(0)}%`
                  : `Potensielt overvurdert med ${(Math.abs(diffPct) * 100).toFixed(0)}%`}
              </p>
            )}
            <p className="text-xs text-zinc-400 mt-4">
              Forenklet modell — ikke finansiell rådgivning. Svært følsom for forutsetningene over.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

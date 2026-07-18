import { fetchQuoteProfile } from "@/lib/yahoo";
import type { Holding } from "./db";

export interface EnrichedHolding extends Holding {
  companyName: string;
  sector: string;
  country: string;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPct: number;
  priceError: boolean;
}

/**
 * Slår sammen lagrede holdings med live kursdata fra Yahoo Finance. Tickere som ikke
 * kan hentes (feilstavet, avnotert e.l.) markeres med priceError i stedet for å kaste,
 * slik at én dårlig ticker ikke tar ned hele porteføljeoversikten.
 */
export async function enrichHoldings(holdings: Holding[]): Promise<EnrichedHolding[]> {
  return Promise.all(
    holdings.map(async (h) => {
      try {
        const profile = await fetchQuoteProfile(h.ticker);
        const marketValue = h.quantity * profile.price;
        const costBasis = h.quantity * h.avg_price;
        return {
          ...h,
          companyName: profile.companyName,
          sector: profile.sector,
          country: profile.country,
          currentPrice: profile.price,
          marketValue,
          gainLoss: marketValue - costBasis,
          gainLossPct: costBasis > 0 ? (marketValue - costBasis) / costBasis : 0,
          priceError: false,
        };
      } catch {
        return {
          ...h,
          companyName: h.ticker,
          sector: "Ukjent",
          country: "Ukjent",
          currentPrice: 0,
          marketValue: 0,
          gainLoss: 0,
          gainLossPct: 0,
          priceError: true,
        };
      }
    })
  );
}

export interface ExposureSlice {
  key: string;
  value: number;
  pct: number;
}

function groupBy(holdings: EnrichedHolding[], keyFn: (h: EnrichedHolding) => string): ExposureSlice[] {
  const total = holdings.reduce((s, h) => s + h.marketValue, 0);
  const map = new Map<string, number>();

  for (const h of holdings) {
    if (h.priceError) continue;
    const key = keyFn(h);
    map.set(key, (map.get(key) ?? 0) + h.marketValue);
  }

  return Array.from(map.entries())
    .map(([key, value]) => ({ key, value, pct: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

export function exposureBySector(holdings: EnrichedHolding[]): ExposureSlice[] {
  return groupBy(holdings, (h) => h.sector);
}

export function exposureByCountry(holdings: EnrichedHolding[]): ExposureSlice[] {
  return groupBy(holdings, (h) => h.country);
}

export interface PortfolioTotals {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPct: number;
}

export function portfolioTotals(holdings: EnrichedHolding[]): PortfolioTotals {
  const totalValue = holdings.reduce((s, h) => s + h.marketValue, 0);
  const totalCost = holdings.reduce((s, h) => s + h.quantity * h.avg_price, 0);
  const totalGainLoss = totalValue - totalCost;
  return {
    totalValue,
    totalCost,
    totalGainLoss,
    totalGainLossPct: totalCost > 0 ? totalGainLoss / totalCost : 0,
  };
}

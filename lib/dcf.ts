import type { FundamentalData } from "./yahoo";

export const DEFAULT_GROWTH_RATE = 0.08;
export const DEFAULT_PROJECTION_YEARS = 5;
export const DEFAULT_TERMINAL_GROWTH_RATE = 0.025;

export interface DcfAssumptions {
  baseFcf: number;
  growthRate: number; // f.eks. 0.08 for 8 % årlig vekst i prognoseperioden
  projectionYears: number; // f.eks. 5
  discountRate: number; // WACC, f.eks. 0.09
  terminalGrowthRate: number; // f.eks. 0.025
  netDebt: number; // totalDebt - cashAndCashEquivalents
  sharesOutstanding: number;
}

export interface ProjectedYear {
  year: number;
  fcf: number;
  presentValue: number;
}

export interface DcfResult {
  projectedFcfs: ProjectedYear[];
  terminalValue: number;
  presentValueOfTerminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  valuePerShare: number;
}

/**
 * Enkel DCF: projiser FCF med konstant vekstrate, nåverdiberegn hvert år,
 * legg til en terminalverdi (Gordon growth) for årene etter prognoseperioden.
 */
export function calculateDcf(a: DcfAssumptions): DcfResult {
  if (a.discountRate <= a.terminalGrowthRate) {
    throw new Error("Diskonteringsrenten må være høyere enn terminal vekstrate");
  }

  const projectedFcfs: ProjectedYear[] = [];
  let lastFcf = a.baseFcf;

  for (let year = 1; year <= a.projectionYears; year++) {
    lastFcf = lastFcf * (1 + a.growthRate);
    const presentValue = lastFcf / Math.pow(1 + a.discountRate, year);
    projectedFcfs.push({ year, fcf: lastFcf, presentValue });
  }

  const terminalValue =
    (lastFcf * (1 + a.terminalGrowthRate)) / (a.discountRate - a.terminalGrowthRate);
  const presentValueOfTerminalValue =
    terminalValue / Math.pow(1 + a.discountRate, a.projectionYears);

  const enterpriseValue =
    projectedFcfs.reduce((sum, p) => sum + p.presentValue, 0) + presentValueOfTerminalValue;
  const equityValue = enterpriseValue - a.netDebt;
  const valuePerShare = a.sharesOutstanding > 0 ? equityValue / a.sharesOutstanding : 0;

  return {
    projectedFcfs,
    terminalValue,
    presentValueOfTerminalValue,
    enterpriseValue,
    equityValue,
    valuePerShare,
  };
}

const RISK_FREE_RATE = 0.04;
const EQUITY_RISK_PREMIUM = 0.05;
const PRE_TAX_COST_OF_DEBT = 0.05;
const CORPORATE_TAX_RATE = 0.22;

/**
 * CAPM-basert startgjetning på WACC — ment som utgangspunkt brukeren justerer selv,
 * ikke en presis beregning (mangler bl.a. faktisk kredittspread og markedsverdi av gjeld).
 */
export function estimateDefaultWacc(beta: number, marketCap: number, totalDebt: number): number {
  const costOfEquity = RISK_FREE_RATE + beta * EQUITY_RISK_PREMIUM;
  const costOfDebtAfterTax = PRE_TAX_COST_OF_DEBT * (1 - CORPORATE_TAX_RATE);

  const totalCapital = marketCap + totalDebt;
  const equityWeight = totalCapital > 0 ? marketCap / totalCapital : 1;
  const debtWeight = totalCapital > 0 ? totalDebt / totalCapital : 0;

  const wacc = equityWeight * costOfEquity + debtWeight * costOfDebtAfterTax;
  return Math.min(0.15, Math.max(0.06, wacc));
}

export interface DefaultValuation {
  valuePerShare: number;
  currentPrice: number;
  diffPct: number; // (valuePerShare - currentPrice) / currentPrice
}

/**
 * Kjører DCF-en med samme standardforutsetninger som kalkulatoren starter på
 * (DEFAULT_GROWTH_RATE/DEFAULT_PROJECTION_YEARS/DEFAULT_TERMINAL_GROWTH_RATE,
 * WACC fra estimateDefaultWacc) — til bruk der vi trenger et raskt over/undervurdert-
 * anslag for mange tickere uten at brukeren har justert noe selv.
 */
export function computeDefaultValuation(data: FundamentalData): DefaultValuation | null {
  const latestFcf = data.cashFlows[0]?.freeCashFlow ?? 0;
  const latestBalance = data.balanceSheets[0];
  const netDebt = (latestBalance?.totalDebt ?? 0) - (latestBalance?.cashAndCashEquivalents ?? 0);

  if (latestFcf <= 0 || !data.profile.sharesOutstanding) return null;

  const discountRate = estimateDefaultWacc(
    data.profile.beta || 1,
    data.profile.mktCap,
    latestBalance?.totalDebt ?? 0
  );
  if (discountRate <= DEFAULT_TERMINAL_GROWTH_RATE) return null;

  const result = calculateDcf({
    baseFcf: latestFcf,
    growthRate: DEFAULT_GROWTH_RATE,
    projectionYears: DEFAULT_PROJECTION_YEARS,
    discountRate,
    terminalGrowthRate: DEFAULT_TERMINAL_GROWTH_RATE,
    netDebt,
    sharesOutstanding: data.profile.sharesOutstanding,
  });

  const currentPrice = data.profile.price;
  return {
    valuePerShare: result.valuePerShare,
    currentPrice,
    diffPct: currentPrice > 0 ? (result.valuePerShare - currentPrice) / currentPrice : 0,
  };
}

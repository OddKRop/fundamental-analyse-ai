import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

import yahooFinance from "yahoo-finance2";
const YahooFinance = yahooFinance.default ?? yahooFinance;
const yf = new YahooFinance();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TICKERS = [
  "EQNR.OL", "DNB.OL", "TEL.OL", "AKRBP.OL", "NHY.OL",
  "MOWI.OL", "YAR.OL", "ORK.OL", "SALM.OL", "KOG.OL",
  "STB.OL", "GJF.OL", "SUBC.OL", "SCATC.OL", "NEL.OL",
  "BOUV.OL", "PGS.OL", "TGS.OL", "FRO.OL", "BWO.OL",
  "AUTO.OL", "NSKOG.OL", "RECSI.OL",
];

function formatNumber(n, currency = "USD") {
  if (!n && n !== 0) return "N/A";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${currency} ${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${currency} ${(n / 1e6).toFixed(1)}M`;
  return `${currency} ${n.toLocaleString("no-NO")}`;
}

function pct(n) {
  if (!n && n !== 0) return "N/A";
  return `${(n * 100).toFixed(1)}%`;
}

async function fetchData(ticker) {
  const q = await yf.quoteSummary(ticker, {
    modules: [
      "summaryProfile", "summaryDetail", "defaultKeyStatistics",
      "financialData", "price",
      "incomeStatementHistory", "balanceSheetHistory", "cashflowStatementHistory",
    ],
  });

  const price = q.price;
  const profile = q.summaryProfile;
  const detail = q.summaryDetail;
  const stats = q.defaultKeyStatistics;
  const finData = q.financialData;

  const incomeStatements = (q.incomeStatementHistory?.incomeStatementHistory || []).map((s) => {
    const rev = s.totalRevenue || 0;
    const gp = s.grossProfit || 0;
    const oi = s.operatingIncome || 0;
    const ni = s.netIncome || 0;
    return {
      date: s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : "",
      revenue: rev, grossProfit: gp, operatingIncome: oi, netIncome: ni,
      ebitda: s.ebitda || 0,
      grossProfitRatio: rev ? gp / rev : 0,
      operatingIncomeRatio: rev ? oi / rev : 0,
      netIncomeRatio: rev ? ni / rev : 0,
      eps: s.basicEPS || 0,
    };
  });

  const balanceSheets = (q.balanceSheetHistory?.balanceSheetStatements || []).map((s) => ({
    date: s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : "",
    totalAssets: s.totalAssets || 0,
    totalLiabilities: s.totalLiab || 0,
    totalStockholdersEquity: s.totalStockholderEquity || 0,
    totalDebt: s.longTermDebt || 0,
    cashAndCashEquivalents: s.cash || 0,
  }));

  const cashFlows = (q.cashflowStatementHistory?.cashflowStatements || []).map((s) => {
    const ocf = s.totalCashFromOperatingActivities || 0;
    const capex = s.capitalExpenditures || 0;
    return {
      date: s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : "",
      operatingCashFlow: ocf, capitalExpenditure: capex,
      freeCashFlow: ocf + capex, dividendsPaid: s.dividendsPaid || 0,
    };
  });

  return {
    profile: {
      symbol: ticker,
      companyName: price?.longName || price?.shortName || ticker,
      description: profile?.longBusinessSummary || "",
      sector: profile?.sector || "",
      industry: profile?.industry || "",
      country: profile?.country || "",
      currency: price?.currency || "USD",
      exchange: price?.exchangeName || "",
      mktCap: price?.marketCap || 0,
      price: price?.regularMarketPrice || 0,
      beta: detail?.beta || 0,
      website: profile?.website || "",
      fullTimeEmployees: profile?.fullTimeEmployees?.toLocaleString("no-NO") || "",
    },
    incomeStatements,
    balanceSheets,
    cashFlows,
    keyMetrics: {
      peRatio: detail?.trailingPE || 0,
      priceToSalesRatio: detail?.priceToSalesTrailing12Months || 0,
      pbRatio: stats?.priceToBook || 0,
      evToEbitda: stats?.enterpriseToEbitda || 0,
      debtToEquity: finData?.debtToEquity || 0,
      currentRatio: finData?.currentRatio || 0,
      returnOnEquity: finData?.returnOnEquity || 0,
      returnOnAssets: finData?.returnOnAssets || 0,
      dividendYield: detail?.dividendYield || 0,
    },
  };
}

function buildPrompt(data, ticker) {
  const { profile, incomeStatements, balanceSheets, cashFlows, keyMetrics: m } = data;
  const cur = profile.currency;
  const li = incomeStatements[0];
  const lb = balanceSheets[0];
  const lc = cashFlows[0];

  const summary = `
## Selskapsprofil
- Navn: ${profile.companyName} | Ticker: ${ticker} | Sektor: ${profile.sector} | Bransje: ${profile.industry}
- Land: ${profile.country} | Ansatte: ${profile.fullTimeEmployees} | Markedsverdi: ${formatNumber(profile.mktCap, cur)}
- Kurs: ${cur} ${profile.price} | Beta: ${profile.beta}

## Beskrivelse
${profile.description}

## Resultatregnskap (siste år)
- Inntekter: ${formatNumber(li?.revenue, cur)} | Brutto margin: ${pct(li?.grossProfitRatio)}
- Driftsresultat: ${formatNumber(li?.operatingIncome, cur)} (${pct(li?.operatingIncomeRatio)})
- EBITDA: ${formatNumber(li?.ebitda, cur)} | Netto: ${formatNumber(li?.netIncome, cur)} (${pct(li?.netIncomeRatio)})

## Inntektshistorikk
${incomeStatements.map(s => `${s.date}: ${formatNumber(s.revenue, cur)}`).join(", ")}

## Balanse
- Eiendeler: ${formatNumber(lb?.totalAssets, cur)} | Gjeld: ${formatNumber(lb?.totalLiabilities, cur)} | Egenkapital: ${formatNumber(lb?.totalStockholdersEquity, cur)}
- Rentebærende gjeld: ${formatNumber(lb?.totalDebt, cur)} | Kontanter: ${formatNumber(lb?.cashAndCashEquivalents, cur)}

## Kontantstrøm
- Operasjonell: ${formatNumber(lc?.operatingCashFlow, cur)} | Capex: ${formatNumber(lc?.capitalExpenditure, cur)} | FCF: ${formatNumber(lc?.freeCashFlow, cur)}

## Nøkkeltall
- P/E: ${m.peRatio?.toFixed(1)} | P/B: ${m.pbRatio?.toFixed(2)} | P/S: ${m.priceToSalesRatio?.toFixed(2)} | EV/EBITDA: ${m.evToEbitda?.toFixed(1)}
- Gjeld/EK: ${m.debtToEquity?.toFixed(2)} | Current ratio: ${m.currentRatio?.toFixed(2)}
- ROE: ${pct(m.returnOnEquity)} | ROA: ${pct(m.returnOnAssets)} | Dividende: ${pct(m.dividendYield)}
`.trim();

  return `Basert på følgende data for ${ticker}, skriv en grundig fundamental analyse på norsk.

${summary}

Bruk disse overskriftene (##):
## Om selskapet
## Marked og konkurransesituasjon
## Finansiell analyse
## Strategi og konkurransefortrinn
## Risikovurdering
## Samlet vurdering

Skriv i sammenhengende analytikerprosatekst — ikke punktlister. Bruk tall aktivt.`;
}

async function refreshTicker(ticker) {
  console.log(`\n[${ticker}] Henter data...`);
  const data = await fetchData(ticker);

  console.log(`[${ticker}] Genererer analyse...`);
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: "Du er en erfaren norsk aksjekanalyst. Skriv presise, velformulerte analyser på norsk i journalistisk analytikerstil.",
    messages: [{ role: "user", content: buildPrompt(data, ticker) }],
  });

  const analysisText = message.content[0].text;

  console.log(`[${ticker}] Lagrer i Supabase...`);
  const { error } = await supabase.from("analyses").upsert({
    ticker: ticker.toUpperCase(),
    company_name: data.profile.companyName,
    sector: data.profile.sector,
    market_cap: data.profile.mktCap,
    price: data.profile.price,
    currency: data.profile.currency,
    analysis_text: analysisText,
    updated_at: new Date().toISOString(),
  }, { onConflict: "ticker" });

  if (error) throw new Error(error.message);
  console.log(`[${ticker}] ✓ Ferdig`);
}

const ticker = process.argv[2];
const targets = ticker ? [ticker] : TICKERS;

let ok = 0, failed = 0;
for (const t of targets) {
  try {
    await refreshTicker(t);
    ok++;
  } catch (err) {
    console.error(`[${t}] FEIL: ${err.message}`);
    failed++;
  }
}

console.log(`\nFerdig: ${ok} ok, ${failed} feilet`);

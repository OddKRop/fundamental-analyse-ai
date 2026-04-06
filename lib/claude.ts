import Anthropic from "@anthropic-ai/sdk";
import type { FundamentalData } from "./yahoo";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function formatNumber(n: number, currency = "NOK"): string {
  if (!n && n !== 0) return "N/A";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${currency} ${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${currency} ${(n / 1e6).toFixed(1)}M`;
  return `${currency} ${n.toLocaleString("no-NO")}`;
}

function pct(n: number): string {
  if (!n && n !== 0) return "N/A";
  return `${(n * 100).toFixed(1)}%`;
}

function buildDataSummary(data: FundamentalData): string {
  const { profile, incomeStatements, balanceSheets, cashFlows, keyMetrics } = data;
  const cur = profile.currency || "USD";

  const latestIncome = incomeStatements[0];
  const latestBalance = balanceSheets[0];
  const latestCash = cashFlows[0];
  const m = keyMetrics;

  const historicRevenue = incomeStatements
    .slice(0, 5)
    .map((s) => `${s.date}: ${formatNumber(s.revenue, cur)}`)
    .join(", ");

  return `
## Selskapsprofil
- Navn: ${profile.companyName}
- Ticker: ${profile.symbol}
- Sektor: ${profile.sector}
- Bransje: ${profile.industry}
- Land: ${profile.country}
- Børs: ${profile.exchange}
- Ansatte: ${profile.fullTimeEmployees}
- Markedsverdi: ${formatNumber(profile.mktCap, cur)}
- Aksjekurs: ${cur} ${profile.price}
- Beta: ${profile.beta}
- Nettside: ${profile.website}

## Selskapsbeskrivelse
${profile.description}

## Resultatregnskap (siste år)
- Inntekter: ${formatNumber(latestIncome?.revenue, cur)}
- Bruttofortjeneste: ${formatNumber(latestIncome?.grossProfit, cur)} (margin: ${pct(latestIncome?.grossProfitRatio)})
- Driftsresultat (EBIT): ${formatNumber(latestIncome?.operatingIncome, cur)} (margin: ${pct(latestIncome?.operatingIncomeRatio)})
- EBITDA: ${formatNumber(latestIncome?.ebitda, cur)}
- Nettoresultat: ${formatNumber(latestIncome?.netIncome, cur)} (margin: ${pct(latestIncome?.netIncomeRatio)})
- EPS: ${cur} ${latestIncome?.eps?.toFixed(2) ?? "N/A"}

## Inntektshistorikk (siste 5 år)
${historicRevenue}

## Balanse (siste)
- Totale eiendeler: ${formatNumber(latestBalance?.totalAssets, cur)}
- Total gjeld: ${formatNumber(latestBalance?.totalLiabilities, cur)}
- Egenkapital: ${formatNumber(latestBalance?.totalStockholdersEquity, cur)}
- Rentebærende gjeld: ${formatNumber(latestBalance?.totalDebt, cur)}
- Kontanter: ${formatNumber(latestBalance?.cashAndCashEquivalents, cur)}

## Kontantstrøm (siste år)
- Operasjonell kontantstrøm: ${formatNumber(latestCash?.operatingCashFlow, cur)}
- Investeringer (capex): ${formatNumber(latestCash?.capitalExpenditure, cur)}
- Fri kontantstrøm (FCF): ${formatNumber(latestCash?.freeCashFlow, cur)}
- Utbytte betalt: ${formatNumber(latestCash?.dividendsPaid, cur)}

## Nøkkeltall og verdivurdering
- P/E: ${m?.peRatio?.toFixed(1) ?? "N/A"}
- P/S: ${m?.priceToSalesRatio?.toFixed(2) ?? "N/A"}
- P/B: ${m?.pbRatio?.toFixed(2) ?? "N/A"}
- EV/EBITDA: ${m?.evToEbitda?.toFixed(1) ?? "N/A"}
- Gjeld/egenkapital: ${m?.debtToEquity?.toFixed(2) ?? "N/A"}
- Likviditetsgrad: ${m?.currentRatio?.toFixed(2) ?? "N/A"}
- ROE (egenkapitalavkastning): ${pct(m?.returnOnEquity)}
- ROA (totalkapitalavkastning): ${pct(m?.returnOnAssets)}
- Dividendeavkastning: ${pct(m?.dividendYield)}
`.trim();
}

const SYSTEM_PROMPT = `Du er en erfaren norsk aksjekanalyst med dyp kunnskap om fundamental analyse.
Du skriver grundige, presise og lettleste analyser på norsk — i en journalistisk, analytisk stil.
Ikke bruk punktlister for hoveddelen av analysen. Skriv i sammenhengende, velformulerte avsnitt som leser seg som en profesjonell analytikertekst.
Bruk tall og nøkkeltall aktivt for å underbygge vurderingene dine.
Vær balansert — trekk frem både styrker og svakheter.`;

const USER_PROMPT_TEMPLATE = (dataSummary: string, ticker: string) => `
Basert på følgende fundamentale data for ${ticker}, skriv en grundig fundamental analyse av selskapet.

${dataSummary}

Strukturer analysen med disse overskriftene (bruk ##):

## Om selskapet
Beskriv hva selskapet gjør, forretningsmodellen og hvordan de tjener penger. Inkluder historikk og posisjon i markedet.

## Marked og konkurransesituasjon
Vurder markedet selskapet opererer i — størrelse, vekst, trender. Diskuter konkurrenter og selskapets posisjon.

## Finansiell analyse
Gå grundig gjennom regnskapstallene: inntektsutvikling, lønnsomhetsmarginer, balansestyrke, kontantstrøm og nøkkelratios. Sammenlign gjerne utvikling over tid.

## Strategi og konkurransefortrinn
Vurder selskapets strategiske posisjon, hva som eventuelt utgjør et varig konkurransefortrinn (moat), og ledelsens retning.

## Risikovurdering
Identifiser de viktigste risikoene: makroøkonomisk, bransjespesifikt og selskapsspecifikt.

## Samlet vurdering
En helhetlig vurdering av selskapets fundamentale kvalitet. Er dette et kvalitetsselskap? Hva er de kritiske faktorene en investor bør følge med på?
`.trim();

export async function generateAnalysis(
  data: FundamentalData,
  ticker: string
): Promise<string> {
  const dataSummary = buildDataSummary(data);
  const userPrompt = USER_PROMPT_TEMPLATE(dataSummary, ticker);

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Uventet svar fra Claude");
  return block.text;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinance = require("yahoo-finance2").default;
const yahooFinance = new YahooFinance();

export interface CompanyProfile {
  symbol: string;
  companyName: string;
  description: string;
  sector: string;
  industry: string;
  country: string;
  currency: string;
  exchange: string;
  mktCap: number;
  price: number;
  beta: number;
  website: string;
  ceo: string;
  fullTimeEmployees: string;
  sharesOutstanding: number;
}

export interface IncomeStatement {
  date: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  ebitda: number;
  grossProfitRatio: number;
  operatingIncomeRatio: number;
  netIncomeRatio: number;
  eps: number;
}

export interface BalanceSheet {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  totalStockholdersEquity: number;
  totalDebt: number;
  cashAndCashEquivalents: number;
}

export interface CashFlowStatement {
  date: string;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
  dividendsPaid: number;
}

export interface KeyMetrics {
  peRatio: number;
  priceToSalesRatio: number;
  pbRatio: number;
  evToEbitda: number;
  debtToEquity: number;
  currentRatio: number;
  returnOnEquity: number;
  returnOnAssets: number;
  dividendYield: number;
}

export interface FundamentalData {
  profile: CompanyProfile;
  incomeStatements: IncomeStatement[];
  balanceSheets: BalanceSheet[];
  cashFlows: CashFlowStatement[];
  keyMetrics: KeyMetrics;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchTimeSeries(ticker: string, module: "financials" | "balance-sheet" | "cash-flow"): Promise<any[]> {
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 6);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await yahooFinance.fundamentalsTimeSeries(ticker, {
      period1,
      type: "annual",
      module,
    });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sortByDateDesc(rows: any[]): any[] {
  return rows
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function fetchFundamentalData(ticker: string): Promise<FundamentalData> {
  const t = ticker.toUpperCase();

  // summaryProfile/summaryDetail/defaultKeyStatistics/financialData/price are still populated by
  // quoteSummary. The historical statement submodules (incomeStatementHistory etc.) have returned
  // almost no data since Nov 2024 — use fundamentalsTimeSeries for those instead (see yahoo-finance2
  // deprecation notice).
  const [q, financialsTs, balanceSheetTs, cashFlowTs] = await Promise.all([
    yahooFinance.quoteSummary(t, {
      modules: ["summaryProfile", "summaryDetail", "defaultKeyStatistics", "financialData", "price"] as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as Promise<any>,
    fetchTimeSeries(t, "financials"),
    fetchTimeSeries(t, "balance-sheet"),
    fetchTimeSeries(t, "cash-flow"),
  ]);

  const price = q.price;
  const profile = q.summaryProfile;
  const detail = q.summaryDetail;
  const stats = q.defaultKeyStatistics;
  const finData = q.financialData;

  if (!price?.longName && !price?.shortName) {
    throw new Error(`Fant ikke selskap med ticker: ${t}`);
  }

  const companyProfile: CompanyProfile = {
    symbol: t,
    companyName: price?.longName || price?.shortName || t,
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
    ceo: "",
    fullTimeEmployees: profile?.fullTimeEmployees?.toLocaleString("no-NO") || "",
    sharesOutstanding: stats?.sharesOutstanding || 0,
  };

  // Income statements
  const incomeStatements: IncomeStatement[] = sortByDateDesc(financialsTs).map((s) => {
    const rev = s.totalRevenue || 0;
    const gp = s.grossProfit || 0;
    const oi = s.operatingIncome || 0;
    const ni = s.netIncome || 0;
    return {
      date: s.date ? new Date(s.date).toISOString().slice(0, 10) : "",
      revenue: rev,
      grossProfit: gp,
      operatingIncome: oi,
      netIncome: ni,
      ebitda: s.EBITDA || 0,
      grossProfitRatio: rev ? gp / rev : 0,
      operatingIncomeRatio: rev ? oi / rev : 0,
      netIncomeRatio: rev ? ni / rev : 0,
      eps: s.basicEPS || 0,
    };
  });

  // Balance sheets
  const balanceSheets: BalanceSheet[] = sortByDateDesc(balanceSheetTs).map((s) => ({
    date: s.date ? new Date(s.date).toISOString().slice(0, 10) : "",
    totalAssets: s.totalAssets || 0,
    totalLiabilities: s.totalLiabilitiesNetMinorityInterest || 0,
    totalStockholdersEquity: s.stockholdersEquity || 0,
    totalDebt: s.totalDebt || 0,
    cashAndCashEquivalents: s.cashAndCashEquivalents || 0,
  }));

  // Cash flows
  const cashFlows: CashFlowStatement[] = sortByDateDesc(cashFlowTs).map((s) => {
    const ocf = s.operatingCashFlow || 0;
    const capex = s.capitalExpenditure || 0;
    return {
      date: s.date ? new Date(s.date).toISOString().slice(0, 10) : "",
      operatingCashFlow: ocf,
      capitalExpenditure: capex,
      freeCashFlow: s.freeCashFlow || ocf + capex,
      dividendsPaid: s.cashDividendsPaid || 0,
    };
  });

  const keyMetrics: KeyMetrics = {
    peRatio: detail?.trailingPE || 0,
    priceToSalesRatio: detail?.priceToSalesTrailing12Months || 0,
    pbRatio: stats?.priceToBook || 0,
    evToEbitda: stats?.enterpriseToEbitda || 0,
    debtToEquity: finData?.debtToEquity || 0,
    currentRatio: finData?.currentRatio || 0,
    returnOnEquity: finData?.returnOnEquity || 0,
    returnOnAssets: finData?.returnOnAssets || 0,
    dividendYield: detail?.dividendYield || 0,
  };

  return {
    profile: companyProfile,
    incomeStatements,
    balanceSheets,
    cashFlows,
    keyMetrics,
  };
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export async function searchCompanies(query: string): Promise<SearchResult[]> {
  // validateResult: false — Yahoo's search response occasionally includes quote types
  // (e.g. money-market funds) that fail yahoo-finance2's schema validation.
  const results = await yahooFinance.search(
    query,
    { newsCount: 0, quotesCount: 8 },
    { validateResult: false }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;
  return (results.quotes || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((q: any) => q.quoteType === "EQUITY")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((q: any) => ({
      symbol: q.symbol,
      name: q.shortname ?? q.longname ?? q.symbol,
      exchange: q.exchange ?? "",
    }));
}

export interface QuoteProfile {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  country: string;
  currency: string;
  price: number;
}

/**
 * Lettvektsversjon av fetchFundamentalData — kun kurs, sektor og land. Brukes av
 * porteføljemodulen der vi trenger dette for potensielt mange tickere samtidig,
 * uten den tyngre regnskapshistorikken fetchFundamentalData henter.
 */
export async function fetchQuoteProfile(ticker: string): Promise<QuoteProfile> {
  const t = ticker.toUpperCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = await yahooFinance.quoteSummary(t, {
    modules: ["summaryProfile", "price"] as const,
  });

  const price = q.price;
  const profile = q.summaryProfile;

  if (!price?.longName && !price?.shortName) {
    throw new Error(`Fant ikke selskap med ticker: ${t}`);
  }

  return {
    symbol: t,
    companyName: price?.longName || price?.shortName || t,
    sector: profile?.sector || "Ukjent",
    industry: profile?.industry || "",
    country: profile?.country || "Ukjent",
    currency: price?.currency || "NOK",
    price: price?.regularMarketPrice || 0,
  };
}

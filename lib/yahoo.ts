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

export async function fetchFundamentalData(ticker: string): Promise<FundamentalData> {
  const t = ticker.toUpperCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = await yahooFinance.quoteSummary(t, {
    modules: [
      "summaryProfile",
      "summaryDetail",
      "defaultKeyStatistics",
      "financialData",
      "price",
      "incomeStatementHistory",
      "balanceSheetHistory",
      "cashflowStatementHistory",
    ] as const,
  });

  const price = q.price;
  const profile = q.summaryProfile;
  const detail = q.summaryDetail;
  const stats = q.defaultKeyStatistics;
  const finData = q.financialData;
  const financials = q;

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
  };

  // Income statements
  const incomeStatements: IncomeStatement[] = (
    financials.incomeStatementHistory?.incomeStatementHistory || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).map((s: any) => {
    const rev = s.totalRevenue || 0;
    const gp = s.grossProfit || 0;
    const oi = s.operatingIncome || 0;
    const ni = s.netIncome || 0;
    const ebitda = s.ebitda || 0;
    return {
      date: s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : "",
      revenue: rev,
      grossProfit: gp,
      operatingIncome: oi,
      netIncome: ni,
      ebitda,
      grossProfitRatio: rev ? gp / rev : 0,
      operatingIncomeRatio: rev ? oi / rev : 0,
      netIncomeRatio: rev ? ni / rev : 0,
      eps: s.basicEPS || 0,
    };
  });

  // Balance sheets
  const balanceSheets: BalanceSheet[] = (
    financials.balanceSheetHistory?.balanceSheetStatements || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).map((s: any) => ({
    date: s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : "",
    totalAssets: s.totalAssets || 0,
    totalLiabilities: s.totalLiab || 0,
    totalStockholdersEquity: s.totalStockholderEquity || 0,
    totalDebt: s.longTermDebt || 0,
    cashAndCashEquivalents: s.cash || 0,
  }));

  // Cash flows
  const cashFlows: CashFlowStatement[] = (
    financials.cashflowStatementHistory?.cashflowStatements || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).map((s: any) => {
    const ocf = s.totalCashFromOperatingActivities || 0;
    const capex = s.capitalExpenditures || 0;
    return {
      date: s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : "",
      operatingCashFlow: ocf,
      capitalExpenditure: capex,
      freeCashFlow: ocf + capex, // capex is typically negative
      dividendsPaid: s.dividendsPaid || 0,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any = await yahooFinance.search(query, { newsCount: 0, quotesCount: 8 });
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

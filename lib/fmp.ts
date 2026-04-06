const FMP_BASE = "https://financialmodelingprep.com/api";

function apiKey() {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("FMP_API_KEY er ikke satt");
  return key;
}

async function fetchFMP<T>(path: string): Promise<T> {
  const url = `${FMP_BASE}${path}${path.includes("?") ? "&" : "?"}apikey=${apiKey()}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`FMP-feil ${res.status}: ${path}`);
  const data = await res.json();
  if (data && typeof data === "object" && !Array.isArray(data) && "Error Message" in data) {
    throw new Error(String(data["Error Message"]));
  }
  return data as T;
}

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
  volAvg: number;
  website: string;
  ceo: string;
  fullTimeEmployees: string;
  ipoDate: string;
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
  epsdiluted: number;
}

export interface BalanceSheet {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  totalStockholdersEquity: number;
  totalDebt: number;
  netDebt: number;
  cashAndCashEquivalents: number;
  totalCurrentAssets: number;
  totalCurrentLiabilities: number;
  goodwillAndIntangibleAssets: number;
}

export interface CashFlowStatement {
  date: string;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
  dividendsPaid: number;
  netCashUsedForInvestingActivites: number;
  netCashUsedProvidedByFinancingActivities: number;
}

export interface KeyMetrics {
  date: string;
  revenuePerShare: number;
  netIncomePerShare: number;
  peRatio: number;
  priceToSalesRatio: number;
  pbRatio: number;
  evToEbitda: number;
  debtToEquity: number;
  currentRatio: number;
  returnOnEquity: number;
  returnOnAssets: number;
  returnOnCapitalEmployed: number;
  dividendYield: number;
  payoutRatio: number;
  interestCoverage: number;
  enterpriseValue: number;
}

export interface FundamentalData {
  profile: CompanyProfile;
  incomeStatements: IncomeStatement[];
  balanceSheets: BalanceSheet[];
  cashFlows: CashFlowStatement[];
  keyMetrics: KeyMetrics[];
}

export async function fetchFundamentalData(ticker: string): Promise<FundamentalData> {
  const t = ticker.toUpperCase();
  const [profileRes, incomeRes, balanceRes, cashflowRes, metricsRes] = await Promise.allSettled([
    fetchFMP<CompanyProfile[]>(`/v3/profile/${t}`),
    fetchFMP<IncomeStatement[]>(`/v3/income-statement/${t}?limit=5`),
    fetchFMP<BalanceSheet[]>(`/v3/balance-sheet-statement/${t}?limit=5`),
    fetchFMP<CashFlowStatement[]>(`/v3/cash-flow-statement/${t}?limit=5`),
    fetchFMP<KeyMetrics[]>(`/v3/key-metrics/${t}?limit=5`),
  ]);

  if (profileRes.status === "rejected") {
    throw new Error(`Profil-feil: ${profileRes.reason instanceof Error ? profileRes.reason.message : profileRes.reason}`);
  }
  const profiles = profileRes.value;
  if (!profiles || profiles.length === 0) {
    throw new Error(`Fant ikke selskap med ticker: ${t} (tom respons fra FMP)`);
  }

  return {
    profile: profiles[0],
    incomeStatements: incomeRes.status === "fulfilled" ? (incomeRes.value || []) : [],
    balanceSheets: balanceRes.status === "fulfilled" ? (balanceRes.value || []) : [],
    cashFlows: cashflowRes.status === "fulfilled" ? (cashflowRes.value || []) : [],
    keyMetrics: metricsRes.status === "fulfilled" ? (metricsRes.value || []) : [],
  };
}

export interface SearchResult {
  symbol: string;
  name: string;
  currency: string;
  stockExchange: string;
  exchangeShortName: string;
}

export async function searchCompanies(query: string): Promise<SearchResult[]> {
  const results = await fetchFMP<SearchResult[]>(
    `/v3/search?query=${encodeURIComponent(query)}&limit=10&exchange=OSL`
  );
  return results || [];
}

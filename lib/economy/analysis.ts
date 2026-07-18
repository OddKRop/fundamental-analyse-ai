import type { Transaction } from "./db";

/**
 * Kategorier som representerer penger som beveger seg mellom egne konti, eller som
 * allerede er talt med et annet sted (Mastercard-oppgjør fra brukskonto duplikerer
 * de enkelte kjøpene som allerede er importert fra selve Mastercard-kontoen).
 * Ekskluderes fra inntekt/utgift-summeringer for å unngå dobbelttelling.
 */
const NON_SPEND_CATEGORIES = new Set(["Intern overføring", "Kredittkort"]);

function isSpendRelevant(t: Transaction): boolean {
  return !t.category || !NON_SPEND_CATEGORIES.has(t.category);
}

export interface MonthSummary {
  month: string; // "2026-01"
  income: number;
  expense: number;
  savings: number;
  savingsRate: number; // 0..1
}

export function summarizeByMonth(transactions: Transaction[]): MonthSummary[] {
  const map = new Map<string, { income: number; expense: number }>();

  for (const t of transactions) {
    if (!isSpendRelevant(t)) continue;
    const month = t.date.slice(0, 7);
    const entry = map.get(month) ?? { income: 0, expense: 0 };
    if (t.direction === "inn") entry.income += t.amount;
    else entry.expense += t.amount;
    map.set(month, entry);
  }

  return Array.from(map.entries())
    .map(([month, { income, expense }]) => ({
      month,
      income,
      expense,
      savings: income - expense,
      savingsRate: income > 0 ? (income - expense) / income : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export interface CategoryTotal {
  category: string;
  total: number;
  count: number;
}

export function summarizeByCategory(transactions: Transaction[]): CategoryTotal[] {
  const map = new Map<string, { total: number; count: number }>();

  for (const t of transactions) {
    if (t.direction !== "ut" || !isSpendRelevant(t)) continue;
    const category = t.category ?? "Annet";
    const entry = map.get(category) ?? { total: 0, count: 0 };
    entry.total += t.amount;
    entry.count += 1;
    map.set(category, entry);
  }

  return Array.from(map.entries())
    .map(([category, { total, count }]) => ({ category, total, count }))
    .sort((a, b) => b.total - a.total);
}

export interface MerchantTotal {
  merchant: string;
  total: number;
  count: number;
  avg: number;
}

export function topMerchants(transactions: Transaction[], limit = 10): MerchantTotal[] {
  const map = new Map<string, { total: number; count: number }>();

  for (const t of transactions) {
    if (t.direction !== "ut" || !t.merchant || !isSpendRelevant(t)) continue;
    const entry = map.get(t.merchant) ?? { total: 0, count: 0 };
    entry.total += t.amount;
    entry.count += 1;
    map.set(t.merchant, entry);
  }

  return Array.from(map.entries())
    .map(([merchant, { total, count }]) => ({ merchant, total, count, avg: total / count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

const RECURRING_CATEGORIES = new Set([
  "Strøm",
  "Internett/Telefoni",
  "Forsikring",
  "Abonnement",
  "Lån",
  "Studielån",
]);

export interface RecurringCost {
  description: string;
  category: string;
  avgAmount: number;
  occurrences: number;
}

export function recurringCosts(transactions: Transaction[]): RecurringCost[] {
  const map = new Map<string, { category: string; total: number; count: number }>();

  for (const t of transactions) {
    if (t.direction !== "ut" || !t.category || !RECURRING_CATEGORIES.has(t.category)) continue;
    const key = t.merchant ?? t.description;
    const entry = map.get(key) ?? { category: t.category, total: 0, count: 0 };
    entry.total += t.amount;
    entry.count += 1;
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .map(([description, { category, total, count }]) => ({
      description,
      category,
      avgAmount: total / count,
      occurrences: count,
    }))
    .sort((a, b) => b.avgAmount * b.occurrences - a.avgAmount * a.occurrences);
}

export interface ExcludedSummary {
  total: number;
  count: number;
}

/**
 * Sum av utgifter som er holdt utenfor inntekt/utgift/kategori-tallene fordi de
 * duplikerer forbruk talt et annet sted (se NON_SPEND_CATEGORIES) — til bruk i en
 * forklarende fotnote i UI-et.
 */
export function summarizeExcluded(transactions: Transaction[]): ExcludedSummary {
  let total = 0;
  let count = 0;
  for (const t of transactions) {
    if (t.direction === "ut" && t.category && NON_SPEND_CATEGORIES.has(t.category)) {
      total += t.amount;
      count += 1;
    }
  }
  return { total, count };
}

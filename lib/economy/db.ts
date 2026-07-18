import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL og SUPABASE_SERVICE_KEY må være satt");
    _client = createClient(url, key);
  }
  return _client;
}

export type AccountId = "brukskonto" | "felleskonto" | "mastercard";

export interface Account {
  id: AccountId;
  name: string;
  type: "konto" | "kredittkort";
  currency: string;
}

export const ACCOUNTS: Account[] = [
  { id: "brukskonto", name: "Brukskonto", type: "konto", currency: "NOK" },
  { id: "felleskonto", name: "Felleskonto", type: "konto", currency: "NOK" },
  { id: "mastercard", name: "Mastercard", type: "kredittkort", currency: "NOK" },
];

export interface Transaction {
  id?: number;
  account_id: AccountId;
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number;
  direction: "inn" | "ut";
  category: string | null;
  merchant: string | null;
  dedup_hash: string;
  imported_at?: string;
}

export async function ensureAccountsExist(): Promise<void> {
  const { error } = await getClient().from("accounts").upsert(ACCOUNTS, { onConflict: "id" });
  if (error) throw new Error(`Supabase-feil (accounts): ${error.message}`);
}

export async function insertTransactions(
  rows: Transaction[]
): Promise<{ inserted: number; duplicates: number }> {
  if (rows.length === 0) return { inserted: 0, duplicates: 0 };

  const { data, error } = await getClient()
    .from("transactions")
    .upsert(rows, { onConflict: "dedup_hash", ignoreDuplicates: true })
    .select("dedup_hash");

  if (error) throw new Error(`Supabase-feil (transactions): ${error.message}`);

  const inserted = data?.length ?? 0;
  return { inserted, duplicates: rows.length - inserted };
}

export interface TransactionFilter {
  accountId?: AccountId;
  from?: string;
  to?: string;
}

export async function getTransactions(filter: TransactionFilter = {}): Promise<Transaction[]> {
  let query = getClient().from("transactions").select("*").order("date", { ascending: false });

  if (filter.accountId) query = query.eq("account_id", filter.accountId);
  if (filter.from) query = query.gte("date", filter.from);
  if (filter.to) query = query.lte("date", filter.to);

  try {
    const { data, error } = await query;
    if (error || !data) return [];
    return data as Transaction[];
  } catch {
    return [];
  }
}

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

export interface Holding {
  id?: number;
  ticker: string;
  quantity: number;
  avg_price: number;
  currency: string;
  broker: string | null;
  created_at?: string;
}

export async function getHoldings(): Promise<Holding[]> {
  try {
    const { data, error } = await getClient().from("holdings").select("*").order("created_at");
    if (error || !data) return [];
    return data as Holding[];
  } catch {
    return [];
  }
}

export async function addHolding(holding: Holding): Promise<void> {
  const { error } = await getClient().from("holdings").insert(holding);
  if (error) throw new Error(`Supabase-feil (holdings): ${error.message}`);
}

export async function bulkAddHoldings(holdings: Holding[]): Promise<void> {
  if (holdings.length === 0) return;
  const { error } = await getClient().from("holdings").insert(holdings);
  if (error) throw new Error(`Supabase-feil (holdings): ${error.message}`);
}

export async function deleteHolding(id: number): Promise<void> {
  const { error } = await getClient().from("holdings").delete().eq("id", id);
  if (error) throw new Error(`Supabase-feil (holdings): ${error.message}`);
}

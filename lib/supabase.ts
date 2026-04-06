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

export interface StoredAnalysis {
  ticker: string;
  company_name: string;
  sector: string;
  market_cap: number;
  price: number;
  currency: string;
  analysis_text: string;
  updated_at: string;
}

export async function getAnalysis(ticker: string): Promise<StoredAnalysis | null> {
  const { data, error } = await getClient()
    .from("analyses")
    .select("*")
    .eq("ticker", ticker.toUpperCase())
    .single();

  if (error || !data) return null;
  return data as StoredAnalysis;
}

export async function getAllAnalyses(): Promise<StoredAnalysis[]> {
  const { data, error } = await getClient()
    .from("analyses")
    .select("ticker, company_name, sector, market_cap, price, currency, updated_at")
    .order("company_name");

  if (error || !data) return [];
  return data as StoredAnalysis[];
}

export async function upsertAnalysis(analysis: StoredAnalysis): Promise<void> {
  const { error } = await getClient().from("analyses").upsert(analysis, { onConflict: "ticker" });
  if (error) throw new Error(`Supabase-feil: ${error.message}`);
}

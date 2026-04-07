import { NextRequest } from "next/server";
import { fetchFundamentalData } from "@/lib/yahoo";
import { generateAnalysis } from "@/lib/claude";
import { upsertAnalysis } from "@/lib/supabase";
import { OSLO_BORS_TICKERS } from "@/lib/tickers";

export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided =
    request.nextUrl.searchParams.get("secret") ??
    request.headers.get("authorization")?.replace("Bearer ", "");
  return provided === secret;
}

async function refreshTicker(ticker: string): Promise<{ ticker: string; ok: boolean; error?: string }> {
  try {
    const data = await fetchFundamentalData(ticker);
    const analysisText = await generateAnalysis(data, ticker);
    await upsertAnalysis({
      ticker: ticker.toUpperCase(),
      company_name: data.profile.companyName,
      sector: data.profile.sector,
      market_cap: data.profile.mktCap,
      price: data.profile.price,
      currency: data.profile.currency,
      analysis_text: analysisText,
      updated_at: new Date().toISOString(),
    });
    return { ticker, ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Ukjent feil";
    console.error(`[refresh] ${ticker}: ${error}`);
    return { ticker, ok: false, error };
  }
}

// POST /api/admin/refresh?secret=XXX&ticker=EQNR.OL  → refresh én ticker
// POST /api/admin/refresh?secret=XXX                  → refresh alle
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Ikke autorisert" }, { status: 401 });
  }

  const ticker = request.nextUrl.searchParams.get("ticker");

  if (ticker) {
    const result = await refreshTicker(ticker);
    return Response.json(result, { status: result.ok ? 200 : 500 });
  }

  // Refresh alle — kjøres sekvensielt for å unngå rate limiting
  const results = [];
  for (const entry of OSLO_BORS_TICKERS) {
    const result = await refreshTicker(entry.ticker);
    results.push(result);
  }

  const failed = results.filter((r) => !r.ok);
  return Response.json({
    total: results.length,
    ok: results.length - failed.length,
    failed: failed.length,
    results,
  });
}

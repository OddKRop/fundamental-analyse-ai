import { NextRequest } from "next/server";
import { fetchFundamentalData } from "@/lib/yahoo";
import { generateAnalysis } from "@/lib/claude";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");

  if (!ticker) {
    return new Response(JSON.stringify({ error: "Ticker mangler" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const data = await fetchFundamentalData(ticker);
    const stream = await generateAnalysis(data, ticker);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Company-Name": encodeURIComponent(data.profile.companyName || ticker),
        "X-Sector": encodeURIComponent(data.profile.sector || ""),
        "X-Market-Cap": String(data.profile.mktCap || 0),
        "X-Price": String(data.profile.price || 0),
        "X-Currency": data.profile.currency || "USD",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { addHolding } from "@/lib/portfolio/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ticker = String(body.ticker ?? "").trim().toUpperCase();
    const quantity = Number(body.quantity);
    const avgPrice = Number(body.avg_price);
    const currency = String(body.currency ?? "NOK").trim().toUpperCase() || "NOK";

    if (!ticker || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(avgPrice) || avgPrice <= 0) {
      return NextResponse.json({ error: "Ugyldige verdier" }, { status: 400 });
    }

    await addHolding({ ticker, quantity, avg_price: avgPrice, currency, broker: null });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

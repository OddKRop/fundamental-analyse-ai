import { NextRequest, NextResponse } from "next/server";
import { bulkAddHoldings, type Holding } from "@/lib/portfolio/db";

function splitCsvLine(line: string, delimiter = ";"): string[] {
  return line.split(delimiter).map((f) => f.trim());
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Ingen fil mottatt" }, { status: 400 });
    }

    const content = await file.text();
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const [, ...rows] = lines; // hopp over header

    const holdings: Holding[] = [];
    for (const line of rows) {
      const fields = splitCsvLine(line);
      if (fields.length < 3) continue;

      const [ticker, quantityStr, avgPriceStr, currency] = fields;
      const quantity = Number(quantityStr.replace(",", "."));
      const avgPrice = Number(avgPriceStr.replace(",", "."));
      if (!ticker || !Number.isFinite(quantity) || !Number.isFinite(avgPrice)) continue;

      holdings.push({
        ticker: ticker.toUpperCase(),
        quantity,
        avg_price: avgPrice,
        currency: (currency || "NOK").toUpperCase(),
        broker: null,
      });
    }

    if (holdings.length === 0) {
      return NextResponse.json({ error: "Fant ingen gyldige beholdninger i filen" }, { status: 400 });
    }

    await bulkAddHoldings(holdings);
    return NextResponse.json({ inserted: holdings.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

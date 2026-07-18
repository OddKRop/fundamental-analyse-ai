import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getTransactions } from "@/lib/economy/db";
import {
  summarizeByMonth,
  summarizeByCategory,
  topMerchants,
  recurringCosts,
} from "@/lib/economy/analysis";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function formatKr(n: number): string {
  return `${Math.round(n).toLocaleString("no-NO")} kr`;
}

export async function POST() {
  try {
    const transactions = await getTransactions();
    if (transactions.length === 0) {
      return NextResponse.json({ error: "Ingen data å analysere" }, { status: 400 });
    }

    const months = summarizeByMonth(transactions);
    const categories = summarizeByCategory(transactions);
    const merchants = topMerchants(transactions, 15);
    const recurring = recurringCosts(transactions);

    const summary = `
## Månedsoversikt
${months
  .map(
    (m) =>
      `${m.month}: inntekt ${formatKr(m.income)}, utgift ${formatKr(m.expense)}, sparing ${formatKr(m.savings)} (${(m.savingsRate * 100).toFixed(0)}%)`
  )
  .join("\n")}

## Kategorier (utgifter)
${categories.map((c) => `${c.category}: ${formatKr(c.total)} (${c.count} transaksjoner)`).join("\n")}

## Topp kjøpesteder
${merchants.map((m) => `${m.merchant}: ${formatKr(m.total)} (${m.count} kjøp, snitt ${formatKr(m.avg)})`).join("\n")}

## Faste kostnader
${recurring.map((r) => `${r.description} (${r.category}): ${formatKr(r.avgAmount)} x ${r.occurrences}`).join("\n")}
`.trim();

    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      system:
        "Du er en norsk personlig økonomirådgiver. Analyser tallene og skriv en kort, konkret vurdering på norsk av hvor brukeren kan spare penger. Vær spesifikk — pek på konkrete kategorier eller kjøpesteder, ikke generiske råd. Maks 4-5 avsnitt, ingen punktlister.",
      messages: [{ role: "user", content: summary }],
    });

    const block = message.content[0];
    const insight = block.type === "text" ? block.text : "";

    return NextResponse.json({ insight });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

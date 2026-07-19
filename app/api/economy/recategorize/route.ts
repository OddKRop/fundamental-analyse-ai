import { NextResponse } from "next/server";
import { getTransactions, updateTransactionCategory } from "@/lib/economy/db";
import { categorizeTransactions } from "@/lib/economy/categorize";

/**
 * Kjører kategorisering på nytt for alle transaksjoner som i dag ligger i "Annet"
 * — engangs-verktøy for å rydde opp etter forbedringer i categorize.ts (nye regler,
 * eller fikser i Claude-fallback-parsingen).
 */
export async function POST() {
  try {
    const all = await getTransactions();
    const toFix = all.filter((t) => t.category === "Annet");

    if (toFix.length === 0) {
      return NextResponse.json({ checked: 0, updated: 0, breakdown: {} });
    }

    const recategorized = await categorizeTransactions(toFix);

    let updated = 0;
    const breakdown: Record<string, number> = {};

    for (let i = 0; i < toFix.length; i++) {
      const before = toFix[i];
      const after = recategorized[i];
      if (after.category && after.category !== "Annet" && before.id) {
        await updateTransactionCategory(before.id, after.category);
        updated++;
        breakdown[after.category] = (breakdown[after.category] ?? 0) + 1;
      }
    }

    return NextResponse.json({ checked: toFix.length, updated, breakdown });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { parseBankExport } from "@/lib/economy/parseBank";
import { parseMastercardExport } from "@/lib/economy/parseMastercard";
import { categorizeTransactions } from "@/lib/economy/categorize";
import { ensureAccountsExist, insertTransactions, type AccountId } from "@/lib/economy/db";

const VALID_ACCOUNTS: AccountId[] = ["brukskonto", "felleskonto", "mastercard"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const accountId = formData.get("accountId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Ingen fil mottatt" }, { status: 400 });
    }
    if (typeof accountId !== "string" || !VALID_ACCOUNTS.includes(accountId as AccountId)) {
      return NextResponse.json({ error: "Ugyldig konto" }, { status: 400 });
    }

    const isXlsx = file.name.toLowerCase().endsWith(".xlsx");
    const parsed = isXlsx
      ? await parseMastercardExport(await file.arrayBuffer())
      : await parseBankExport(await file.text(), accountId as AccountId);

    if (parsed.length === 0) {
      return NextResponse.json({ error: "Fant ingen transaksjoner i filen" }, { status: 400 });
    }

    const categorized = await categorizeTransactions(parsed);

    await ensureAccountsExist();
    const { inserted, duplicates } = await insertTransactions(categorized);

    return NextResponse.json({ inserted, duplicates, total: parsed.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

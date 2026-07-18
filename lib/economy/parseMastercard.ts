import * as XLSX from "xlsx";
import { sha256Hex } from "@/lib/auth";
import type { Transaction } from "./db";

interface RawRow {
  Dato: Date | string | number;
  Beskrivelse: string;
  "Inn (kr)": number;
  "Ut (kr)": number;
  Kjøpested: string;
}

function toIsoDate(value: Date | string | number): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

/**
 * Parser for "Mastercard_oversikt.xlsx" — bruker arket "Transaksjoner",
 * som allerede er strukturert med kolonnene Dato, Beskrivelse, Inn (kr), Ut (kr), Kjøpested.
 */
export async function parseMastercardExport(buffer: ArrayBuffer): Promise<Transaction[]> {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
  const sheet = workbook.Sheets["Transaksjoner"];
  if (!sheet) throw new Error('Fant ikke arket "Transaksjoner" i xlsx-filen');

  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: 0 });
  const transactions: Transaction[] = [];

  for (const row of rows) {
    const date = toIsoDate(row.Dato);
    const description = String(row.Beskrivelse ?? "").trim();
    const merchant = String(row["Kjøpested"] ?? "").trim() || null;
    const inn = Number(row["Inn (kr)"]) || 0;
    const ut = Number(row["Ut (kr)"]) || 0;

    const direction: "inn" | "ut" = ut !== 0 ? "ut" : "inn";
    const amount = direction === "ut" ? ut : inn;
    if (!description || amount === 0) continue;

    const dedup_hash = await sha256Hex(
      `mastercard|${date}|${description}|${amount.toFixed(2)}|${direction}`
    );

    transactions.push({
      account_id: "mastercard",
      date,
      description,
      amount,
      direction,
      category: null,
      merchant,
      dedup_hash,
    });
  }

  return transactions;
}

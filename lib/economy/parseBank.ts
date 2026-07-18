import { sha256Hex } from "@/lib/auth";
import type { AccountId, Transaction } from "./db";

function splitCsvLine(line: string, delimiter = ";"): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function toIsoDate(norwegianDate: string): string {
  const [day, month, year] = norwegianDate.split(".");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Parser for de norske banktekstfilene ("Siste transaksjoner <konto>.txt"):
 * ;-delimitert, sitert CSV med kolonnene Dato;Forklaring;Rentedato;Ut fra konto;Inn på konto
 */
export async function parseBankExport(
  content: string,
  accountId: AccountId
): Promise<Transaction[]> {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const [, ...rows] = lines; // hopp over header

  const transactions: Transaction[] = [];

  for (const line of rows) {
    const fields = splitCsvLine(line);
    if (fields.length < 5) continue;

    const [dateStr, description, , utFraKonto, innPaKonto] = fields;
    const date = toIsoDate(dateStr.trim());
    const desc = description.trim();

    const ut = parseFloat(utFraKonto.replace(",", "."));
    const inn = parseFloat(innPaKonto.replace(",", "."));

    const direction: "inn" | "ut" = !isNaN(ut) && ut !== 0 ? "ut" : "inn";
    const amount = direction === "ut" ? ut : inn;
    if (isNaN(amount)) continue;

    const dedup_hash = await sha256Hex(
      `${accountId}|${date}|${desc}|${amount.toFixed(2)}|${direction}`
    );

    transactions.push({
      account_id: accountId,
      date,
      description: desc,
      amount,
      direction,
      category: null,
      merchant: null,
      dedup_hash,
    });
  }

  return transactions;
}

import Anthropic from "@anthropic-ai/sdk";
import type { Transaction } from "./db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const CATEGORIES = [
  "Dagligvare",
  "Restaurant/Take-away",
  "Transport",
  "Drivstoff",
  "Bolig",
  "Strøm",
  "Internett/Telefoni",
  "Forsikring",
  "Lån",
  "Studielån",
  "Kredittkort",
  "Lønn",
  "Intern overføring",
  "Overføring privat",
  "Abonnement",
  "Alkohol",
  "Spill",
  "Helse",
  "Hus og hjem",
  "Klær",
  "Elektronikk",
  "Sparing/Investering",
  "Annet",
] as const;

const RULES: { pattern: RegExp; category: string }[] = [
  { pattern: /statens l.nekasse/i, category: "Studielån" },
  { pattern: /\blån\b/i, category: "Lån" },
  { pattern: /dnb kort/i, category: "Kredittkort" },
  { pattern: /skadeforsikring|gjensidige|tryg\b|fremtind/i, category: "Forsikring" },
  { pattern: /fortum|strøm/i, category: "Strøm" },
  { pattern: /altifiber|telenor|telia|ice\.no/i, category: "Internett/Telefoni" },
  { pattern: /l.nn|skatteetaten/i, category: "Lønn" },
  { pattern: /overføring mellom egne konti/i, category: "Intern overføring" },
  { pattern: /vipps|overføring/i, category: "Overføring privat" },
  { pattern: /fondshandel|aksje|fond\b/i, category: "Sparing/Investering" },
  { pattern: /meny|extra|rema|coop|kiwi|joker|europris|bunnpris|\bspar\b/i, category: "Dagligvare" },
  { pattern: /ruter|skyss|ntg|bomstasjon|voiscooters|ryde\b|tier\b|scooter/i, category: "Transport" },
  { pattern: /circle k|esso|shell|uno-?x|st1\b/i, category: "Drivstoff" },
  { pattern: /wolt|foodora|burger|kafe|restaurant|partygrill|sushi/i, category: "Restaurant/Take-away" },
  { pattern: /apple\.com|netflix|spotify|hbomax|disney\+/i, category: "Abonnement" },
  { pattern: /vinmonopolet/i, category: "Alkohol" },
  { pattern: /norsk tipping/i, category: "Spill" },
  { pattern: /specsavers|apotek|rikshospitalet|legevakt/i, category: "Helse" },
  { pattern: /biltema|jernia|clas ohlson|obs bygg/i, category: "Hus og hjem" },
];

export function categorizeRuleBased(description: string, merchant: string | null): string | null {
  const text = `${description} ${merchant ?? ""}`;
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.category;
  }
  return null;
}

async function categorizeWithClaude(texts: string[]): Promise<Record<string, string>> {
  if (texts.length === 0) return {};

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4000,
    system: `Du kategoriserer norske banktransaksjoner basert på beskrivelsesteksten. Svar KUN med gyldig JSON — et objekt der hver nøkkel er transaksjonsteksten (nøyaktig som gitt) og hver verdi er én kategori fra denne listen: ${CATEGORIES.join(", ")}. Bruk "Annet" hvis ingen passer. Ingen andre kategorier, ingen forklaring, kun JSON-objektet.`,
    messages: [{ role: "user", content: texts.join("\n") }],
  });

  const block = message.content[0];
  if (block.type !== "text") return {};

  try {
    return JSON.parse(block.text);
  } catch {
    return {};
  }
}

/**
 * Kategoriserer en liste med transaksjoner: regelbasert først (rask, gratis),
 * deretter Claude som fallback for tekster ingen regel traff.
 */
export async function categorizeTransactions(transactions: Transaction[]): Promise<Transaction[]> {
  const uncategorized = new Set<string>();

  const withRuleCategory = transactions.map((t) => {
    const category = categorizeRuleBased(t.description, t.merchant);
    if (!category) uncategorized.add(t.description);
    return { ...t, category };
  });

  if (uncategorized.size === 0) return withRuleCategory;

  const claudeResult = await categorizeWithClaude(Array.from(uncategorized));

  return withRuleCategory.map((t) =>
    t.category ? t : { ...t, category: claudeResult[t.description] ?? "Annet" }
  );
}

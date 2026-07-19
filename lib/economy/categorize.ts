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
  "Fritid",
  "Gebyrer",
  "Annet",
] as const;

const RULES: { pattern: RegExp; category: string }[] = [
  { pattern: /statens l.nekasse/i, category: "Studielån" },
  { pattern: /kontoregulering.*dnb bank asa/i, category: "Intern overføring" },
  { pattern: /skyldig beløp fra forrige faktura|^innbetaling$/i, category: "Kredittkort" },
  { pattern: /dnb kort|dnb finans/i, category: "Kredittkort" },
  { pattern: /\blån\b/i, category: "Lån" },
  { pattern: /skadeforsikring|gjensidige|tryg\b|fremtind/i, category: "Forsikring" },
  { pattern: /fortum|strøm/i, category: "Strøm" },
  { pattern: /altifiber|telenor|telia|ice\.no/i, category: "Internett/Telefoni" },
  { pattern: /l.nn|skatteetaten/i, category: "Lønn" },
  { pattern: /overføring mellom egne konti/i, category: "Intern overføring" },
  { pattern: /vipps|overføring/i, category: "Overføring privat" },
  { pattern: /fondshandel|aksje|fond\b/i, category: "Sparing/Investering" },
  {
    pattern: /meny|extra|rema|coop|kiwi|joker|europris|bunnpris|eurospar|\bspar\b/i,
    category: "Dagligvare",
  },
  {
    pattern: /ruter|skyss|ntg|bomstasjon|voiscooters|ryde\b|tier\b|scooter|easypark|tesla|\bvolt\b/i,
    category: "Transport",
  },
  { pattern: /circle k|esso|shell|uno-?x|st1\b/i, category: "Drivstoff" },
  {
    pattern: /wolt|foodora|burger|kafe|cafe|restaura|partygrill|sushi|pizza|\biss\b.*-\s*sk/i,
    category: "Restaurant/Take-away",
  },
  {
    pattern: /apple\.com|netflix|spotify|hbomax|disney\+|bonnier publications|claude\.ai/i,
    category: "Abonnement",
  },
  { pattern: /vinmonopolet/i, category: "Alkohol" },
  { pattern: /norsk tipping|steamgames|microsoft.*xbox/i, category: "Spill" },
  { pattern: /specsavers|apotek|rikshospitalet|legevakt|colosseum tannl/i, category: "Helse" },
  {
    pattern: /biltema|jernia|clas ohl|obs bygg|jem\s*&\s*fix|rørlegg|huseiernes landsforbund|jernva/i,
    category: "Hus og hjem",
  },
  { pattern: /care of carl|henriks herre/i, category: "Klær" },
  { pattern: /elektroimport/i, category: "Elektronikk" },
  { pattern: /golfklubb|golf\.no|adlibris|norli|billettservice/i, category: "Fritid" },
  { pattern: /inkassovarsel|purregebyr|fakturagebyr/i, category: "Gebyrer" },
  { pattern: /flyt as/i, category: "Abonnement" },
];

export function categorizeRuleBased(description: string, merchant: string | null): string | null {
  const text = `${description} ${merchant ?? ""}`.trim();
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.category;
  }
  return null;
}

const CLAUDE_BATCH_SIZE = 40; // holder svaret trygt under max_tokens uansett batch-størrelse

async function categorizeBatch(texts: string[]): Promise<Record<string, string>> {
  if (texts.length === 0) return {};

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4000,
    system: `Du kategoriserer norske banktransaksjoner basert på beskrivelsesteksten. Svar KUN med gyldig JSON — et objekt der hver nøkkel er transaksjonsteksten (nøyaktig som gitt) og hver verdi er én kategori fra denne listen: ${CATEGORIES.join(", ")}. Bruk "Annet" hvis ingen passer. Ingen andre kategorier, ingen forklaring, kun JSON-objektet — ikke pakk det inn i \`\`\`.`,
    messages: [{ role: "user", content: texts.join("\n") }],
  });

  const block = message.content[0];
  if (block.type !== "text") return {};

  // Claude wraps the response in ```json fences fairly often despite being told not to.
  const jsonText = block.text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();

  try {
    return JSON.parse(jsonText);
  } catch {
    return {};
  }
}

async function categorizeWithClaude(texts: string[]): Promise<Record<string, string>> {
  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += CLAUDE_BATCH_SIZE) {
    batches.push(texts.slice(i, i + CLAUDE_BATCH_SIZE));
  }

  const results = await Promise.all(batches.map(categorizeBatch));
  return Object.assign({}, ...results);
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

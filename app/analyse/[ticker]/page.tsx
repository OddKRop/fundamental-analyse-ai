import { getAnalysis } from "@/lib/supabase";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker } = await params;
  return { title: `${ticker.toUpperCase()} — Fundamental Analyse` };
}

function parseAndRender(text: string) {
  const lines = text.split("\n");
  const sections: { heading: string; content: string }[] = [];
  let currentHeading = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentHeading || currentContent.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
      }
      currentHeading = line.slice(3).trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentHeading || currentContent.length > 0) {
    sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
  }

  return sections;
}

function formatMarketCap(n: number, currency: string): string {
  if (!n) return "";
  if (n >= 1e9) return `${currency} ${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${currency} ${(n / 1e6).toFixed(1)}M`;
  return `${currency} ${n.toLocaleString("no-NO")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("no-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function AnalysePage({ params }: Props) {
  const { ticker } = await params;
  const upperTicker = ticker.toUpperCase();
  const analysis = await getAnalysis(upperTicker);

  if (!analysis) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400 font-mono uppercase text-sm tracking-wider mb-4">{upperTicker}</p>
        <h1 className="text-2xl font-bold text-zinc-900 mb-3">Ingen analyse funnet</h1>
        <p className="text-zinc-500 mb-8">
          Dette selskapet er ikke analysert ennå. Analyser oppdateres kvartalsvis.
        </p>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 underline underline-offset-2">
          ← Tilbake til oversikten
        </Link>
      </div>
    );
  }

  const sections = parseAndRender(analysis.analysis_text);

  return (
    <div>
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          ← Alle selskaper
        </Link>
      </div>

      {/* Header */}
      <div className="mb-10 pb-8 border-b border-zinc-100">
        <p className="text-sm font-mono text-zinc-400 uppercase tracking-wider mb-2">{analysis.ticker}</p>
        <h1 className="text-3xl font-bold text-zinc-900 mb-3">{analysis.company_name}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
          {analysis.sector && <span>{analysis.sector}</span>}
          {analysis.market_cap > 0 && (
            <span>
              Markedsverdi:{" "}
              <span className="text-zinc-700 font-medium">
                {formatMarketCap(analysis.market_cap, analysis.currency)}
              </span>
            </span>
          )}
          {analysis.price > 0 && (
            <span>
              Kurs:{" "}
              <span className="text-zinc-700 font-medium">
                {analysis.currency} {analysis.price}
              </span>
            </span>
          )}
          <span className="text-zinc-400">Oppdatert {formatDate(analysis.updated_at)}</span>
        </div>
      </div>

      {/* Analysis */}
      {sections.map((section, i) => (
        <div key={i} className="mb-10">
          {section.heading && (
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
              {section.heading}
            </h2>
          )}
          {section.content.split(/\n\n+/).filter(Boolean).map((para, j) => (
            <p key={j} className="text-zinc-700 leading-relaxed mb-4 last:mb-0">
              {para.trim()}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

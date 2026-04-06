"use client";

import { useEffect, useRef, useState } from "react";

interface Section {
  heading: string;
  content: string;
}

function parseMarkdown(text: string): Section[] {
  const lines = text.split("\n");
  const sections: Section[] = [];
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

function renderParagraphs(content: string) {
  const paragraphs = content.split(/\n\n+/).filter(Boolean);
  return paragraphs.map((para, i) => (
    <p key={i} className="text-zinc-700 leading-relaxed mb-4 last:mb-0">
      {para.trim()}
    </p>
  ));
}

interface Props {
  ticker: string;
  companyName: string;
  sector: string;
  marketCap: number;
  price: number;
  currency: string;
}

export default function AnalysisRenderer({
  ticker,
  companyName,
  sector,
  marketCap,
  price,
  currency,
}: Props) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current = new AbortController();
    setText("");
    setDone(false);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/analyse?ticker=${encodeURIComponent(ticker)}`, {
          signal: abortRef.current!.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Noe gikk galt");
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done: d, value } = await reader.read();
          if (d) break;
          setText((prev) => prev + decoder.decode(value, { stream: true }));
        }

        setDone(true);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      }
    })();

    return () => {
      abortRef.current?.abort();
    };
  }, [ticker]);

  function formatMarketCap(n: number): string {
    if (n >= 1e9) return `${currency} ${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${currency} ${(n / 1e6).toFixed(1)}M`;
    return `${currency} ${n.toLocaleString("no-NO")}`;
  }

  const sections = parseMarkdown(text);

  return (
    <div>
      {/* Company header */}
      <div className="mb-10 pb-8 border-b border-zinc-100">
        <p className="text-sm font-mono text-zinc-400 uppercase tracking-wider mb-2">{ticker}</p>
        <h1 className="text-3xl font-bold text-zinc-900 mb-3">{companyName || ticker}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
          {sector && <span>{sector}</span>}
          {marketCap > 0 && (
            <span>
              Markedsverdi: <span className="text-zinc-700 font-medium">{formatMarketCap(marketCap)}</span>
            </span>
          )}
          {price > 0 && (
            <span>
              Kurs: <span className="text-zinc-700 font-medium">{currency} {price}</span>
            </span>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-medium">Feil ved henting av analyse</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Streaming analysis */}
      {!error && (
        <div>
          {sections.length === 0 && !done && (
            <div className="flex items-center gap-3 text-zinc-400 py-8">
              <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
              <span className="text-sm">Genererer analyse...</span>
            </div>
          )}

          {sections.map((section, i) => (
            <div key={i} className="mb-10">
              {section.heading && (
                <h2 className="text-xl font-semibold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">
                  {section.heading}
                </h2>
              )}
              <div>{renderParagraphs(section.content)}</div>
            </div>
          ))}

          {!done && text && (
            <span className="inline-block w-0.5 h-4 bg-zinc-400 animate-pulse ml-0.5" />
          )}
        </div>
      )}
    </div>
  );
}

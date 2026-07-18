"use client";

import { useState } from "react";

export default function InsightsPanel() {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/economy/insights", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ukjent feil");
      setText(data.insight);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">Sparepotensial</h2>
      {!text && (
        <button
          onClick={generate}
          disabled={loading}
          className="bg-zinc-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Analyserer …" : "Generer AI-analyse"}
        </button>
      )}
      {text && <div className="text-zinc-700 leading-relaxed whitespace-pre-line">{text}</div>}
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </section>
  );
}

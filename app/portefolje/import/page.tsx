"use client";

import { useState } from "react";

type Status = "idle" | "uploading" | "done" | "error";

export default function PortfolioImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [inserted, setInserted] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setStatus("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/portfolio/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ukjent feil");
      setInserted(data.inserted);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setStatus("error");
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2 tracking-tight">Importer beholdninger</h1>
      <p className="text-zinc-500 mb-4 text-sm leading-relaxed">
        Last opp en `;`-delimitert CSV-fil med header <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-600">ticker;antall;gav;valuta</code>.
      </p>
      <pre className="bg-zinc-50 border border-zinc-100 rounded-lg p-3 text-xs text-zinc-600 mb-8 overflow-x-auto">
{`ticker;antall;gav;valuta
EQNR.OL;100;285.50;NOK
DNB.OL;50;220;NOK`}
      </pre>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label
          className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 rounded-xl py-10 cursor-pointer hover:border-zinc-300 transition-colors text-center px-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setFile(e.dataTransfer.files?.[0] ?? null);
            setInserted(null);
            setError(null);
          }}
        >
          <input
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setInserted(null);
              setError(null);
            }}
          />
          <span className="text-zinc-500 text-sm">
            {file ? file.name : "Dra og slipp fil her, eller klikk for å velge"}
          </span>
        </label>

        <button
          type="submit"
          disabled={!file || status === "uploading"}
          className="w-full bg-zinc-900 text-white rounded-lg px-3 py-2 font-medium hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === "uploading" ? "Importerer …" : "Importer"}
        </button>
      </form>

      {inserted !== null && (
        <div className="mt-6 p-4 rounded-lg bg-zinc-50 border border-zinc-100 text-sm text-zinc-700">
          {inserted} beholdninger importert.
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
    </div>
  );
}

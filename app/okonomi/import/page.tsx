"use client";

import { useState } from "react";

type AccountId = "brukskonto" | "felleskonto" | "mastercard";
type Status = "idle" | "uploading" | "done" | "error";

interface ImportResult {
  inserted: number;
  duplicates: number;
  total: number;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState<AccountId>("brukskonto");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: File | null) {
    setFile(f);
    setResult(null);
    setError(null);
    if (!f) return;

    const name = f.name.toLowerCase();
    if (name.endsWith(".xlsx")) setAccountId("mastercard");
    else if (name.includes("felleskonto")) setAccountId("felleskonto");
    else if (name.includes("brukskonto")) setAccountId("brukskonto");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setStatus("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("accountId", accountId);

    try {
      const res = await fetch("/api/economy/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ukjent feil");
      setResult(data);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setStatus("error");
    }
  }

  const isXlsx = file?.name.toLowerCase().endsWith(".xlsx");

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2 tracking-tight">Importer transaksjoner</h1>
      <p className="text-zinc-500 mb-8 text-sm leading-relaxed">
        Last opp banktekstfiler (&ldquo;Siste transaksjoner ...txt&rdquo;) eller Mastercard-oversikten (.xlsx).
        Duplikater fra tidligere importer hoppes automatisk over.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label
          className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 rounded-xl py-10 cursor-pointer hover:border-zinc-300 transition-colors text-center px-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          <input
            type="file"
            accept=".txt,.xlsx"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <span className="text-zinc-500 text-sm">
            {file ? file.name : "Dra og slipp fil her, eller klikk for å velge"}
          </span>
        </label>

        {file && !isXlsx && (
          <div>
            <label className="block text-sm text-zinc-500 mb-1">Konto</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value as AccountId)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
            >
              <option value="brukskonto">Brukskonto</option>
              <option value="felleskonto">Felleskonto</option>
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || status === "uploading"}
          className="w-full bg-zinc-900 text-white rounded-lg px-3 py-2 font-medium hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === "uploading" ? "Importerer …" : "Importer"}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-4 rounded-lg bg-zinc-50 border border-zinc-100 text-sm text-zinc-700">
          {result.inserted} nye transaksjoner importert, {result.duplicates} duplikater hoppet over (av {result.total} totalt i filen).
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
    </div>
  );
}

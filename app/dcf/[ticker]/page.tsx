import Link from "next/link";
import type { Metadata } from "next";
import { fetchFundamentalData } from "@/lib/yahoo";
import { estimateDefaultWacc } from "@/lib/dcf";
import DcfCalculator from "./DcfCalculator";

interface Props {
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker } = await params;
  return { title: `${ticker.toUpperCase()} — DCF-verdsettelse` };
}

export default async function DcfPage({ params }: Props) {
  const { ticker } = await params;
  const upperTicker = ticker.toUpperCase();

  let data;
  try {
    data = await fetchFundamentalData(upperTicker);
  } catch {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400 font-mono uppercase text-sm tracking-wider mb-4">{upperTicker}</p>
        <h1 className="text-2xl font-bold text-zinc-900 mb-3">Fant ikke selskapet</h1>
        <p className="text-zinc-500 mb-8">Sjekk at tickeren er riktig (f.eks. EQNR.OL for Oslo Børs).</p>
        <Link
          href="/dcf"
          className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 underline underline-offset-2"
        >
          ← Tilbake til søk
        </Link>
      </div>
    );
  }

  const { profile, cashFlows, balanceSheets } = data;
  const latestFcf = cashFlows[0]?.freeCashFlow ?? 0;
  const latestBalance = balanceSheets[0];
  const netDebt = (latestBalance?.totalDebt ?? 0) - (latestBalance?.cashAndCashEquivalents ?? 0);
  const defaultWacc = estimateDefaultWacc(profile.beta || 1, profile.mktCap, latestBalance?.totalDebt ?? 0);

  if (latestFcf <= 0 || !profile.sharesOutstanding) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400 font-mono uppercase text-sm tracking-wider mb-4">{upperTicker}</p>
        <h1 className="text-2xl font-bold text-zinc-900 mb-3">Kan ikke DCF-verdsette dette selskapet</h1>
        <p className="text-zinc-500 mb-8">
          Mangler positiv fri kontantstrøm eller antall utestående aksjer fra Yahoo Finance for denne tickeren.
        </p>
        <Link
          href="/dcf"
          className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 underline underline-offset-2"
        >
          ← Tilbake til søk
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/dcf"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          ← Alle selskaper
        </Link>
        <Link
          href={`/analyse/${upperTicker}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 underline underline-offset-2"
        >
          Fundamental analyse →
        </Link>
      </div>

      <div className="mb-10 pb-8 border-b border-zinc-100">
        <p className="text-sm font-mono text-zinc-400 uppercase tracking-wider mb-2">{upperTicker}</p>
        <h1 className="text-3xl font-bold text-zinc-900 mb-3">{profile.companyName}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
          {profile.sector && <span>{profile.sector}</span>}
          <span>
            Kurs: <span className="text-zinc-700 font-medium">{profile.currency} {profile.price}</span>
          </span>
          <span>
            Beta: <span className="text-zinc-700 font-medium">{profile.beta?.toFixed(2) ?? "N/A"}</span>
          </span>
        </div>
      </div>

      <DcfCalculator
        currency={profile.currency}
        currentPrice={profile.price}
        baseFcf={latestFcf}
        netDebt={netDebt}
        sharesOutstanding={profile.sharesOutstanding}
        defaultWacc={defaultWacc}
      />
    </div>
  );
}

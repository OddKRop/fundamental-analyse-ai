import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Økonomi — Oversikt",
  description: "Samlet oversikt over personlig økonomi, aksjeanalyse og portefølje.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no" className="antialiased">
      <body className={`${geist.className} bg-zinc-50 min-h-screen`}>
        <header className="border-b border-zinc-200 bg-white">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="text-zinc-900 font-semibold text-lg tracking-tight hover:text-zinc-600 transition-colors"
            >
              Økonomi
            </Link>
            <nav className="flex items-center gap-5 text-sm text-zinc-500">
              <Link href="/analyse" className="hover:text-zinc-900 transition-colors">
                Fundamental analyse
              </Link>
              <Link href="/dcf" className="hover:text-zinc-900 transition-colors">
                DCF-verdsettelse
              </Link>
              <Link href="/portefolje" className="hover:text-zinc-900 transition-colors">
                Portefølje
              </Link>
              <Link href="/okonomi" className="hover:text-zinc-900 transition-colors">
                Personlig økonomi
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-10">{children}</main>
        <footer className="border-t border-zinc-200 mt-16">
          <div className="max-w-3xl mx-auto px-4 py-6 text-center text-xs text-zinc-400">
            Data fra Yahoo Finance. Analyse generert av Claude AI. Ikke finansiell rådgivning.
          </div>
        </footer>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fundamental Analyse AI — Norske Aksjer",
  description: "AI-drevet fundamental analyse av norske aksjer notert på Oslo Børs.",
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
              Fundamental Analyse
            </Link>
            <span className="text-xs text-zinc-400 font-mono uppercase tracking-wider">
              Oslo Børs · AI
            </span>
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

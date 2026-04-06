# Fundamental Analyse AI — Norske Aksjer

AI-genererte fundamentalanalyser av norske aksjer på Oslo Børs. Analysene genereres av Claude og lagres i Supabase — oppdateres kvartalsvis, ikke per brukerbesøk.

## Hvordan det fungerer

1. **Generering** — `POST /api/admin/refresh` henter fundamental data fra Yahoo Finance for hvert selskap i `lib/tickers.ts`, sender det til Claude, og lagrer analysen i Supabase
2. **Visning** — Brukere ser en liste over alle analyserte selskaper på forsiden, og kan klikke seg inn på hver enkelt analyse
3. **Oppdatering** — En Vercel Cron-jobb kjører automatisk 1. januar, april, juli og oktober

## Supabase-oppsett

Opprett et nytt prosjekt på [supabase.com](https://supabase.com), gå til **SQL Editor** og kjør:

```sql
CREATE TABLE analyses (
  ticker        TEXT PRIMARY KEY,
  company_name  TEXT,
  sector        TEXT,
  market_cap    BIGINT,
  price         NUMERIC,
  currency      TEXT,
  analysis_text TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

## Miljøvariabler

Kopier `.env.local.example` til `.env.local` og fyll inn:

| Variabel | Beskrivelse |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) |
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Project Settings → API → service_role key |
| `CRON_SECRET` | Valgfri hemmelig streng — beskytter refresh-endepunktet |

## Oppsett lokalt

```bash
npm install
cp .env.local.example .env.local
# Fyll inn alle nøkler
npm run dev
```

Generer analyser manuelt (én ticker):
```bash
curl -X POST "http://localhost:3000/api/admin/refresh?ticker=EQNR.OL&secret=din_token"
```

Generer alle:
```bash
curl -X POST "http://localhost:3000/api/admin/refresh?secret=din_token"
```

## Legg til eller fjern selskaper

Rediger `lib/tickers.ts` og kjør refresh.

## Deploy på Vercel

```bash
vercel
```

Legg til alle miljøvariabler i Vercel-prosjektet (Settings → Environment Variables). Cron-jobben er konfigurert i `vercel.json` og kjører automatisk kvartalsvis på Vercel Pro — på gratis plan må du trigge refresh manuelt.

## Tech stack

- **Next.js** (App Router) med TypeScript
- **Tailwind CSS**
- **Yahoo Finance** (`yahoo-finance2`) — gratis, ingen API-nøkkel
- **Claude API** (`claude-sonnet-4-20250514`) for analyse
- **Supabase** (PostgreSQL) for lagring av analyser

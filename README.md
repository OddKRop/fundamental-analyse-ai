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

## Personlig økonomi — Supabase-oppsett

Kjør i samme Supabase-prosjekt (**SQL Editor**):

```sql
CREATE TABLE accounts (
  id       TEXT PRIMARY KEY,   -- 'brukskonto' | 'felleskonto' | 'mastercard'
  name     TEXT NOT NULL,
  type     TEXT NOT NULL,      -- 'konto' | 'kredittkort'
  currency TEXT NOT NULL DEFAULT 'NOK'
);

CREATE TABLE transactions (
  id          BIGSERIAL PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  date        DATE NOT NULL,
  description TEXT NOT NULL,
  amount      NUMERIC NOT NULL,        -- alltid positivt, se "direction"
  direction   TEXT NOT NULL CHECK (direction IN ('inn', 'ut')),
  category    TEXT,
  merchant    TEXT,
  dedup_hash  TEXT NOT NULL UNIQUE,    -- hash(account_id + date + description + amount + direction)
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX transactions_account_date_idx ON transactions (account_id, date);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
```

RLS er slått på uten policies — kun `service_role`-nøkkelen (server-side) har tilgang, siden den omgår RLS. `anon`/`authenticated`-nøkler (som appen aldri eksponerer) får ingen tilgang.

## Portefølje — Supabase-oppsett

Kjør i samme Supabase-prosjekt (**SQL Editor**):

```sql
CREATE TABLE holdings (
  id         BIGSERIAL PRIMARY KEY,
  ticker     TEXT NOT NULL,
  quantity   NUMERIC NOT NULL,
  avg_price  NUMERIC NOT NULL,   -- GAV (gjennomsnittlig anskaffelsesverdi), i oppgitt valuta
  currency   TEXT NOT NULL DEFAULT 'NOK',
  broker     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
```

### CSV-import-format

Opplasting på `/portefolje/import` forventer en `;`-delimitert fil med header:

```
ticker;antall;gav;valuta
EQNR.OL;100;285.50;NOK
DNB.OL;50;220;NOK
```

`valuta` er valgfri (default `NOK`).

`dedup_hash` er unik slik at re-import av overlappende eksportfiler (f.eks. "siste 90 dager"-utskrifter) ikke lager duplikater — samme transaksjon gir samme hash og blir hoppet over.

## Miljøvariabler

Kopier `.env.local.example` til `.env.local` og fyll inn:

| Variabel | Beskrivelse |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) |
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Project Settings → API → service_role key |
| `CRON_SECRET` | Valgfri hemmelig streng — beskytter refresh-endepunktet |
| `SITE_PASSWORD` | Passord som beskytter hele siten (se `proxy.ts`) — appen inneholder personlig økonomidata |

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

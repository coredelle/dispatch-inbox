# Dispatch Inbox

Small freight brokers and dispatchers get load requests as messy emails and PDF rate confirmations, then retype the pickup, delivery, dates, weight and rate into a spreadsheet or TMS and chase the shipper for whatever's missing. **Dispatch Inbox** lets them paste the email or drop in the PDF instead. AI pulls the load details into a clean record, flags what's missing or uncertain, and drafts the reply asking for it. A person reviews and approves every record before it counts.

**Live demo: [dispatch.coredelle.com](https://dispatch.coredelle.com)** (click *Try the demo*, no signup).

A weekend MVP by [Coredelle Digital](https://coredelle.com). Read the [case study](https://dispatch.coredelle.com/case-study) for the problem, approach and results.

## What it does

- **Extract**: paste an email or upload a PDF (up to 10 MB). Claude returns the load as JSON that must match a strict schema; absent values come back empty, never guessed.
- **Review**: the source sits beside editable fields. Missing fields are outlined red, ambiguous ones amber. Approve, reject, or reopen.
- **Follow up**: if anything's missing, a cheaper model drafts a 3–5 sentence email asking for just those items. Copy it; the app never sends email.
- **Track**: an inbox table of all loads, filterable by status, and an About page with live cost and speed averages.
- **Demo**: "Try the demo" signs visitors into a shared, rate-limited demo account with seeded loads. No signup.

## Architecture

```
 Browser (Next.js pages)                      Vercel (server)                         External
 ─────────────────────                        ───────────────                         ────────
 Paste email ──────────── POST /api/extract ─▶ auth + rate limit ──────────────────▶ Claude Sonnet 5.5
 Upload PDF ─▶ Supabase Storage (own folder)   │  (PDF → base64 document block)        structured output
               └──── POST /api/extract ───────▶│  save load + run log                  (JSON schema)
                     { filePath }              │  missing fields? ─────────────────▶ Claude Haiku 5.5
                                               │                                      follow-up draft
 Review screen ◀── server render (RLS) ────────┤
 Edit / approve ── PATCH /api/loads/[id] ─────▶│
 Inbox table   ◀── server render (RLS) ────────┘──────────────────────────────────▶ Supabase Postgres
                                                                                      (row-level security)
```

- **Next.js 16 (App Router) + TypeScript**, Tailwind and shadcn/ui, deployed on **Vercel**.
- **Supabase**: Postgres with row-level security on every table, magic-link auth, private storage bucket (PDFs only, 10 MB). Users only ever see their own rows and files.
- **Anthropic API** via `@anthropic-ai/sdk`, server-side only. The API key and the Supabase service-role key are never imported into client code (modules that use them import `server-only`, so the build fails if they leak into the browser).
- PDFs upload straight from the browser to Storage, and the API receives only the file path. That keeps 10 MB files out of the request body (Vercel caps it at 4.5 MB); the server checks ownership and the `%PDF-` header before sending the file to Claude.

## The AI step

- **One call per load** to `claude-sonnet-5-5` with structured outputs (`output_config.format` = JSON schema, `additionalProperties: false` everywhere). PDFs go in as a base64 `document` block before the instruction; emails as text.
- The schema's field descriptions carry most of the extraction rules (date format, keeping reference labels, shipper vs. broker, what counts as ambiguous). The model name and prices live in one config file, [`src/lib/config.ts`](src/lib/config.ts).
- **Stop reasons**: `max_tokens` retries once with a higher limit; `refusal` or an API error marks the load *failed* with a friendly message.
- **Follow-up draft**: a second, cheap call to `claude-haiku-5-5`. It only sees the structured fields, not the raw email, so instructions hidden in an email can't steer what it writes.
- **Missing fields** are recomputed from the current values (not trusted from the model), so filling one in clears its flag.
- Every call is logged to `extraction_runs` with model, tokens, latency, stop reason and estimated cost.

## Cost per extraction

Measured on the 8 sample documents with the current prompt (`npm run eval`), using published per-token prices:

| Call | Model | Avg cost | Avg time |
|---|---|---|---|
| Email extraction | claude-sonnet-5-5 | ~0.8¢ | ~3 s |
| PDF extraction (1 page) | claude-sonnet-5-5 | ~1.3¢ | ~3.5 s |
| Follow-up draft | claude-haiku-5-5 | ~0.01¢ | ~1.3 s |

So a load costs about **a cent**. The live About page shows running averages from real usage.

## Accuracy

`npm run eval` runs every sample in [`sample-data/`](sample-data) through the same extraction code the app uses and scores it against an answer key ([`sample-data/expected.json`](sample-data/expected.json)): shipper, lane, dates, weight, equipment, rate, references, contact, missing fields, and whether ambiguous values were flagged instead of guessed. The samples include tidy emails, a forwarded thread where the rate changes mid-thread, an informal email with an impossible date and a per-mile rate, an email missing the rate and delivery date, and two PDF rate confirmations. Tightening the prompt and schema took it from 7/8 to **8/8**, stable across runs. All sample companies, people and numbers are fictional.

## Demo safeguards

- Separate demo user. Its password lives only in server env vars, and each demo login restores it, so a visitor can't lock others out.
- **Reset demo** restores 4 seeded loads (real extractions, including a PDF). Only the demo user can trigger it.
- Claude-backed requests are rate-limited per user per hour (demo 20, others 60), counted in a table that resets can't clear.
- Set a monthly spend limit in the Anthropic Console as a final backstop.

## Run it locally

Requires Node 22 (`.nvmrc`), a Supabase project and an Anthropic API key.

1. `npm install`
2. Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
   SUPABASE_SERVICE_ROLE_KEY=<secret key>
   ANTHROPIC_API_KEY=<key>
   DEMO_USER_EMAIL=demo@example.com
   DEMO_USER_PASSWORD=<random string>
   ```
3. Run the SQL files in [`supabase/migrations/`](supabase/migrations) in order in the Supabase SQL Editor.
4. In Supabase → Authentication → URL Configuration, allow `http://localhost:3000/**` as a redirect URL.
5. `npm run demo:create-user` creates the demo user (seed loads are added on its first login).
6. `npm run dev` and open http://localhost:3000.

Other scripts: `npm run eval` (extraction accuracy, about 7¢ per full run), `npm run lint`, `npm run build`.

## Project layout

```
src/app/                 pages (landing, inbox, loads/new, loads/[id], login, about) and API routes
src/lib/anthropic/       extraction + follow-up calls and the JSON schema (server-only)
src/lib/                 config, load helpers, demo, rate limit, stats, Supabase clients
supabase/migrations/     tables, RLS policies, storage bucket
sample-data/             fictional emails and PDFs, answer key, demo seed
scripts/                 demo user setup, extraction eval
```

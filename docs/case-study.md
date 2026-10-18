# Case study: Dispatch Inbox

*An AI-powered MVP built over a weekend by Coredelle Digital.*

## Problem

Small freight brokers and dispatchers run on email. Load requests arrive as quick notes, long forwarded threads, and PDF rate confirmations, each in a different shape. Someone reads every one, retypes the pickup, delivery, dates, weight, equipment and rate into a spreadsheet or TMS, then writes back to the shipper for whatever's missing. It's slow, it's error-prone, and the details that matter most (a rate revised three replies down, a date that doesn't exist) are the easiest to miss.

## Approach

Keep the person in charge and let AI do the retyping.

- **Extraction with a contract.** Each email or PDF goes to Claude Sonnet 5.5 with a strict JSON schema (structured outputs), so every response has the same shape. The model must leave absent values empty instead of guessing, and flag values the document leaves ambiguous. PDFs are read natively, with no separate OCR step.
- **Review before it counts.** The source document sits beside editable fields. Missing fields are outlined red, uncertain ones amber, and nothing is final until a person approves it.
- **Close the loop.** When details are missing, a smaller model (Claude Haiku 5.5) drafts a short, polite email asking for exactly those items. It sees only the structured fields, never the raw email, which keeps it cheap and stops text hidden in an email from steering it.
- **Measure, then tune.** Eight fictional documents, from tidy emails to a messy forwarded thread and an email with an impossible date, run through the same code the app uses and are scored against an answer key. Prompt and schema changes are judged on that score, not on vibes.
- **Production basics from day one.** Row-level security on every table, API keys used only on the server, per-user rate limits plus a daily spending cap, a private self-cleaning sandbox for every demo visitor, and cost logged for every AI call.

## Result

- Paste an email or drop in a PDF, and a structured, reviewable load appears in **about 3 seconds**, well inside the 15-second goal.
- **8 of 8** sample documents extract correctly (up from 7 of 8 before tuning), stable across repeated runs. That includes the thread where the rate changes mid-conversation and the email whose pickup date can't exist: the model flagged it for review instead of inventing one.
- Missing details turn into a ready-to-send follow-up email with one click to copy.
- A public demo with seeded data needs no signup. Each visitor's sandbox is private, and no one can run up the bill.

## Cost per load

| Step | Model | Cost |
|---|---|---|
| Extract an email | Claude Sonnet 5.5 | ~0.8¢ |
| Extract a 1-page PDF | Claude Sonnet 5.5 | ~1.3¢ |
| Draft the follow-up | Claude Haiku 5.5 | ~0.01¢ |

**About one cent per load.** A dispatcher handling 50 loads a day would spend roughly $10–15 a month on AI, less than the cost of a few minutes of retyping per day.

## Stack

Next.js and TypeScript, Tailwind and shadcn/ui, Supabase (Postgres, auth, storage), the Anthropic API, and Vercel.

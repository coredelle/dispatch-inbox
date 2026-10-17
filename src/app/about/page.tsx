import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { SiteHeader } from "@/components/site-header";
import { getUsageStats } from "@/lib/stats";

export const metadata: Metadata = { title: "About this demo · Dispatch Inbox" };

const REPO_URL = "https://github.com/coredelle/dispatch-inbox";

function cents(usd: number | null): string {
  if (usd === null) return "—";
  const c = usd * 100;
  return `${c < 1 ? c.toFixed(2) : c.toFixed(1)}¢`;
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 bg-card p-4">
      <div className="eyebrow">{label}</div>
      <div className="doc-title text-5xl tabular-nums">{value}</div>
      {note && <div className="text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}

export default async function AboutPage() {
  // Live numbers from the extraction log, computed per request
  await connection();
  const stats = await getUsageStats();

  return (
    <div className="flex min-h-screen flex-col">
    <SiteHeader>
      <Link href="/case-study" className="underline-offset-4 hover:underline">Case study</Link>
      <Link href="/inbox" className="underline-offset-4 hover:underline">Load ledger</Link>
    </SiteHeader>
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <span className="eyebrow">Spec sheet</span>
      <h1 className="doc-title text-5xl">About this demo</h1>
      <p className="mt-2 text-muted-foreground">
        Dispatch Inbox turns messy load emails and rate confirmations into clean, reviewable load
        records. It&apos;s a weekend MVP showing how an AI step fits into a real workflow. For the full
        story, read the{" "}
        <Link href="/case-study" className="font-medium text-foreground underline decoration-hivis decoration-2 underline-offset-4">
          case study
        </Link>
        .
      </p>

      <h2 className="doc-title mt-10 border-b-2 border-foreground pb-1 text-2xl">How it works</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          <strong>Extract.</strong> Paste an email or drop in a PDF. {stats.extractionModel} reads it
          (PDFs natively, text and layout) and returns load details as JSON that must match a strict
          schema. Missing values come back empty, never guessed.
        </li>
        <li>
          <strong>Review.</strong> Every field sits beside the source document and stays editable.
          Missing fields are flagged red, uncertain ones amber, and nothing counts until a person
          approves it.
        </li>
        <li>
          <strong>Follow up.</strong> If details are missing, a smaller, cheaper model (
          {stats.followupModel}) drafts a short email asking for just those items. You copy it; the
          app never sends email.
        </li>
      </ul>

      <h2 className="doc-title mt-10 border-b-2 border-foreground pb-1 text-2xl">What it costs</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Live averages from every extraction this demo has run, using published per-token prices.
      </p>
      <div className="sheet mt-4 grid gap-px overflow-hidden bg-border sm:grid-cols-3">
        <Stat label="Average cost per load" value={cents(stats.avgCostPerLoad)} note="extraction + follow-up draft" />
        <Stat
          label="Average extraction time"
          value={stats.avgExtractionLatencyMs === null ? "—" : `${(stats.avgExtractionLatencyMs / 1000).toFixed(1)}s`}
        />
        <Stat label="Loads processed" value={stats.loads.toLocaleString("en-US")} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Per call: extraction {cents(stats.avgExtractionCost)} on {stats.extractionModel}, follow-up
        draft {cents(stats.avgFollowupCost)} on {stats.followupModel}.
      </p>

      <h2 className="doc-title mt-10 border-b-2 border-foreground pb-1 text-2xl">Built with</h2>
      <p className="mt-2 text-sm">
        Next.js, TypeScript, Tailwind and shadcn/ui · Supabase (Postgres with row-level security,
        magic-link auth, file storage) · Anthropic API with structured outputs · Vercel.
      </p>
      <p className="mt-4 text-sm">
        <Link href="/case-study" className="underline">Case study</Link>
        {" · "}
        <a href={REPO_URL} className="underline" target="_blank" rel="noreferrer">Source code on GitHub</a>
        {" · "}
        Built by{" "}
        <a href="https://coredelle.com" className="underline" target="_blank" rel="noreferrer">
          Coredelle Digital
        </a>
      </p>
    </main>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Stamp } from "@/components/stamp";
import { contactHref } from "@/lib/site";
import { cn } from "@/lib/utils";

const DESCRIPTION =
  "How Coredelle Digital built Dispatch Inbox: an AI MVP that turns messy freight load emails and PDF rate confirmations into reviewable load records in about 5 seconds, for about a cent each.";

export const metadata: Metadata = {
  title: "Case study",
  description: DESCRIPTION,
  // Restated in full: openGraph from the layout is replaced, not merged
  openGraph: {
    type: "article",
    siteName: "Dispatch Inbox",
    title: "Case study: Dispatch Inbox, an AI MVP by Coredelle Digital",
    description: DESCRIPTION,
    url: "/case-study",
  },
};

const APPROACH = [
  {
    title: "Extraction with a contract.",
    body: "Each email or PDF goes to Claude Sonnet 5.5 with a strict JSON schema, so every response has the same shape. Absent values come back empty instead of guessed, and ambiguous ones are flagged. PDFs are read natively, with no separate OCR step.",
  },
  {
    title: "Review before it counts.",
    body: "The source document sits beside editable fields. Missing fields are outlined red, uncertain ones amber, and nothing is final until a person stamps it approved.",
  },
  {
    title: "Close the loop.",
    body: "When details are missing, Claude Haiku 5.5 drafts a short, signed email asking for exactly those items, and acknowledges what the sender asked (\u201ccan you cover by EOD?\u201d) without promising anything. It sees only the structured fields, never the raw email, which keeps it cheap and limits how much an email can steer it. It's written after the record appears, so nobody waits for it.",
  },
  {
    title: "Measure, then tune.",
    body: "Nine fictional documents, from tidy emails to a messy forwarded thread, an impossible date and \u201cnext tues\u201d, run through the app's own extraction code and are scored against an answer key. Prompt changes are judged on that score.",
  },
  {
    title: "Production basics from day one.",
    body: "Row-level security on every table, API keys used only on the server, per-user rate limits plus a daily spending cap, a private sandbox for every demo visitor that cleans itself up, and a cost log for every AI call.",
  },
];

const FIGURES = [
  { label: "Time to record", value: "~5s", note: "from clicking Extract to a reviewable load; the follow-up draft follows" },
  { label: "Accuracy", value: "9/9", note: "fictional sample documents correct, stable across runs" },
  { label: "AI cost", value: "~1¢", note: "per load, including the follow-up draft" },
];

const COSTS = [
  { step: "Extract an email", model: "Claude Sonnet 5.5", cost: "~0.8¢" },
  { step: "Extract a 1-page PDF", model: "Claude Sonnet 5.5", cost: "~1.3¢" },
  { step: "Draft the follow-up", model: "Claude Haiku 5.5", cost: "~0.01¢" },
];

const RECORD_ROWS: { label: string; value: string; flag?: "missing" | "low"; flagText?: string }[] = [
  { label: "Pickup", value: "Allentown, PA · 11/19 07:00–13:00" },
  { label: "Delivery", value: "Richmond, VA", flag: "missing", flagText: "Date missing" },
  { label: "Weight", value: "31,000 lb · double-check", flag: "low" },
  { label: "Equipment", value: "53' dry van" },
  { label: "Rate", value: "—", flag: "missing" },
];

function DemoButton() {
  // Plain form post: signs into the shared demo account, no signup
  return (
    <form action="/api/demo/login" method="post">
      <button
        type="submit"
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-11 border border-foreground bg-hivis px-5 text-base font-semibold text-hivis-foreground hover:bg-hivis/85",
        )}
      >
        Try the demo
      </button>
    </form>
  );
}

function Section({ label, title, children }: { label: string; title?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <span className="section-bar self-start">{label}</span>
      {title && <h2 className="doc-title text-3xl">{title}</h2>}
      {children}
    </section>
  );
}

// Static illustration: the example email next to the load record it becomes
function LoadTicket() {
  return (
    <div
      className="grid items-start gap-5 md:grid-cols-[0.9fr_1.1fr]"
      role="img"
      aria-label="Example: a short load email becomes a load record with the delivery date and rate stamped missing and the weight marked for a double-check"
    >
      <div className="sheet flex min-w-0 flex-col gap-2 p-4">
        <span className="eyebrow">Email in</span>
        <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
          Need a truck for <span className="marker text-foreground">Thursday 11/19</span>. Pickup at our{" "}
          <span className="marker text-foreground">Allentown</span> plant, 7am–1pm. Going to Tidewater Supply,{" "}
          <span className="marker text-foreground">Richmond VA</span>. 26 pallets, about{" "}
          <span className="marker text-foreground">31,000 lbs</span>. 53&apos; dry van. Our ref is{" "}
          <span className="marker text-foreground">KP-30118</span>.
        </p>
      </div>
      <div className="sheet relative min-w-0 p-4">
        <Stamp status="needs_review" land className="absolute -top-4 right-5 bg-card" />
        <div className="flex items-end justify-between gap-4 border-b-2 border-foreground pb-1.5">
          <span className="doc-title text-2xl">Load record</span>
          <span className="font-mono text-xs text-muted-foreground">№ KP-30118</span>
        </div>
        <dl className="mt-2 divide-y divide-border">
          {RECORD_ROWS.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 py-1.5">
              <dt className="eyebrow">{row.label}</dt>
              <dd className={cn("flex items-center gap-2 text-right font-mono text-xs", row.flag === "low" && "text-flag-low")}>
                {row.value}
                {row.flag === "missing" && <span data-status="missing" className="stamp stamp-sm">{row.flagText ?? "Missing"}</span>}
              </dd>
            </div>
          ))}
        </dl>
        <div className="perforated mt-3 pt-2.5">
          <div className="eyebrow mb-1">Carbon copy · drafted follow-up</div>
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">
            Hi Tom, could you send the rate and the delivery date and time for KP-30118? Once I have those I&apos;ll
            confirm the truck.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CaseStudyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader>
        <Link href="/about" className="underline-offset-4 hover:underline">About this demo</Link>
        <Link href="/" className="underline-offset-4 hover:underline">Home</Link>
      </SiteHeader>

      {/* overflow-x-clip: the stamp's landing animation briefly overshoots the screen edge on phones */}
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 overflow-x-clip px-4 py-10 sm:px-6">
        <header className="flex flex-col gap-4">
          <span className="eyebrow">Case study · Coredelle Digital · Weekend MVP</span>
          <h1 className="doc-title text-5xl sm:text-7xl">
            Load emails in.
            <br />
            <span className="marker">Clean load records</span> out.
          </h1>
          <p className="max-w-2xl text-lg">
            Freight dispatchers retype load emails all day. Dispatch Inbox turns a messy email or PDF rate
            confirmation into a reviewable load record in about five seconds, for about a cent.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <DemoButton />
            <span className="text-sm">No signup. Sample loads included.</span>
          </div>
        </header>

        <LoadTicket />

        <Section label="Problem" title="Every load arrives in a different shape">
          <p>
            Small freight brokers and dispatchers run on email. Load requests come in as quick notes, long forwarded
            threads, and PDF rate confirmations. Someone reads each one, retypes the pickup, delivery, dates, weight,
            equipment and rate into a spreadsheet or TMS, then writes back to the shipper for whatever&apos;s missing.
            The details that matter most, like a rate revised three replies down or a date that doesn&apos;t exist,
            are the easiest to miss.
          </p>
        </Section>

        <Section label="Approach" title="AI does the retyping. A person signs off.">
          <ul className="flex flex-col gap-3">
            {APPROACH.map((item) => (
              <li key={item.title} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2">
                <span aria-hidden="true" className="mt-1.5 size-3 rounded-[2px] border-[1.5px] border-foreground" />
                <span>
                  <strong className="font-semibold">{item.title}</strong> {item.body}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section label="Result" title="Accurate, fast, and reviewable">
          <div className="sheet grid gap-px overflow-hidden bg-border sm:grid-cols-3">
            {FIGURES.map((f) => (
              <div key={f.label} className="flex flex-col gap-1 bg-card p-4">
                <span className="eyebrow">{f.label}</span>
                <span className="doc-title text-5xl tabular-nums">{f.value}</span>
                <span className="text-sm text-muted-foreground">{f.note}</span>
              </div>
            ))}
          </div>
          <p>
            The tricky samples are where it earns its keep. In a forwarded thread where the shipper raises the rate
            from $1,600 to $1,750 in the last reply, it picks the final rate and the right contact. Given a pickup
            date of &ldquo;friday 11/31&rdquo;, which doesn&apos;t exist, it flags the date for a person instead of
            inventing one. &ldquo;Next tues&rdquo; and &ldquo;wed morning&rdquo; become real dates counted from the
            email&apos;s sent date, flagged amber so a person double-checks them. Missing details become a
            ready-to-send follow-up with one click to copy.
          </p>
        </Section>

        <Section label="Cost per load" title="Priced per token, measured per call">
          <div className="sheet overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-foreground">
                  <th className="eyebrow px-4 py-2.5 text-left">Step</th>
                  <th className="eyebrow px-4 py-2.5 text-left">Model</th>
                  <th className="eyebrow px-4 py-2.5 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COSTS.map((c) => (
                  <tr key={c.step}>
                    <td className="px-4 py-2.5">{c.step}</td>
                    <td className="px-4 py-2.5">{c.model}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{c.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Stamp status="approved" />
            <p>
              <strong className="doc-title text-2xl">About one cent per load.</strong> A dispatcher handling 50 loads
              a day would spend roughly $10–15 a month on AI.
            </p>
          </div>
        </Section>

        <Section label="Stack">
          <p>
            Next.js and TypeScript, Tailwind and shadcn/ui, Supabase (Postgres with row-level security, magic-link
            auth, file storage), the Anthropic API with structured outputs, and Vercel.{" "}
            <Link href="/about" className="underline">Live cost and speed numbers</Link> are on the About page.
          </p>
        </Section>

        <section className="sheet flex flex-col items-start gap-3 p-5">
          <span className="doc-title text-3xl">See it on a real load</span>
          <p className="text-muted-foreground">
            Each visitor gets a private sandbox with sample loads and one-click sample emails and PDFs, or paste your
            own load email. Sandboxes are deleted within two days.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <DemoButton />
            <a href={contactHref("AI MVP project")} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5 text-base")}>
              Have an idea? Email us
            </a>
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}

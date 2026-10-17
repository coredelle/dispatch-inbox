import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { Stamp } from "@/components/stamp";
import { cn } from "@/lib/utils";

const PREVIEW_ROWS: { label: string; value: string; missing?: boolean }[] = [
  { label: "Shipper", value: "Keystone Packaging" },
  { label: "Pickup", value: "Allentown, PA · 11/19 07:00–13:00" },
  { label: "Delivery", value: "Richmond, VA", missing: true },
  { label: "Freight", value: "26 plt corrugated · 31,000 lb" },
  { label: "Equipment", value: "53' dry van" },
  { label: "Rate", value: "—", missing: true },
  { label: "Ref", value: "KP-30118" },
];

const STEPS = [
  { title: "Paste or drop", body: "A load email or a PDF rate confirmation." },
  { title: "Review the flags", body: "Missing fields in red, unclear ones in amber." },
  { title: "Approve and follow up", body: "Copy the drafted email asking for what's missing." },
];

// Static illustration: a load record as a paper form, with the follow-up as its carbon copy
function LoadRecordPreview() {
  return (
    <div className="sheet relative w-full max-w-md p-5" aria-hidden="true">
      <div className="flex items-end justify-between gap-4 border-b-2 border-foreground pb-2">
        <span className="doc-title text-2xl">Load record</span>
        <span className="font-mono text-xs text-muted-foreground">№ KP-30118</span>
      </div>
      <Stamp status="needs_review" className="absolute -top-4 right-24 bg-card" />
      <dl className="mt-3 divide-y divide-border">
        {PREVIEW_ROWS.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-1.5">
            <dt className="eyebrow">{row.label}</dt>
            <dd className="flex items-center gap-2 font-mono text-sm">
              {row.value}
              {row.missing && <span data-status="missing" className="stamp stamp-sm">Missing</span>}
            </dd>
          </div>
        ))}
      </dl>
      <div className="perforated mt-4 pt-3">
        <div className="eyebrow mb-1">Carbon copy · drafted follow-up</div>
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
          Hi Tom, thanks for the Allentown to Richmond load (KP-30118). Could you send the rate and the
          delivery date and time? Once I have those I&apos;ll confirm the truck.
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader>
        <Link href="/about" className="underline-offset-4 hover:underline">About this demo</Link>
        <Link href="/login" className="underline-offset-4 hover:underline">Sign in</Link>
      </SiteHeader>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-6">
          <span className="eyebrow">Freight load intake · AI-assisted</span>
          <h1 className="doc-title text-5xl sm:text-7xl">
            Load emails in.
            <br />
            <span className="marker">Clean load records</span> out.
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            Paste a load email or drop in a rate confirmation PDF. AI pulls out the details, flags
            what&apos;s missing, and drafts the follow-up. A person approves every load.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {/* Plain form post: signs into the shared demo account, no signup */}
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
            <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5 text-base")}>
              Sign in
            </Link>
            <span className="text-sm text-muted-foreground">No signup. About a cent per load.</span>
          </div>

          <ol className="mt-4 grid gap-px overflow-hidden rounded-[var(--radius)] border bg-border sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-1 bg-card p-3">
                <span className="font-mono text-xs text-muted-foreground">Step {i + 1}</span>
                <span className="doc-title text-lg">{step.title}</span>
                <span className="text-sm text-muted-foreground">{step.body}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex justify-center lg:justify-end">
          <LoadRecordPreview />
        </div>
      </main>

      <footer className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
        Built by{" "}
        <a href="https://coredelle.com" className="underline" target="_blank" rel="noreferrer">
          Coredelle Digital
        </a>
      </footer>
    </div>
  );
}

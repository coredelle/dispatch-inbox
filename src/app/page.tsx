import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PREVIEW_FIELDS: { label: string; value: string; flag?: "missing" | "low" }[] = [
  { label: "Lane", value: "Allentown, PA → Richmond, VA" },
  { label: "Pickup", value: "Nov 19, 7:00 AM – 1:00 PM" },
  { label: "Delivery", value: "Not given", flag: "missing" },
  { label: "Weight", value: "31,000 lbs · 53' dry van" },
  { label: "Rate", value: "Not given", flag: "missing" },
];

// Static illustration of the product flow: email in, fields out, follow-up drafted
function ProductPreview() {
  return (
    <div className="w-full max-w-md rounded-xl border bg-card p-4 text-left text-sm shadow-sm" aria-hidden="true">
      <div className="rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed text-muted-foreground">
        Need a truck for Thursday 11/19. Pickup at our Allentown plant, 7am–1pm. Going to Tidewater
        Supply, Richmond VA. 26 pallets, about 31,000 lbs. 53&apos; dry van…
      </div>
      <div className="my-2 text-center text-muted-foreground">↓</div>
      <dl className="divide-y rounded-lg border">
        {PREVIEW_FIELDS.map((f) => (
          <div
            key={f.label}
            className={cn(
              "flex justify-between gap-4 px-3 py-2",
              f.flag === "missing" && "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
            )}
          >
            <dt className="text-muted-foreground">{f.label}</dt>
            <dd className="font-medium">{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 rounded-lg border border-dashed p-3 text-xs leading-relaxed">
        <div className="mb-1 font-medium">Drafted follow-up</div>
        Hi Tom, thanks for the Allentown to Richmond load (ref KP-30118). Could you send the rate and
        the delivery date and time? Once I have those I&apos;ll confirm the truck.
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between p-6">
        <span className="font-semibold">Dispatch Inbox</span>
        <nav className="flex gap-4 text-sm">
          <Link href="/about" className="underline-offset-4 hover:underline">About this demo</Link>
          <Link href="/login" className="underline-offset-4 hover:underline">Sign in</Link>
        </nav>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 p-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Load emails in. Clean load records out.
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            Paste a load email or drop in a rate confirmation PDF. AI extracts the details, flags
            what&apos;s missing, and drafts the follow-up. You review and approve every load.
          </p>
          <div className="flex flex-wrap gap-3">
            {/* Plain form post: signs into the shared demo account, no signup */}
            <form action="/api/demo/login" method="post">
              <button type="submit" className={cn(buttonVariants({ size: "lg" }))}>
                Try the demo
              </button>
            </form>
            <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              Sign in
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">No signup needed for the demo. About a cent per load.</p>
        </div>
        <div className="flex justify-center lg:justify-end">
          <ProductPreview />
        </div>
      </main>

      <footer className="p-6 text-center text-sm text-muted-foreground">
        Built by{" "}
        <a href="https://coredellesmith.com" className="underline" target="_blank" rel="noreferrer">
          Coredelle Digital
        </a>
      </footer>
    </div>
  );
}

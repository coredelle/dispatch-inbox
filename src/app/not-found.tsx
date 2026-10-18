import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

// Unmatched URLs and missing loads land here, on the same paperwork as the rest of the app
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader>
        <Link href="/case-study" className="underline-offset-4 hover:underline">Case study</Link>
      </SiteHeader>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-5 px-4 py-16 sm:px-6">
        <span data-status="rejected" className="stamp stamp-lg">Not found</span>
        <h1 className="doc-title text-5xl">No paperwork at this address</h1>
        <p className="text-muted-foreground">
          The page or load you&apos;re looking for doesn&apos;t exist, or it isn&apos;t yours to see.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className={cn(buttonVariants(), "border border-foreground bg-hivis text-hivis-foreground hover:bg-hivis/85")}>
            Back to the start
          </Link>
          <Link href="/inbox" className={buttonVariants({ variant: "outline" })}>
            Load ledger
          </Link>
        </div>
      </main>
    </div>
  );
}

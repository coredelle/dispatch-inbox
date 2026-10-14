import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">Dispatch Inbox</h1>
      <p className="max-w-lg text-lg text-muted-foreground">
        Paste a load email or drop in a rate confirmation PDF — AI extracts the
        details, flags what&apos;s missing, and drafts the follow-up.
      </p>
      <div className="flex gap-4">
        <Link href="/inbox" className={cn(buttonVariants())}>
          Try the demo
        </Link>
        <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
          Sign in
        </Link>
      </div>
      <footer className="absolute bottom-6 text-sm text-muted-foreground">
        Built by{" "}
        <a
          href="https://coredellesmith.com"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          Coredelle Digital
        </a>
      </footer>
    </main>
  );
}

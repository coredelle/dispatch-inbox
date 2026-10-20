import { CONTACT_EMAIL, REPO_URL, STUDIO_NAME, STUDIO_URL, contactHref } from "@/lib/site";
import { cn } from "@/lib/utils";

// Contact details plus a line for freight teams who'd want this for real
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("perforated flex flex-col gap-3 pt-4 text-sm", className)}>
      <p>
        <strong className="font-semibold">Run a brokerage or dispatch service?</strong> We can build this into your
        workflow, connected to your inbox and TMS.{" "}
        <a href={contactHref("Dispatch Inbox for my team")} className="font-medium underline decoration-hivis decoration-2 underline-offset-4">
          Let&apos;s talk
        </a>
        .
      </p>
      <div className="flex flex-wrap justify-between gap-x-6 gap-y-2 text-muted-foreground">
        <span>
          Built by{" "}
          <a href={STUDIO_URL} className="underline">{STUDIO_NAME}</a> ·{" "}
          <a href={contactHref()} className="underline">{CONTACT_EMAIL}</a>
        </span>
        <a href={REPO_URL} className="underline" target="_blank" rel="noreferrer">Source on GitHub</a>
      </div>
    </footer>
  );
}

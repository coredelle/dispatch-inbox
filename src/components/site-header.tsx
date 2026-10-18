import Link from "next/link";
import { STUDIO_NAME, contactHref } from "@/lib/site";

// Says up front that this is a sample project and who to hire, on every page
function StudioBar() {
  return (
    <div className="bg-foreground text-background">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 text-sm sm:px-6">
        <span>
          A sample project by <strong className="font-semibold">{STUDIO_NAME}</strong>. We build AI-powered MVPs.
        </span>
        <a href={contactHref()} className="font-semibold underline decoration-hivis decoration-2 underline-offset-4">
          Get in touch →
        </a>
      </div>
    </div>
  );
}

// Letterhead across the top of every page
export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <StudioBar />
      <header className="border-b border-foreground/80">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="doc-title text-2xl">Dispatch Inbox</span>
            <span className="eyebrow hidden sm:inline">Load intake desk</span>
          </Link>
          {children && <nav className="flex flex-wrap items-center gap-4 text-sm">{children}</nav>}
        </div>
      </header>
    </>
  );
}

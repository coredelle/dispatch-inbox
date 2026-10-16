import Link from "next/link";

// Letterhead across the top of every page
export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b border-foreground/80">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="doc-title text-2xl">Dispatch Inbox</span>
          <span className="eyebrow hidden sm:inline">Load intake desk</span>
        </Link>
        {children && <nav className="flex flex-wrap items-center gap-4 text-sm">{children}</nav>}
      </div>
    </header>
  );
}

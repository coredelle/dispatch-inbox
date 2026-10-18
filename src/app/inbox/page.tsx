import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { Stamp } from "@/components/stamp";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isSandboxUser } from "@/lib/demo";
import { RATE_LIMIT_PER_HOUR } from "@/lib/config";
import { STATUS_LABELS, formatDateTime, formatUsd } from "@/lib/loads";
import { ResetDemoButton } from "./reset-demo-button";
import { cn } from "@/lib/utils";
import type { Load, LoadStatus } from "@/types";

const FILTERS: (LoadStatus | "all")[] = ["all", "needs_review", "approved", "rejected", "failed"];

// "2150 Harmon Ave, Columbus, OH 43223" -> "Columbus, OH"
function shortPlace(location: string | null): string {
  if (!location) return "?";
  const matches = [...location.matchAll(/([A-Za-z .'-]+),\s*([A-Z]{2})\b/g)];
  const last = matches.at(-1);
  return last ? `${last[1].trim()}, ${last[2]}` : location;
}

type Row = Pick<Load, "id" | "status" | "fields" | "missing_fields" | "created_at">;

export default async function InboxPage({ searchParams }: PageProps<"/inbox">) {
  const { status } = await searchParams;
  // Always render per request: this page reads the signed-in user's data
  await connection();
  const active = FILTERS.includes(status as LoadStatus) ? (status as LoadStatus | "all") : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS returns only this user's loads
  const { data } = await supabase
    .from("loads")
    .select("id, status, fields, missing_fields, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const loads = (data ?? []) as Row[];
  const shown = active === "all" ? loads : loads.filter((l) => l.status === active);
  const count = (f: LoadStatus | "all") => (f === "all" ? loads.length : loads.filter((l) => l.status === f).length);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader>
        <Link href="/about" className="underline-offset-4 hover:underline">About this demo</Link>
        <Link href="/loads/new" className={cn(buttonVariants(), "border border-foreground bg-hivis text-hivis-foreground hover:bg-hivis/85")}>
          New load
        </Link>
      </SiteHeader>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h1 className="doc-title text-5xl">Load ledger</h1>
          <span className="eyebrow">{loads.length} {loads.length === 1 ? "load" : "loads"} on file</span>
        </div>

        {isSandboxUser(user) && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-hivis bg-hivis/15 p-3 text-sm">
            <p>
              <span className="eyebrow mr-2 text-foreground">Your sandbox</span>
              Private to you: no one else sees what you add, and it&apos;s deleted automatically within two
              days. AI requests are limited to {RATE_LIMIT_PER_HOUR.demo} per hour.
            </p>
            <ResetDemoButton />
          </div>
        )}

        <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-b" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/inbox" : `/inbox?status=${f}`}
              className={cn(
                "-mb-px border-b-2 pb-2 font-display text-lg font-semibold uppercase tracking-wide transition-colors",
                f === active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              aria-current={f === active ? "page" : undefined}
            >
              {f === "all" ? "All" : STATUS_LABELS[f]}{" "}
              <span className="font-mono text-xs font-normal">{count(f)}</span>
            </Link>
          ))}
        </nav>

        {shown.length === 0 ? (
          <div className="sheet mt-6 p-10 text-center">
            <p className="doc-title text-2xl">Nothing on file</p>
            <p className="mt-2 text-muted-foreground">
              {loads.length === 0 ? "Paste an email or upload a PDF to log your first load." : "No loads with this status."}
            </p>
          </div>
        ) : (
          <div className="sheet mt-6 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-foreground hover:bg-transparent">
                  <TableHead className="eyebrow h-9 pl-4">Shipper</TableHead>
                  <TableHead className="eyebrow h-9">Lane</TableHead>
                  <TableHead className="eyebrow h-9">Pickup</TableHead>
                  <TableHead className="eyebrow h-9 text-right">Rate</TableHead>
                  <TableHead className="eyebrow h-9 text-center">Status</TableHead>
                  <TableHead className="eyebrow h-9 pr-4 text-right">Missing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((load) => {
                  const f = load.fields;
                  const href = `/loads/${load.id}`;
                  const missing = load.missing_fields.length;
                  return (
                    <TableRow key={load.id} className="relative hover:bg-hivis/10">
                      <TableCell className="py-3 pl-4 font-medium">
                        {/* The stretched link makes the whole row clickable */}
                        <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
                          {f?.shipper_name ?? "Unknown shipper"}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {f ? `${shortPlace(f.pickup.location)} → ${shortPlace(f.delivery.location)}` : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{formatDateTime(f?.pickup.earliest ?? f?.pickup.latest ?? null)}</TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">{formatUsd(f?.rate_usd ?? null)}</TableCell>
                      <TableCell className="text-center">
                        <Stamp status={load.status} size="sm" />
                      </TableCell>
                      <TableCell className={cn("pr-4 text-right font-mono text-sm tabular-nums", missing > 0 ? "font-semibold text-flag-missing" : "text-muted-foreground")}>
                        {missing > 0 ? `${missing} missing` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}

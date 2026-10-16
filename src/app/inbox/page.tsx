import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUS_LABELS, formatDateTime, formatUsd } from "@/lib/loads";
import { cn } from "@/lib/utils";
import type { Load, LoadStatus } from "@/types";

const FILTERS: (LoadStatus | "all")[] = ["all", "needs_review", "approved", "rejected", "failed"];

const BADGE_VARIANT: Record<LoadStatus, "default" | "secondary" | "outline" | "destructive"> = {
  needs_review: "secondary",
  approved: "default",
  rejected: "outline",
  failed: "destructive",
};

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
    <main className="mx-auto w-full max-w-6xl p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <Link href="/loads/new" className={cn(buttonVariants())}>New load</Link>
      </div>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/inbox" : `/inbox?status=${f}`}
            className={cn(buttonVariants({ variant: f === active ? "secondary" : "ghost", size: "sm" }))}
            aria-current={f === active ? "page" : undefined}
          >
            {f === "all" ? "All" : STATUS_LABELS[f]} ({count(f)})
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">
          {loads.length === 0 ? "No loads yet. Paste an email or upload a PDF to get started." : "No loads with this status."}
        </p>
      ) : (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Shipper</TableHead>
              <TableHead>Lane</TableHead>
              <TableHead>Pickup</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Missing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((load) => {
              const f = load.fields;
              const href = `/loads/${load.id}`;
              return (
                <TableRow key={load.id} className="relative">
                  <TableCell className="font-medium">
                    {/* The stretched link makes the whole row clickable */}
                    <Link href={href} className="after:absolute after:inset-0">
                      {f?.shipper_name ?? "Unknown shipper"}
                    </Link>
                  </TableCell>
                  <TableCell>{f ? `${shortPlace(f.pickup.location)} → ${shortPlace(f.delivery.location)}` : "—"}</TableCell>
                  <TableCell>{formatDateTime(f?.pickup.earliest ?? f?.pickup.latest ?? null)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUsd(f?.rate_usd ?? null)}</TableCell>
                  <TableCell>
                    <Badge variant={BADGE_VARIANT[load.status]}>{STATUS_LABELS[load.status]}</Badge>
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums", load.missing_fields.length > 0 && "text-red-600 dark:text-red-400")}>
                    {load.missing_fields.length}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </main>
  );
}

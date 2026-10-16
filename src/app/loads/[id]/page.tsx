import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import type { Load } from "@/types";
import { ReviewForm } from "./review-form";

const SIGNED_URL_SECONDS = 60 * 60;

export default async function ReviewPage({ params }: PageProps<"/loads/[id]">) {
  const { id } = await params;
  // Always render per request: this page reads the signed-in user's data
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS returns nothing for someone else's load
  const { data: load } = await supabase.from("loads").select("*").eq("id", id).single<Load>();
  if (!load) notFound();

  let pdfUrl: string | null = null;
  if (load.source_file_path) {
    const { data } = await supabase.storage
      .from("load-documents")
      .createSignedUrl(load.source_file_path, SIGNED_URL_SECONDS);
    pdfUrl = data?.signedUrl ?? null;
  }

  const { data: run } = await supabase
    .from("extraction_runs")
    .select("error")
    .eq("load_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader>
        <Link href="/inbox" className="underline-offset-4 hover:underline">← Load ledger</Link>
        <Link href="/loads/new" className="underline-offset-4 hover:underline">New load</Link>
      </SiteHeader>
      <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-6 lg:self-start">
          <span className="eyebrow">Source document · {load.source_type === "pdf" ? "PDF rate confirmation" : "email"}</span>
          {pdfUrl ? (
            <iframe src={pdfUrl} title="Source PDF" className="sheet h-[45vh] lg:h-[78vh] w-full" />
          ) : (
            <pre className="sheet h-[45vh] lg:h-[78vh] overflow-auto whitespace-pre-wrap p-5 font-mono text-sm leading-relaxed">
              {load.source_text ?? "No source available."}
            </pre>
          )}
        </section>
        <ReviewForm load={load} extractionError={run?.error ?? null} />
      </main>
    </div>
  );
}

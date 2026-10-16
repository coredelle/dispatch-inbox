import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
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
    <main className="mx-auto grid w-full max-w-7xl gap-6 p-6 lg:grid-cols-2">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Source ({load.source_type === "pdf" ? "PDF" : "email"})
        </h2>
        {pdfUrl ? (
          <iframe src={pdfUrl} title="Source PDF" className="h-[80vh] w-full rounded-lg border" />
        ) : (
          <pre className="h-[80vh] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted p-4 text-sm">
            {load.source_text ?? "No source available."}
          </pre>
        )}
      </section>
      <ReviewForm load={load} extractionError={run?.error ?? null} />
    </main>
  );
}

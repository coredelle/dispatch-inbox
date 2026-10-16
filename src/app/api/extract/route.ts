import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractFromEmail, extractFromPdf, type ExtractionOutcome } from "@/lib/anthropic/extract";
import { draftFollowup } from "@/lib/anthropic/followup";
import { computeMissing, normalizeFields } from "@/lib/loads";
import { logRun } from "@/lib/runs";
import { checkRateLimit } from "@/lib/rate-limit";

// Give the Claude call room to finish on Vercel
export const maxDuration = 60;

const MAX_EMAIL_CHARS = 50_000;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const BUCKET = "load-documents";

// Body is { text } for a pasted email, or { filePath } for a PDF the browser
// already uploaded to storage (keeps large files out of the request body)
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const filePath = typeof body?.filePath === "string" ? body.filePath : "";

  let newLoad: { source_type: "email" | "pdf"; source_text?: string; source_file_path?: string };
  let runExtraction: () => Promise<ExtractionOutcome>;

  if (filePath) {
    const ownPath = new RegExp(`^${user.id}/[0-9a-f-]{36}\\.pdf$`);
    if (!ownPath.test(filePath)) {
      return NextResponse.json({ error: "Invalid file." }, { status: 400 });
    }
    const { data: file, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(filePath);
    if (downloadError || !file) {
      return NextResponse.json({ error: "Could not read the uploaded file." }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDFs must be 10 MB or smaller." }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return NextResponse.json({ error: "That file isn't a PDF." }, { status: 400 });
    }
    newLoad = { source_type: "pdf", source_file_path: filePath };
    runExtraction = () => extractFromPdf(bytes.toString("base64"));
  } else if (text) {
    if (text.length > MAX_EMAIL_CHARS) {
      return NextResponse.json({ error: "That email is too long." }, { status: 400 });
    }
    newLoad = { source_type: "email", source_text: text };
    runExtraction = () => extractFromEmail(text);
  } else {
    return NextResponse.json({ error: "Paste an email or upload a PDF first." }, { status: 400 });
  }

  const limited = await checkRateLimit(supabase, user, "extract");
  if (limited) {
    return NextResponse.json({ error: limited }, { status: 429 });
  }

  const { data: load, error: insertError } = await supabase
    .from("loads")
    .insert({ user_id: user.id, ...newLoad })
    .select("id")
    .single();
  if (insertError || !load) {
    console.error("Load insert failed:", insertError);
    return NextResponse.json({ error: "Could not save the load." }, { status: 500 });
  }

  const outcome = await runExtraction();

  await logRun(supabase, load.id, outcome);

  let update: Record<string, unknown> = { status: "failed" };
  if (outcome.fields) {
    const fields = normalizeFields(outcome.fields);
    const missing = computeMissing(fields);
    update = {
      extracted: outcome.fields,
      fields,
      missing_fields: missing,
      low_confidence_fields: fields.low_confidence_fields,
    };
    if (missing.length > 0) {
      const followup = await draftFollowup(fields, missing);
      await logRun(supabase, load.id, followup);
      update.followup_draft = followup.draft;
    }
  }
  const { error: updateError } = await supabase
    .from("loads")
    .update(update)
    .eq("id", load.id);
  if (updateError) console.error("Load update failed:", updateError);

  return NextResponse.json({
    loadId: load.id,
    status: outcome.fields ? "needs_review" : "failed",
    fields: outcome.fields,
    error: outcome.error,
    run: {
      model: outcome.model,
      inputTokens: outcome.inputTokens,
      outputTokens: outcome.outputTokens,
      latencyMs: outcome.latencyMs,
      estCostUsd: outcome.estCostUsd,
      stopReason: outcome.stopReason,
    },
  });
}

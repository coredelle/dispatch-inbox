import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractFromEmail } from "@/lib/anthropic/extract";

// Give the Claude call room to finish on Vercel
export const maxDuration = 60;

const MAX_EMAIL_CHARS = 50_000;

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
  if (!text) {
    return NextResponse.json({ error: "Paste an email first." }, { status: 400 });
  }
  if (text.length > MAX_EMAIL_CHARS) {
    return NextResponse.json({ error: "That email is too long." }, { status: 400 });
  }

  const { data: load, error: insertError } = await supabase
    .from("loads")
    .insert({ user_id: user.id, source_type: "email", source_text: text })
    .select("id")
    .single();
  if (insertError || !load) {
    console.error("Load insert failed:", insertError);
    return NextResponse.json({ error: "Could not save the load." }, { status: 500 });
  }

  const outcome = await extractFromEmail(text);

  const { error: runError } = await supabase.from("extraction_runs").insert({
    load_id: load.id,
    model: outcome.model,
    input_tokens: outcome.inputTokens,
    output_tokens: outcome.outputTokens,
    latency_ms: outcome.latencyMs,
    est_cost_usd: outcome.estCostUsd,
    stop_reason: outcome.stopReason,
    error: outcome.error,
  });
  if (runError) console.error("Extraction run insert failed:", runError);

  const update = outcome.fields
    ? {
        extracted: outcome.fields,
        fields: outcome.fields,
        missing_fields: outcome.fields.missing_fields,
        low_confidence_fields: outcome.fields.low_confidence_fields,
      }
    : { status: "failed" };
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

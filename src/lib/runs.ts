import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface RunLog {
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  estCostUsd: number;
  stopReason: string;
  error: string | null;
}

// One row per Claude call (extraction or follow-up draft) for cost tracking
export async function logRun(supabase: Supabase, loadId: string, run: RunLog) {
  const { error } = await supabase.from("extraction_runs").insert({
    load_id: loadId,
    model: run.model,
    input_tokens: run.inputTokens,
    output_tokens: run.outputTokens,
    latency_ms: run.latencyMs,
    est_cost_usd: run.estCostUsd,
    stop_reason: run.stopReason,
    error: run.error,
  });
  if (error) console.error("Run log insert failed:", error);
}

import "server-only";
import { FOLLOWUP_MODEL_NAME, MODEL_NAME } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UsageStats {
  extractions: number;
  avgCostPerLoad: number | null;
  avgExtractionCost: number | null;
  avgExtractionLatencyMs: number | null;
  avgFollowupCost: number | null;
  extractionModel: string;
  followupModel: string;
}

const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// Aggregates across all users' real runs (seeded sample copies skipped). Runs from
// deleted sandboxes stay in the log with no load attached. Only averages leave the server.
export async function getUsageStats(): Promise<UsageStats> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("extraction_runs")
    .select("model, est_cost_usd, latency_ms, error")
    .is("error", null)
    .eq("is_seed", false)
    .limit(10_000);
  const runs = data ?? [];

  const extractions = runs.filter((r) => r.model !== FOLLOWUP_MODEL_NAME);
  const followups = runs.filter((r) => r.model === FOLLOWUP_MODEL_NAME);

  return {
    extractions: extractions.length,
    // Every load has one extraction, so total spend over extractions is the cost per load
    avgCostPerLoad: extractions.length
      ? runs.reduce((sum, r) => sum + Number(r.est_cost_usd), 0) / extractions.length
      : null,
    avgExtractionCost: average(extractions.map((r) => Number(r.est_cost_usd))),
    avgExtractionLatencyMs: average(extractions.map((r) => r.latency_ms)),
    avgFollowupCost: average(followups.map((r) => Number(r.est_cost_usd))),
    extractionModel: MODEL_NAME,
    followupModel: FOLLOWUP_MODEL_NAME,
  };
}

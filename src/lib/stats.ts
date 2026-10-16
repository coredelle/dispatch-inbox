import "server-only";
import { FOLLOWUP_MODEL_NAME, MODEL_NAME } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UsageStats {
  loads: number;
  extractions: number;
  avgCostPerLoad: number | null;
  avgExtractionCost: number | null;
  avgExtractionLatencyMs: number | null;
  avgFollowupCost: number | null;
  extractionModel: string;
  followupModel: string;
}

const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// Aggregates across all users' runs. Only the averages leave the server.
export async function getUsageStats(): Promise<UsageStats> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("extraction_runs")
    .select("load_id, model, est_cost_usd, latency_ms, error")
    .is("error", null)
    .limit(10_000);
  const runs = data ?? [];

  const costByLoad = new Map<string, number>();
  for (const run of runs) {
    costByLoad.set(run.load_id, (costByLoad.get(run.load_id) ?? 0) + Number(run.est_cost_usd));
  }
  const extractions = runs.filter((r) => r.model !== FOLLOWUP_MODEL_NAME);
  const followups = runs.filter((r) => r.model === FOLLOWUP_MODEL_NAME);

  return {
    loads: costByLoad.size,
    extractions: extractions.length,
    avgCostPerLoad: average([...costByLoad.values()]),
    avgExtractionCost: average(extractions.map((r) => Number(r.est_cost_usd))),
    avgExtractionLatencyMs: average(extractions.map((r) => r.latency_ms)),
    avgFollowupCost: average(followups.map((r) => Number(r.est_cost_usd))),
    extractionModel: MODEL_NAME,
    followupModel: FOLLOWUP_MODEL_NAME,
  };
}

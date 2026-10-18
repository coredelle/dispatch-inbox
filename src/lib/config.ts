export const MODEL_NAME = "claude-sonnet-5-5";
// Cheap model for the short follow-up email draft
export const FOLLOWUP_MODEL_NAME = "claude-haiku-5-5";

// Claude-backed requests (extractions + follow-up drafts) per user per hour
export const RATE_LIMIT_PER_HOUR = { demo: 20, user: 60 };

// Ceiling on demo requests across all sandboxes in any 24 hours, so a bot making
// many sandboxes can't run up the bill (~1¢ each, so at most about $3 a day)
export const DAILY_DEMO_REQUEST_CAP = 300;

// Per-million-token prices (USD). Swap when comparing haiku vs sonnet.
export const TOKEN_PRICES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2.0, output: 10.0 },
  "claude-haiku-5-5":  { input: 0.1, output: 0.5  },
};

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const prices = TOKEN_PRICES[model] ?? TOKEN_PRICES["claude-sonnet-5-5"];
  return (inputTokens * prices.input + outputTokens * prices.output) / 1_000_000;
}

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { MODEL_NAME, estimateCostUsd } from "@/lib/config";
import { EXTRACTION_SCHEMA } from "./schema";
import type { LoadFields } from "@/types";

// Reads ANTHROPIC_API_KEY from the server environment
const client = new Anthropic();

const SYSTEM_PROMPT = `You extract freight load details from shipping emails and rate confirmations for a dispatcher. Use only information present in the document. If a value is absent, return null and list it in missing_fields; never guess. Put a field in low_confidence_fields when the document is ambiguous about it (for example, two different dates or a rate that might be per mile). Normalize dates to ISO 8601 and weights to pounds.`;

const MAX_TOKENS = 2048;
const RETRY_MAX_TOKENS = 8192;

export interface ExtractionOutcome {
  fields: LoadFields | null;
  error: string | null;
  stopReason: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  estCostUsd: number;
}

export function extractFromEmail(text: string): Promise<ExtractionOutcome> {
  return runExtraction([
    {
      type: "text",
      text: `Extract the load details from this email.\n\n<email>\n${text}\n</email>`,
    },
  ]);
}

async function runExtraction(
  content: Anthropic.ContentBlockParam[],
): Promise<ExtractionOutcome> {
  const started = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;

  const finish = (
    partial: Pick<ExtractionOutcome, "fields" | "error" | "stopReason">,
  ): ExtractionOutcome => ({
    ...partial,
    model: MODEL_NAME,
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - started,
    estCostUsd: estimateCostUsd(MODEL_NAME, inputTokens, outputTokens),
  });

  try {
    let response = await callClaude(content, MAX_TOKENS);
    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;

    if (response.stop_reason === "max_tokens") {
      response = await callClaude(content, RETRY_MAX_TOKENS);
      inputTokens += response.usage.input_tokens;
      outputTokens += response.usage.output_tokens;
    }

    const stopReason = response.stop_reason ?? "unknown";

    if (stopReason === "refusal") {
      return finish({
        fields: null,
        error: "The AI declined to process this document. Try a different email or file.",
        stopReason,
      });
    }
    if (stopReason === "max_tokens") {
      return finish({
        fields: null,
        error: "The response was too long to finish. Try a shorter email.",
        stopReason,
      });
    }

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return finish({ fields: null, error: "The AI returned no data.", stopReason });
    }

    return finish({
      fields: JSON.parse(textBlock.text) as LoadFields,
      error: null,
      stopReason,
    });
  } catch (err) {
    console.error("Extraction failed:", err);
    return finish({
      fields: null,
      error: "Extraction failed. Please try again in a moment.",
      stopReason: "error",
    });
  }
}

function callClaude(content: Anthropic.ContentBlockParam[], maxTokens: number) {
  return client.messages.create({
    model: MODEL_NAME,
    max_tokens: maxTokens,
    system: SYSTEM_PROMPT,
    // Extraction is a lookup task: skip extended thinking to keep latency low
    thinking: { type: "between_tools" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: EXTRACTION_SCHEMA },
    },
    messages: [{ role: "user", content }],
  });
}

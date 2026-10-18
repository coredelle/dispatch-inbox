import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { MODEL_NAME, estimateCostUsd } from "@/lib/config";
import { EXTRACTION_SCHEMA } from "./schema";
import type { LoadFields } from "@/types";

// Reads ANTHROPIC_API_KEY from the server environment
const client = new Anthropic();

const SYSTEM_PROMPT = `You extract freight load details from shipping emails and rate confirmations for a dispatcher. Use only information present in the document. If a value is absent, return null and list it in missing_fields; never guess. Resolve relative dates ("next tues", "tomorrow", "wed morning") to calendar dates, counting from the document's own sent date when it shows one and otherwise from the received date you are given, and put each date you resolved this way in low_confidence_fields so a person checks it. A vague time of day like "morning" gives a date with no time. Put a field in low_confidence_fields when the document is ambiguous about it (for example, two different dates, an impossible date, or a rate that might be per mile or depends on a condition). An exact unit conversion is not ambiguous. In email threads, the most recent message wins when details change. Normalize dates to ISO 8601 and weights to pounds.`;

// US Central: close to the middle of US freight hours, so "today" rarely flips early
const RECEIVED_TIME_ZONE = "America/Chicago";

// "Received 2026-11-04 (Wednesday)": the anchor for relative dates when the document has no sent date
function receivedLine(receivedAt: Date): string {
  const date = receivedAt.toLocaleDateString("en-CA", { timeZone: RECEIVED_TIME_ZONE });
  const day = receivedAt.toLocaleDateString("en-US", { weekday: "long", timeZone: RECEIVED_TIME_ZONE });
  return `Received ${date} (${day}).`;
}

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

export function extractFromEmail(text: string, receivedAt = new Date()): Promise<ExtractionOutcome> {
  return runExtraction([
    {
      type: "text",
      text: `${receivedLine(receivedAt)} Extract the load details from this email.\n\n<email>\n${text}\n</email>`,
    },
  ]);
}

export function extractFromPdf(base64Pdf: string, receivedAt = new Date()): Promise<ExtractionOutcome> {
  return runExtraction([
    {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64Pdf },
    },
    { type: "text", text: `${receivedLine(receivedAt)} Extract the load details from this rate confirmation.` },
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
        error: "The response was too long to finish. Try a shorter document.",
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

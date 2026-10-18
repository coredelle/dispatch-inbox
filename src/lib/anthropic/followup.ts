import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { FOLLOWUP_MODEL_NAME, FOLLOWUP_SIGNATURE, estimateCostUsd } from "@/lib/config";
import { MISSING_FIELD_LABELS } from "@/lib/loads";
import type { LoadFields } from "@/types";

// Reads ANTHROPIC_API_KEY from the server environment
const client = new Anthropic();

const SYSTEM_PROMPT = `You write short follow-up emails for a freight dispatcher. Write a plain, polite email of 3 to 5 sentences asking only for the missing items listed. Greet the contact by first name if one is given, then get straight to the point: no filler like "Thanks for getting this load moving". Refer to the load by its reference and cities (e.g. "PO 77812, Lancaster to Baltimore"), never full street addresses. If the sender asked for something, acknowledge it in one sentence, but never promise to cover the load, accept a rate or agree to a deadline; say you'll confirm once you have the missing details. Do not invent details, do not add a subject line, and do not include placeholders like [Your Name]. End with "Thanks," on its own line and nothing after it. Output only the email body as plain text.`;

// Free text from the email reaches the cheap model only through this short, trimmed phrase
const MAX_REQUEST_CHARS = 200;

export interface FollowupOutcome {
  draft: string | null;
  error: string | null;
  stopReason: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  estCostUsd: number;
}

export async function draftFollowup(fields: LoadFields, missing: string[]): Promise<FollowupOutcome> {
  const started = Date.now();
  const lane = [fields.pickup.location, fields.delivery.location].filter(Boolean).join(" → ");
  const details = [
    `Missing items: ${missing.map((k) => MISSING_FIELD_LABELS[k] ?? k).join(", ")}`,
    `Contact name: ${fields.contact.name ?? "unknown"}`,
    `Shipper: ${fields.shipper_name ?? "unknown"}`,
    lane && `Lane: ${lane}`,
    fields.reference_numbers.length > 0 && `Reference: ${fields.reference_numbers.join(", ")}`,
    fields.sender_requests && `Sender asked: ${fields.sender_requests.slice(0, MAX_REQUEST_CHARS)}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client.messages.create({
      model: FOLLOWUP_MODEL_NAME,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      // A short, plain email needs no extended thinking
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      messages: [{ role: "user", content: details }],
    });
    const { input_tokens, output_tokens } = response.usage;
    const text = response.content.find((b) => b.type === "text");
    const ok = response.stop_reason === "end_turn" && text?.type === "text";
    return {
      // The signature is added here, not by the model, so it's always exactly right
      draft: ok ? `${text.text.trim()}\n${FOLLOWUP_SIGNATURE}` : null,
      error: ok ? null : "Could not draft a follow-up email.",
      stopReason: response.stop_reason ?? "unknown",
      model: FOLLOWUP_MODEL_NAME,
      inputTokens: input_tokens,
      outputTokens: output_tokens,
      latencyMs: Date.now() - started,
      estCostUsd: estimateCostUsd(FOLLOWUP_MODEL_NAME, input_tokens, output_tokens),
    };
  } catch (err) {
    console.error("Follow-up draft failed:", err);
    return {
      draft: null,
      error: "Could not draft a follow-up email.",
      stopReason: "error",
      model: FOLLOWUP_MODEL_NAME,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - started,
      estCostUsd: 0,
    };
  }
}

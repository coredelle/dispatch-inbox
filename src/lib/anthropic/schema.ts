// Extraction JSON schema, sent as the structured-output format (server-side only).
// Field descriptions double as extraction instructions; tune them alongside the
// system prompt and check with `npm run eval`.

const DATE_DESCRIPTION =
  "Local time as written, no timezone. YYYY-MM-DDTHH:MM (24-hour, no seconds) when a time is given, YYYY-MM-DD when only a date is.";

// Shared by missing_fields and low_confidence_fields so flags use one vocabulary
const FIELD_KEYS = [
  "shipper_name", "pickup.location", "pickup.date",
  "delivery.location", "delivery.date", "commodity",
  "weight_lbs", "equipment_type", "rate_usd", "contact",
];

export const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "shipper_name", "pickup", "delivery", "commodity", "weight_lbs",
    "equipment_type", "rate_usd", "reference_numbers", "contact",
    "special_instructions", "sender_requests", "missing_fields", "low_confidence_fields",
  ],
  properties: {
    shipper_name: {
      type: ["string", "null"],
      description: "The company shipping the freight (usually the pickup party), not the broker or carrier.",
    },
    pickup: {
      type: "object", additionalProperties: false,
      required: ["location", "earliest", "latest"],
      properties: {
        location: { type: ["string", "null"], description: "Full address if given, otherwise City, ST" },
        earliest: { type: ["string", "null"], description: DATE_DESCRIPTION },
        latest:   { type: ["string", "null"], description: DATE_DESCRIPTION },
      },
    },
    delivery: {
      type: "object", additionalProperties: false,
      required: ["location", "earliest", "latest"],
      properties: {
        location: { type: ["string", "null"], description: "Full address if given, otherwise City, ST" },
        earliest: { type: ["string", "null"], description: DATE_DESCRIPTION },
        latest:   { type: ["string", "null"], description: DATE_DESCRIPTION },
      },
    },
    commodity:      { type: ["string", "null"] },
    weight_lbs:     { type: ["number", "null"], description: "Total weight in pounds; convert kg (1 kg = 2.20462 lbs)" },
    equipment_type: {
      type: "string",
      enum: ["dry_van", "reefer", "flatbed", "step_deck", "power_only", "other", "unknown"],
    },
    rate_usd: {
      type: ["number", "null"],
      description: "Total carrier pay in USD for the load. If only a per-mile rate is given with no mileage, use null.",
    },
    reference_numbers: {
      type: "array",
      items: { type: "string" },
      description: 'Each reference with its label as written, e.g. "PO 44817", "BOL 778120", "Load # HVL-208841".',
    },
    contact: {
      type: "object", additionalProperties: false,
      required: ["name", "email", "phone"],
      description:
        "The person who sent or arranged the load (shipper or broker contact), not the carrier's dispatcher replying in the thread.",
      properties: {
        name:  { type: ["string", "null"] },
        email: { type: ["string", "null"] },
        phone: { type: ["string", "null"] },
      },
    },
    special_instructions: { type: ["string", "null"] },
    sender_requests: {
      type: ["string", "null"],
      description:
        'What the sender asks the dispatcher to decide or answer, with any deadline, as one short phrase (e.g. "Confirm coverage by end of day", "Send a quote"). Not contact preferences like "text me" or "call with ETA". Null if they only describe the load.',
    },
    missing_fields: {
      type: "array",
      items: { type: "string", enum: FIELD_KEYS },
    },
    low_confidence_fields: {
      type: "array",
      items: { type: "string", enum: FIELD_KEYS },
      description: "Fields whose value the document leaves genuinely ambiguous. Not for exact unit conversions.",
    },
  },
} as const;

// Extraction JSON schema — used server-side only in Task 3
export const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "shipper_name", "pickup", "delivery", "commodity", "weight_lbs",
    "equipment_type", "rate_usd", "reference_numbers", "contact",
    "special_instructions", "missing_fields", "low_confidence_fields",
  ],
  properties: {
    shipper_name: { type: ["string", "null"] },
    pickup: {
      type: "object", additionalProperties: false,
      required: ["location", "earliest", "latest"],
      properties: {
        location: { type: ["string", "null"], description: "City, ST or full address" },
        earliest: { type: ["string", "null"], description: "ISO 8601 date or datetime" },
        latest:   { type: ["string", "null"], description: "ISO 8601 date or datetime" },
      },
    },
    delivery: {
      type: "object", additionalProperties: false,
      required: ["location", "earliest", "latest"],
      properties: {
        location: { type: ["string", "null"] },
        earliest: { type: ["string", "null"] },
        latest:   { type: ["string", "null"] },
      },
    },
    commodity:      { type: ["string", "null"] },
    weight_lbs:     { type: ["number", "null"], description: "Convert kg to lbs if needed" },
    equipment_type: {
      type: "string",
      enum: ["dry_van", "reefer", "flatbed", "step_deck", "power_only", "other", "unknown"],
    },
    rate_usd:           { type: ["number", "null"] },
    reference_numbers:  { type: "array", items: { type: "string" } },
    contact: {
      type: "object", additionalProperties: false,
      required: ["name", "email", "phone"],
      properties: {
        name:  { type: ["string", "null"] },
        email: { type: ["string", "null"] },
        phone: { type: ["string", "null"] },
      },
    },
    special_instructions: { type: ["string", "null"] },
    missing_fields: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "shipper_name", "pickup.location", "pickup.date",
          "delivery.location", "delivery.date", "commodity",
          "weight_lbs", "equipment_type", "rate_usd", "contact",
        ],
      },
    },
    low_confidence_fields: { type: "array", items: { type: "string" } },
  },
} as const;

import type { EquipmentType, LoadFields } from "@/types";

export const EQUIPMENT_TYPES: EquipmentType[] = [
  "dry_van", "reefer", "flatbed", "step_deck", "power_only", "other", "unknown",
];

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed ? trimmed : null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/[$,\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.map(str).filter((s): s is string => s !== null) : [];
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

// Coerce untrusted input (a form or the model) into a clean LoadFields shape
export function normalizeFields(input: unknown): LoadFields {
  const f = obj(input);
  const pickup = obj(f.pickup);
  const delivery = obj(f.delivery);
  const contact = obj(f.contact);
  const equipment = EQUIPMENT_TYPES.includes(f.equipment_type as EquipmentType)
    ? (f.equipment_type as EquipmentType)
    : "unknown";

  return {
    shipper_name: str(f.shipper_name),
    pickup: { location: str(pickup.location), earliest: str(pickup.earliest), latest: str(pickup.latest) },
    delivery: { location: str(delivery.location), earliest: str(delivery.earliest), latest: str(delivery.latest) },
    commodity: str(f.commodity),
    weight_lbs: num(f.weight_lbs),
    equipment_type: equipment,
    rate_usd: num(f.rate_usd),
    reference_numbers: strList(f.reference_numbers),
    contact: { name: str(contact.name), email: str(contact.email), phone: str(contact.phone) },
    special_instructions: str(f.special_instructions),
    missing_fields: strList(f.missing_fields),
    low_confidence_fields: strList(f.low_confidence_fields),
  };
}

// Keys match the schema's missing_fields enum
export const MISSING_FIELD_LABELS: Record<string, string> = {
  shipper_name: "shipper name",
  "pickup.location": "pickup location",
  "pickup.date": "pickup date/time",
  "delivery.location": "delivery location",
  "delivery.date": "delivery date/time",
  commodity: "commodity",
  weight_lbs: "weight",
  equipment_type: "equipment type",
  rate_usd: "rate",
  contact: "contact details",
};

// Derived from the current values, so edits clear (or add) missing fields
export function computeMissing(f: LoadFields): string[] {
  const missing: string[] = [];
  if (!f.shipper_name) missing.push("shipper_name");
  if (!f.pickup.location) missing.push("pickup.location");
  if (!f.pickup.earliest && !f.pickup.latest) missing.push("pickup.date");
  if (!f.delivery.location) missing.push("delivery.location");
  if (!f.delivery.earliest && !f.delivery.latest) missing.push("delivery.date");
  if (!f.commodity) missing.push("commodity");
  if (f.weight_lbs === null) missing.push("weight_lbs");
  if (f.equipment_type === "unknown") missing.push("equipment_type");
  if (f.rate_usd === null) missing.push("rate_usd");
  if (!f.contact.name && !f.contact.email && !f.contact.phone) missing.push("contact");
  return missing;
}

// Flag keys from the model vary ("pickup.earliest", "pickup.date", "pickup"),
// so an input matches its own path, its group key, or its top-level section
export function isFlagged(list: string[], path: string, group?: string): boolean {
  const section = path.split(".")[0];
  return list.some((k) => k === path || k === group || k === section);
}

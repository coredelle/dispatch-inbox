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

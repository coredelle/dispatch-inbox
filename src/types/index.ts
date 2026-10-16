export type LoadStatus = "needs_review" | "approved" | "rejected" | "failed";
export type SourceType = "email" | "pdf";
export type EquipmentType =
  | "dry_van"
  | "reefer"
  | "flatbed"
  | "step_deck"
  | "power_only"
  | "other"
  | "unknown";

export interface LoadFields {
  shipper_name: string | null;
  pickup: {
    location: string | null;
    earliest: string | null;
    latest: string | null;
  };
  delivery: {
    location: string | null;
    earliest: string | null;
    latest: string | null;
  };
  commodity: string | null;
  weight_lbs: number | null;
  equipment_type: EquipmentType;
  rate_usd: number | null;
  reference_numbers: string[];
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  special_instructions: string | null;
  missing_fields: string[];
  low_confidence_fields: string[];
}

export interface Load {
  id: string;
  user_id: string;
  status: LoadStatus;
  source_type: SourceType;
  source_text: string | null;
  source_file_path: string | null;
  extracted: LoadFields | null;
  fields: LoadFields | null;
  missing_fields: string[];
  low_confidence_fields: string[];
  followup_draft: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface ExtractionRun {
  id: string;
  load_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  est_cost_usd: number;
  stop_reason: string;
  error: string | null;
  created_at: string;
}

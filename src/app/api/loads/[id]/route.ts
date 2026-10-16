import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeMissing, normalizeFields } from "@/lib/loads";

const STATUSES = ["needs_review", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];

// Body: { fields?, status? } — save edits, and/or approve / reject / reopen
export async function PATCH(request: Request, ctx: RouteContext<"/api/loads/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const status: Status | null = STATUSES.includes(body?.status) ? body.status : null;
  if (!body?.fields && !status) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  // RLS limits this to the signed-in user's own loads
  const { data: load } = await supabase.from("loads").select("id, fields").eq("id", id).single();
  if (!load) {
    return NextResponse.json({ error: "Load not found." }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (body.fields) {
    const fields = normalizeFields(body.fields);
    update.fields = fields;
    update.missing_fields = computeMissing(fields);
  }
  if (status) {
    if (status === "approved" && !update.fields && !load.fields) {
      return NextResponse.json({ error: "There are no fields to approve." }, { status: 400 });
    }
    update.status = status;
    update.approved_at = status === "approved" ? new Date().toISOString() : null;
  }

  const { data: updated, error } = await supabase
    .from("loads")
    .update(update)
    .eq("id", id)
    .select("id, status, fields, missing_fields, approved_at")
    .single();
  if (error || !updated) {
    console.error("Load update failed:", error);
    return NextResponse.json({ error: "Could not save changes." }, { status: 500 });
  }

  return NextResponse.json(updated);
}

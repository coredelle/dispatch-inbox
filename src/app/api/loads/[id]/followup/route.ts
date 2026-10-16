import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { draftFollowup } from "@/lib/anthropic/followup";
import { computeMissing, normalizeFields } from "@/lib/loads";
import { logRun } from "@/lib/runs";

// Redraft the follow-up email from the load's current (possibly edited) fields
export async function POST(_request: Request, ctx: RouteContext<"/api/loads/[id]/followup">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  // RLS limits this to the signed-in user's own loads
  const { data: load } = await supabase.from("loads").select("id, fields").eq("id", id).single();
  if (!load?.fields) {
    return NextResponse.json({ error: "Load not found." }, { status: 404 });
  }

  const fields = normalizeFields(load.fields);
  const missing = computeMissing(fields);
  if (missing.length === 0) {
    await supabase.from("loads").update({ followup_draft: null }).eq("id", id);
    return NextResponse.json({ draft: null, missing });
  }

  const followup = await draftFollowup(fields, missing);
  await logRun(supabase, id, followup);
  if (!followup.draft) {
    return NextResponse.json({ error: followup.error }, { status: 502 });
  }
  await supabase.from("loads").update({ followup_draft: followup.draft }).eq("id", id);
  return NextResponse.json({ draft: followup.draft, missing });
}

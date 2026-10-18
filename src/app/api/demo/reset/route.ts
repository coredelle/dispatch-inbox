import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSandboxUser, resetDemoData } from "@/lib/demo";

// Restore a sandbox's seed loads. Only touches the caller's own sandbox.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSandboxUser(user)) {
    return NextResponse.json({ error: "Only demo sandboxes can be reset." }, { status: 403 });
  }

  try {
    await resetDemoData(user.id);
  } catch (err) {
    console.error("Sandbox reset failed:", err);
    return NextResponse.json({ error: "Reset failed. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoUser, resetDemoData } from "@/lib/demo";

// Restore the demo account's seed loads. Only the demo user can do this.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isDemoUser(user)) {
    return NextResponse.json({ error: "Only the demo account can be reset." }, { status: 403 });
  }

  try {
    await resetDemoData(user.id);
  } catch (err) {
    console.error("Demo reset failed:", err);
    return NextResponse.json({ error: "Reset failed. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSandboxUser, resetDemoData } from "@/lib/demo";

// "Try the demo": start a private sandbox (an anonymous user) seeded with sample loads.
// A visitor who already has one keeps it.
export async function POST(request: Request) {
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, request.url), 303);
  const supabase = await createClient();

  let {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && !isSandboxUser(user)) return redirectTo("/inbox");

  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      // Off in Supabase, or Supabase's per-IP limit on new anonymous users was hit
      console.error("Sandbox sign-in failed:", error);
      return redirectTo("/login?error=demo");
    }
    user = data.user;
  }

  const { count } = await supabase.from("loads").select("id", { count: "exact", head: true });
  if (count === 0) {
    try {
      await resetDemoData(user.id);
    } catch (err) {
      console.error("Sandbox seed failed:", err);
    }
  }
  return redirectTo("/inbox");
}

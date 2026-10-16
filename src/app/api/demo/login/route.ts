import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoConfigured, resetDemoData, signInDemo } from "@/lib/demo";

// "Try the demo": sign in as the shared demo user, seeding it on first use
export async function POST(request: Request) {
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, request.url), 303);
  if (!isDemoConfigured()) return redirectTo("/login?error=demo");

  const supabase = await createClient();
  const user = await signInDemo(supabase);
  if (!user) return redirectTo("/login?error=demo");

  const { count } = await supabase.from("loads").select("id", { count: "exact", head: true });
  if (count === 0) {
    try {
      await resetDemoData(user.id);
    } catch (err) {
      console.error("Demo seed failed:", err);
    }
  }
  return redirectTo("/inbox");
}

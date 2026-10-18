import "server-only";
import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";
import { DAILY_DEMO_REQUEST_CAP, RATE_LIMIT_PER_HOUR } from "@/lib/config";
import { isSandboxUser } from "@/lib/demo";
import { createAdminClient } from "@/lib/supabase/admin";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Counts the user's Claude-backed requests in the past hour, and for demo
// sandboxes all demo requests in the past day. Returns an error message when over
// a limit; otherwise records this request and returns null.
export async function checkRateLimit(
  supabase: Supabase,
  user: User,
  kind: "extract" | "followup",
): Promise<string | null> {
  const sandbox = isSandboxUser(user);
  const limit = sandbox ? RATE_LIMIT_PER_HOUR.demo : RATE_LIMIT_PER_HOUR.user;
  const since = new Date(Date.now() - 60 * 60_000).toISOString();

  const { count, error } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if (error) {
    console.error("Rate limit check failed:", error);
    return "Could not check usage limits. Please try again.";
  }
  if ((count ?? 0) >= limit) {
    return `You've reached the limit of ${limit} AI requests per hour. Please try again later.`;
  }

  if (sandbox) {
    // Row-level security hides other users' events, so the site-wide count needs the admin client
    const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const { count: daily, error: dailyError } = await createAdminClient()
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayAgo);
    if (dailyError) {
      console.error("Daily cap check failed:", dailyError);
      return "Could not check usage limits. Please try again.";
    }
    if ((daily ?? 0) >= DAILY_DEMO_REQUEST_CAP) {
      return "The demo has hit its daily AI limit. Please try again tomorrow, or get in touch for a walkthrough.";
    }
  }

  await supabase.from("usage_events").insert({ user_id: user.id, kind });
  return null;
}

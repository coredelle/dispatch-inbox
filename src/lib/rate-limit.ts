import "server-only";
import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";
import { RATE_LIMIT_PER_HOUR } from "@/lib/config";
import { isDemoUser } from "@/lib/demo";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Counts the user's Claude-backed requests in the past hour. Returns an error
// message when over the limit; otherwise records this request and returns null.
export async function checkRateLimit(
  supabase: Supabase,
  user: User,
  kind: "extract" | "followup",
): Promise<string | null> {
  const limit = isDemoUser(user) ? RATE_LIMIT_PER_HOUR.demo : RATE_LIMIT_PER_HOUR.user;
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

  await supabase.from("usage_events").insert({ user_id: user.id, kind });
  return null;
}

import "server-only";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { User } from "@supabase/supabase-js";
import seedLoads from "../../sample-data/seed/demo-loads.json";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { computeMissing, normalizeFields } from "@/lib/loads";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const BUCKET = "load-documents";

export function isDemoConfigured(): boolean {
  return Boolean(process.env.DEMO_USER_EMAIL && process.env.DEMO_USER_PASSWORD);
}

export function isDemoUser(user: Pick<User, "email"> | null): boolean {
  const demoEmail = process.env.DEMO_USER_EMAIL?.toLowerCase();
  return Boolean(demoEmail && user?.email?.toLowerCase() === demoEmail);
}

// Signs the shared demo user in on this request's cookie session. If a visitor
// changed the demo password, restore it from the env var and retry.
export async function signInDemo(supabase: Supabase): Promise<User | null> {
  const email = process.env.DEMO_USER_EMAIL!;
  const password = process.env.DEMO_USER_PASSWORD!;

  const first = await supabase.auth.signInWithPassword({ email, password });
  if (first.data.user) return first.data.user;

  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const demo = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!demo) return null;
  await admin.auth.admin.updateUserById(demo.id, { password });

  const retry = await supabase.auth.signInWithPassword({ email, password });
  return retry.data.user;
}

// Replaces all of the demo user's loads and files with the seed set
export async function resetDemoData(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: files } = await admin.storage.from(BUCKET).list(userId, { limit: 1000 });
  if (files && files.length > 0) {
    await admin.storage.from(BUCKET).remove(files.map((f) => `${userId}/${f.name}`));
  }
  const { error: deleteError } = await admin.from("loads").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;

  const now = Date.now();
  for (const [i, seed] of seedLoads.entries()) {
    let sourceFilePath: string | null = null;
    if (seed.source_pdf) {
      const bytes = await readFile(path.join(process.cwd(), "sample-data/pdfs", seed.source_pdf));
      sourceFilePath = `${userId}/${randomUUID()}.pdf`;
      const { error } = await admin.storage
        .from(BUCKET)
        .upload(sourceFilePath, bytes, { contentType: "application/pdf" });
      if (error) throw error;
    }

    const fields = normalizeFields(seed.fields);
    // Space the seeds a few minutes apart so the inbox order is stable
    const createdAt = new Date(now - (seedLoads.length - i) * 5 * 60_000).toISOString();
    const { data: load, error } = await admin
      .from("loads")
      .insert({
        user_id: userId,
        status: seed.status,
        source_type: seed.source_type,
        source_text: seed.source_text,
        source_file_path: sourceFilePath,
        extracted: seed.extracted,
        fields,
        missing_fields: computeMissing(fields),
        low_confidence_fields: seed.low_confidence_fields,
        followup_draft: seed.followup_draft,
        created_at: createdAt,
        approved_at: seed.status === "approved" ? createdAt : null,
      })
      .select("id")
      .single();
    if (error || !load) throw error ?? new Error("Seed insert failed");

    if (seed.runs.length > 0) {
      await admin.from("extraction_runs").insert(
        seed.runs.map((run) => ({ ...run, load_id: load.id, created_at: createdAt })),
      );
    }
  }
}

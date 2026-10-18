import "server-only";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { User } from "@supabase/supabase-js";
import seedLoads from "../../sample-data/seed/demo-loads.json";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeMissing, normalizeFields } from "@/lib/loads";

const BUCKET = "load-documents";

// Sandboxes are deleted this long after the visitor starts one
export const SANDBOX_TTL_HOURS = 24;

// "Try the demo" visitors are anonymous Supabase users, each with their own rows
export function isSandboxUser(user: Pick<User, "is_anonymous"> | null): boolean {
  return Boolean(user?.is_anonymous);
}

// Removes every file the user uploaded
async function removeFiles(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: files } = await admin.storage.from(BUCKET).list(userId, { limit: 1000 });
  if (files && files.length > 0) {
    await admin.storage.from(BUCKET).remove(files.map((f) => `${userId}/${f.name}`));
  }
}

// Replaces all of a sandbox's loads and files with the seed set
export async function resetDemoData(userId: string): Promise<void> {
  const admin = createAdminClient();

  await removeFiles(userId);
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
        seed.runs.map((run) => ({ ...run, load_id: load.id, created_at: createdAt, is_seed: true })),
      );
    }
  }
}

// Deletes anonymous sandboxes older than the TTL, files first (storage doesn't cascade).
// Loads go with the user; the cost log and usage counts stay.
export async function deleteExpiredSandboxes(): Promise<number> {
  const admin = createAdminClient();
  const cutoff = Date.now() - SANDBOX_TTL_HOURS * 60 * 60_000;
  const expired: string[] = [];

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      if (u.is_anonymous && new Date(u.created_at).getTime() < cutoff) expired.push(u.id);
    }
    if (data.users.length < 1000) break;
  }

  for (const id of expired) {
    await removeFiles(id);
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.error("Sandbox delete failed:", id, error);
  }
  return expired.length;
}

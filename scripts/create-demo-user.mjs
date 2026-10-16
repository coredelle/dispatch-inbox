// Creates (or repairs) the shared demo user from DEMO_USER_EMAIL / DEMO_USER_PASSWORD.
// Run: npm run demo:create-user   (reads .env.local; never prints the password)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.DEMO_USER_EMAIL;
const password = process.env.DEMO_USER_PASSWORD;

if (!url || !serviceKey || !email || !password) {
  console.error(
    "Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_USER_EMAIL, DEMO_USER_PASSWORD in .env.local",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) {
  console.error("Could not list users:", listError.message);
  process.exit(1);
}

const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
  if (error) {
    console.error("Could not update demo user:", error.message);
    process.exit(1);
  }
  console.log(`Demo user already existed; password synced: ${email}`);
} else {
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    console.error("Could not create demo user:", error.message);
    process.exit(1);
  }
  console.log(`Demo user created: ${email}`);
}
console.log("Seed loads are added automatically the first time someone clicks Try the demo.");

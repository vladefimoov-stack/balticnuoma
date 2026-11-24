#!/usr/bin/env node
/**
 * Create (or promote) an admin-panel user. Public sign-up is disabled, so this is
 * how the first admin is created. Safe to re-run: an existing user is updated.
 *
 *   npm run seed:admin                       # uses SEED_ADMIN_* from .env.local
 *   npm run seed:admin -- --email vadybininkas@example.lt --password '…' --name "Vardenis" --role manager
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const { values: args } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
    name: { type: "string" },
    role: { type: "string" },
  },
});

const email = (args.email ?? process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = args.password ?? process.env.SEED_ADMIN_PASSWORD ?? "";
const fullName = (args.name ?? process.env.SEED_ADMIN_NAME ?? "").trim() || null;
const role = args.role ?? "admin";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!url || !serviceKey) fail("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local).");
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("Provide a valid email (SEED_ADMIN_EMAIL or --email).");
if (!["admin", "manager"].includes(role)) fail('--role must be "admin" or "manager".');

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUserByEmail(target) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found || data.users.length < 200) return found ?? null;
  }
  return null;
}

let user = await findUserByEmail(email);

if (user) {
  const update = { app_metadata: { ...user.app_metadata, role }, user_metadata: { ...user.user_metadata } };
  if (fullName) update.user_metadata.full_name = fullName;
  if (password) {
    if (password.length < 12) fail("Password must be at least 12 characters.");
    update.password = password;
  }
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, update);
  if (error) fail(`Could not update user: ${error.message}`);
  user = data.user;
  console.log(`• Existing user updated: ${email}`);
} else {
  if (password.length < 12) fail("Password must be at least 12 characters (SEED_ADMIN_PASSWORD or --password).");
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: fullName ? { full_name: fullName } : {},
  });
  if (error) fail(`Could not create user: ${error.message}`);
  user = data.user;
  console.log(`• User created: ${email}`);
}

// The auth trigger creates the profile; make sure role and name are in sync.
const { error: profileError } = await supabase
  .from("profiles")
  .upsert({ id: user.id, role, ...(fullName ? { full_name: fullName } : {}) }, { onConflict: "id" });
if (profileError) fail(`Could not update profile: ${profileError.message}`);

console.log(`✓ ${email} is now "${role}". Sign in at /admin.`);

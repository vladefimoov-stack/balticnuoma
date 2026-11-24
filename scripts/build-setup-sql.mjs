#!/usr/bin/env node
/**
 * Bundles all migrations + seed into ONE file, `supabase/production-setup.sql`, so the
 * owner can set up a fresh Supabase project by pasting a single script into the SQL
 * Editor (no CLI needed). The bundle:
 *   - runs in one transaction (all or nothing),
 *   - refuses to run twice (stops if the schema already exists),
 *   - records the migrations in supabase_migrations.schema_migrations, so later
 *     `supabase db push` only applies NEW migrations.
 *
 *   npm run db:bundle            # regenerate
 *   npm run db:bundle -- --check # fail if the committed bundle is out of date (used by `npm run check`)
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const migrationsDir = join(root, "supabase", "migrations");
const seedFile = join(root, "supabase", "seed.sql");
const outFile = join(root, "supabase", "production-setup.sql");

const migrations = readdirSync(migrationsDir)
  .filter((f) => /^\d{14}_[a-z0-9_]+\.sql$/.test(f))
  .sort();

const sqlString = (s) => `'${s.replaceAll("'", "''")}'`;

const parts = [
  `-- ═════════════════════════════════════════════════════════════════════════════
-- Baltic Nuoma — full database setup for a NEW Supabase project
--
-- GENERATED FILE — do not edit. Source: supabase/migrations/*.sql + supabase/seed.sql
-- Regenerate with: npm run db:bundle
--
-- How to use: Supabase Dashboard → SQL Editor → New query → paste this whole file → Run.
-- Runs in a single transaction: either everything is created, or nothing changes.
-- ═════════════════════════════════════════════════════════════════════════════

begin;

do $guard$
begin
  if to_regclass('public.cars') is not null then
    raise exception 'Baltic Nuoma database is already installed — nothing to do. (Duomenų bazė jau įdiegta.)';
  end if;
end;
$guard$;
`,
];

for (const file of migrations) {
  parts.push(`
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: ${file}
-- ─────────────────────────────────────────────────────────────────────────────
${readFileSync(join(migrationsDir, file), "utf8").trim()}
`);
}

if (existsSync(seedFile)) {
  parts.push(`
-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: supabase/seed.sql
-- ─────────────────────────────────────────────────────────────────────────────
${readFileSync(seedFile, "utf8").trim()}
`);
}

const historyRows = migrations
  .map((f) => {
    const [, version, name] = f.match(/^(\d{14})_(.+)\.sql$/);
    return `  (${sqlString(version)}, ${sqlString(name)})`;
  })
  .join(",\n");

parts.push(`
-- ─────────────────────────────────────────────────────────────────────────────
-- Mark migrations as applied for the Supabase CLI
-- ─────────────────────────────────────────────────────────────────────────────
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text not null primary key,
  statements text[],
  name text
);
insert into supabase_migrations.schema_migrations (version, name) values
${historyRows}
on conflict (version) do nothing;

commit;
`);

const output = parts.join("");

if (process.argv.includes("--check")) {
  const current = existsSync(outFile) ? readFileSync(outFile, "utf8") : "";
  if (current !== output) {
    console.error("✗ supabase/production-setup.sql is out of date — run `npm run db:bundle`.");
    process.exit(1);
  }
  console.log(`✓ supabase/production-setup.sql is up to date (${migrations.length} migrations + seed)`);
} else {
  writeFileSync(outFile, output);
  console.log(`✓ Wrote supabase/production-setup.sql (${migrations.length} migrations + seed)`);
}

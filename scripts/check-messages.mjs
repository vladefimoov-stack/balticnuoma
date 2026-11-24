#!/usr/bin/env node
// Verifies that every locale in /messages has exactly the same keys as lt.json.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..", "messages");
const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

const base = new Set(flatten(JSON.parse(readFileSync(join(dir, "lt.json"), "utf8"))));
let failed = false;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "lt.json")) {
  const keys = new Set(flatten(JSON.parse(readFileSync(join(dir, file), "utf8"))));
  const missing = [...base].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !base.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`✗ ${file}`);
    missing.forEach((k) => console.error(`  missing: ${k}`));
    extra.forEach((k) => console.error(`  extra:   ${k}`));
  } else {
    console.log(`✓ ${file} (${keys.size} keys)`);
  }
}

process.exit(failed ? 1 : 0);

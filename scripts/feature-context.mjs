import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const mapPath = resolve("scripts/feature-map.json");
const map = JSON.parse(readFileSync(mapPath, "utf8"));
const requested = process.argv[2];
const checkAll = requested === "--check";

if (!requested) {
  console.log("Available feature contexts:");
  for (const [name, item] of Object.entries(map)) console.log(`  ${name.padEnd(18)} ${item.summary}`);
  console.log("\\nUsage: node scripts/feature-context.mjs <feature-name>");
  console.log("       node scripts/feature-context.mjs --check");
  process.exit(0);
}

const names = checkAll ? Object.keys(map) : [requested];
let failed = false;
for (const name of names) {
  const item = map[name];
  if (!item) {
    console.error(`Unknown feature "${name}". Run without arguments to list available contexts.`);
    process.exitCode = 2;
    continue;
  }
  console.log(`\\n## ${name}\\n${item.summary}`);
  for (const key of ["start_here", "dependencies"]) {
    console.log(`\\n${key.replaceAll("_", " ").toUpperCase()}`);
    for (const file of item[key]) {
      const exists = existsSync(resolve(file));
      console.log(`  ${exists ? "✓" : "✗"} ${file}`);
      if (!exists) failed = true;
    }
  }
  console.log(`\\nDATABASE TABLES: ${item.tables.join(", ") || "none"}`);
  console.log(`EDGE FUNCTIONS: ${item.edge_functions.join(", ") || "none"}`);
  console.log("CHECKS:");
  for (const command of item.checks) console.log(`  ${command}`);
}
if (failed) {
  console.error("\\nFeature map contains missing file references.");
  process.exitCode = 1;
} else if (checkAll) {
  console.log("\\nAll feature context file references exist.");
}

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([".git", "node_modules"]);
const htmlFiles = [];

function collectHtmlFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) collectHtmlFiles(join(directory, entry.name));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      htmlFiles.push(join(directory, entry.name));
    }
  }
}

collectHtmlFiles(root);

const failures = [];
let checkedStoreConfigScripts = 0;

for (const file of htmlFiles) {
  const source = readFileSync(file, "utf8");
  const relativePath = relative(root, file).replaceAll("\\", "/");
  const configPattern = /<script\b(?=[^>]*\bsrc\s*=\s*["'][^"']*store-config\.js(?:\?[^"']*)?["'])[^>]*>/gi;

  for (const match of source.matchAll(configPattern)) {
    checkedStoreConfigScripts += 1;
    const tagEnd = match.index + match[0].length;
    const remaining = source.slice(tagEnd);
    const closingTag = remaining.match(/^\s*<\/script\s*>/i);

    if (!closingTag) {
      failures.push(
        relativePath + ": store-config.js must be closed immediately before any following markup or script."
      );
      continue;
    }

    const closingEnd = tagEnd + closingTag[0].length;
    const mainScripts = [...source.matchAll(/<script\b(?=[^>]*\bsrc\s*=\s*["'][^"']*main\.js(?:\?[^"']*)?["'])[^>]*>/gi)];
    for (const mainScript of mainScripts) {
      if (mainScript.index < closingEnd) {
        failures.push(relativePath + ": main.js must load after the closed store-config.js script element.");
      }
    }
  }
}

assert.ok(htmlFiles.length > 0, "No HTML files were found for the integrity check.");
assert.ok(checkedStoreConfigScripts > 0, "No store-config.js script elements were found to validate.");
assert.deepEqual(
  failures,
  [],
  "HTML script integrity check failed:\n" + failures.join("\n")
);

console.log(
  "HTML script integrity passed: " +
    htmlFiles.length +
    " HTML files scanned; " +
    checkedStoreConfigScripts +
    " store-config.js script elements are properly closed and ordered."
);

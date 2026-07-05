// Regenerate src/i18n/en-base.ts from the vanilla assets/js/i18n.js EN block.
// Usage:  node scripts/extract-en.cjs      (run from the web/ directory)
// Uses a string-aware brace scanner so `{n}` placeholders in values don't break it.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..'); // repo root (web/ is one level down)
const src = fs.readFileSync(path.join(ROOT, 'assets/js/i18n.js'), 'utf8');

const start = src.indexOf('const EN=');
if (start < 0) { console.error('EN not found in i18n.js'); process.exit(1); }
const braceStart = src.indexOf('{', start);

let depth = 0, inStr = false, q = '', end = -1;
for (let i = braceStart; i < src.length; i++) {
  const c = src[i], p = src[i - 1];
  if (inStr) { if (c === q && p !== '\\') inStr = false; continue; }
  if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; continue; }
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
}
if (end < 0) { console.error('unterminated EN object'); process.exit(1); }

// eslint-disable-next-line no-eval
const EN = eval('(' + src.slice(braceStart, end + 1) + ')');
const keys = Object.keys(EN);
const body = keys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(EN[k])},`).join('\n');
const out = `/* AUTO-GENERATED from assets/js/i18n.js EN block (${keys.length} keys) — the full\n * canonical UI-string table. Do not edit by hand; re-run \`node scripts/extract-en.cjs\`.\n * Merged with the hand-written seed in en.ts. */\nexport const EN_BASE: Record<string, string> = {\n${body}\n};\n`;
fs.writeFileSync(path.join(__dirname, '..', 'src/i18n/en-base.ts'), out);
console.log(`wrote src/i18n/en-base.ts (${keys.length} keys)`);

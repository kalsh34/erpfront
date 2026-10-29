// Scan all t('key') usages in frontend/src and verify each key exists in both
// the `en` dict (lines 15..1489) and the `am` dict (lines 1490..end) of
// src/i18n/index.ts. Reports missing keys per language plus keys only found in
// source strings but not dictionaries at all.
const fs = require('fs');
const path = require('path');

const I18N = path.join(__dirname, 'src', 'i18n', 'index.ts');
const SRC = path.join(__dirname, 'src');

const dictLines = fs.readFileSync(I18N, 'utf8').split(/\r?\n/);
// find dict boundaries: `const en = {` at line 15 (1-indexed) and `const am:` at 1490
const enStart = dictLines.findIndex(l => /const en = \{/.test(l));
const amStart = dictLines.findIndex(l => /const am: Record/.test(l));

function collectKeys(startLine, endLine) {
  const keys = new Set();
  for (let i = startLine; i < endLine; i++) {
    const m = dictLines[i].match(/^\s{2,}([A-Za-z_$][\w$]*):/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

const enKeys = collectKeys(enStart + 1, amStart);
const amKeys = collectKeys(amStart + 1, dictLines.length);

// find end of `const en` block: line right before amStart? en block ends at the closing brace line. assume amStart-1
// scan src for t('...') / t("...")
function* walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) yield* walk(p);
    else if (/\.(tsx|ts)$/.test(f.name)) yield p;
  }
}

const used = new Map(); // key -> [files]
for (const file of walk(SRC)) {
  if (file === I18N) continue;
  const text = fs.readFileSync(file, 'utf8');
  const re = /\bt\(\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(text))) {
    const key = m[1];
    if (!used.has(key)) used.set(key, []);
    used.get(key).push(path.relative(SRC, file));
  }
}

const missingEn = [], missingAm = [], notInDict = [];
for (const [key, files] of [...used.entries()].sort()) {
  if (!enKeys.has(key) && !amKeys.has(key)) { notInDict.push([key, files]); continue; }
  if (!enKeys.has(key)) missingEn.push([key, files]);
  if (!amKeys.has(key)) missingAm.push([key, files]);
}

console.log('used keys:', used.size, '| en keys:', enKeys.size, '| am keys:', amKeys.size);
console.log('\n--- keys NOT in either dict (dynamic or literal) ---');
for (const [k, f] of notInDict) console.log(k, '→', f[0]);
console.log('\n--- missing in EN ---');
for (const [k, f] of missingEn) console.log(k, '→', f[0]);
console.log('\n--- missing in AM ---');
for (const [k, f] of missingAm) console.log(k, '→', f[0]);

// also: dict keys never used (informational, only report count)
const unusedCount = [...enKeys].filter(k => !used.has(k)).length;
console.log('\nen keys not referenced by t() (may be used elsewhere):', unusedCount);

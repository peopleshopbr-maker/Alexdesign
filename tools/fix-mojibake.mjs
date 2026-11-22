#!/usr/bin/env node
/**
 * fix-mojibake.mjs — Corretor de dupla codificação UTF-8 nos fontes.
 *
 * Detecta sequências mojibake ("Ã" + byte de continuação, ex.: "Ãº" -> "ú")
 * em .ts/.tsx/.css/.html e reescreve o arquivo em UTF-8 sem BOM.
 *
 * Uso:
 *   npm run fix-encoding           # corrige src/ e index.html
 *   node tools/fix-mojibake.mjs    # equivalente direto
 *
 * Segurança: só grava se houver correções e o resultado não contiver
 * U+FFFD (replacement character), evitando piorar arquivos já corrompidos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = ['src', 'index.html'].map((p) => path.join(rootDir, p));
const exts = new Set(['.ts', '.tsx', '.css', '.html']);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (exts.has(path.extname(entry.name))) files.push(p);
  }
}

for (const r of roots) {
  if (!fs.existsSync(r)) continue;
  if (fs.statSync(r).isDirectory()) walk(r);
  else files.push(r);
}

const fixed = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('\u00C3')) continue;

  let changed = 0;
  const out = text.replace(/\u00C3([\u0080-\u00FF])/g, (_full, second) => {
    const byte = second.codePointAt(0); // segundo byte do UTF-8 original
    const original = String.fromCharCode(0xc0 + (byte - 0x80));
    changed++;
    return original;
  });

  if (changed > 0 && !out.includes('\uFFFD')) {
    fs.writeFileSync(file, out, 'utf8');
    fixed.push(`${path.relative(rootDir, file)} (${changed})`);
  }
}

console.log(fixed.length ? `Corrigidos: ${fixed.join('; ')}` : 'Nenhum arquivo precisou de correção.');
process.exit(0);

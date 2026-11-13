/**
 * Checks that every line scene 14 quotes is still, exactly, that line of its file, and that the closing
 * card's intended-purpose sentence is verbatim in product.md. Node only (not imported by the film).
 *
 *   npx tsx src/components/close/verify-kiro.ts
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIRO_CARDS } from './kiro';
import { INTENDED_PURPOSE } from '../../config';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..');
const problems: string[] = [];

for (const card of KIRO_CARDS) {
  if (!card.path.startsWith('.kiro/')) problems.push(`${card.path}: not under .kiro/`);
  const file = join(repo, card.path);
  let lines: string[];
  try {
    lines = readFileSync(file, 'utf8').split('\n');
  } catch {
    problems.push(`${card.path}: cannot read`);
    continue;
  }
  for (const l of card.lines) {
    const actual = lines[l.n - 1];
    if (actual !== l.text) problems.push(`${card.path}:${l.n}\n  film: ${JSON.stringify(l.text)}\n  file: ${JSON.stringify(actual)}`);
  }
}

const product = readFileSync(join(repo, '.kiro/steering/product.md'), 'utf8');
if (!product.includes(`> ${INTENDED_PURPOSE}`)) problems.push('INTENDED_PURPOSE (src/config.ts) is not verbatim in .kiro/steering/product.md');

if (problems.length) {
  console.error(`verify-kiro: ${problems.length} problem(s)\n${problems.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`verify-kiro: ${KIRO_CARDS.length} cards, ${KIRO_CARDS.reduce((n, c) => n + c.lines.length, 0)} quoted lines and the intended-purpose sentence all match.`);
}

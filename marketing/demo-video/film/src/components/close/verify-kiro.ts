/**
 * Checks that every line scene 14 quotes is still, exactly, that line of its file (the .kiro/ cards and the kiro-review
 * workflow's lines), and that the closing card's intended-purpose sentence is verbatim in product.md. Node only (not
 * imported by the film).
 *
 *   npx tsx src/components/close/verify-kiro.ts
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIRO, PIPELINE, WORKFLOW_PATH, type SourceLine } from './kiro';
import { INTENDED_PURPOSE } from '../../config';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..');
const problems: string[] = [];
let count = 0;

const check = (path: string, lines: SourceLine[]) => {
  if (!path.startsWith('.kiro/') && path !== WORKFLOW_PATH) problems.push(`${path}: not under .kiro/ and not the kiro-review workflow`);
  let file: string[];
  try {
    file = readFileSync(join(repo, path), 'utf8').split('\n');
  } catch {
    problems.push(`${path}: cannot read`);
    return;
  }
  for (const l of lines) {
    count++;
    const actual = file[l.n - 1];
    if (actual !== l.text) problems.push(`${path}:${l.n}\n  film: ${JSON.stringify(l.text)}\n  file: ${JSON.stringify(actual)}`);
    // Shown pieces of a long line: each must be in the line, in order.
    let from = 0;
    for (const piece of l.show ?? []) {
      const at = (actual ?? '').indexOf(piece, from);
      if (at < 0) problems.push(`${path}:${l.n}: shown piece not found in order: ${JSON.stringify(piece)}`);
      else from = at + piece.length;
    }
  }
};

for (const card of Object.values(KIRO)) check(card.path, card.lines);
check(WORKFLOW_PATH, [PIPELINE.trigger, ...PIPELINE.steps, PIPELINE.commentHeader, PIPELINE.commentFooter]);

const product = readFileSync(join(repo, '.kiro/steering/product.md'), 'utf8');
if (!product.includes(`> ${INTENDED_PURPOSE}`)) problems.push('INTENDED_PURPOSE (src/config.ts) is not verbatim in .kiro/steering/product.md');

if (problems.length) {
  console.error(`verify-kiro: ${problems.length} problem(s)\n${problems.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`verify-kiro: ${Object.keys(KIRO).length} cards and the workflow, ${count} quoted lines and the intended-purpose sentence all match.`);
}

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// The repo root, four folders up from docs/research/improvement-plan/sim.
const REPO = fileURLToPath(new URL('../../../..', import.meta.url)).replace(/\/$/, '');
// @ts-ignore
import * as core from '../../../../packages/core/src/index.ts';
export { core };
export interface Item { id: string; src: string; text: string; words: string[]; codes: string[]; partner?: string }
export const items: Item[] = readFileSync(`${REPO}/packages/eval/fixtures/test.v1.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
export const lexFile = JSON.parse(readFileSync(`${REPO}/data/lexicon/en.v1.json`, 'utf8'));
export const bigFile = JSON.parse(readFileSync(`${REPO}/data/lexicon/en.bigram.v1.json`, 'utf8'));
export const pack = JSON.parse(readFileSync(`${REPO}/data/packs/core-en.json`, 'utf8'));
export const lex = core.Lexicon.fromJSON(lexFile);
export const lm = core.bigramModel(bigFile, lex);
export const uni = core.unigramModel(lex);
export const pct = (a: number, b: number) => ((100 * a) / b).toFixed(1) + '%';

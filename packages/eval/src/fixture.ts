/** Loading the frozen test set and data files (Node only: the harness runs under tsx). */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BigramFile, LexiconFile, LexiconFileV2 } from '@ninth/core';
import type { TestItem } from './types';

export const EVAL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_ROOT = resolve(EVAL_DIR, '..', '..');

export const PATHS = {
  fixture: join(EVAL_DIR, 'fixtures', 'test.v1.jsonl'),
  lock: join(EVAL_DIR, 'eval.lock'),
  lexicon: join(REPO_ROOT, 'data', 'lexicon', 'en.v1.json'),
  /** Compact twin of `lexicon` that the web app ships (ADR-data-003); loads to the same Lexicon. */
  lexiconV2: join(REPO_ROOT, 'data', 'lexicon', 'en.v2.json'),
  bigram: join(REPO_ROOT, 'data', 'lexicon', 'en.bigram.v1.json'),
  resultsJson: join(EVAL_DIR, 'RESULTS.json'),
  resultsMd: join(EVAL_DIR, 'RESULTS.md'),
};

export const sha256 = (buf: Buffer | string): string => createHash('sha256').update(buf).digest('hex');

export interface EvalLock {
  version: 1;
  fixture: { path: string; sha256: string; rows: number; bytes: number };
  lexicon: { path: string; sha256: string };
  bigram: { path: string; sha256: string };
}

export function readLock(path = PATHS.lock): EvalLock {
  return JSON.parse(readFileSync(path, 'utf8')) as EvalLock;
}

/** Parse JSONL test items. Throws on a malformed line. */
export function parseFixture(text: string): TestItem[] {
  const out: TestItem[] = [];
  for (const [i, line] of text.split('\n').entries()) {
    if (line.trim() === '') continue;
    const r = JSON.parse(line) as TestItem;
    if (!r.id || !Array.isArray(r.words) || !Array.isArray(r.codes) || r.words.length !== r.codes.length) {
      throw new Error(`fixture line ${i + 1}: bad item`);
    }
    out.push(r);
  }
  return out;
}

/**
 * Load the fixture and refuse to run if its SHA-256 differs from eval.lock (Req 1.2): the test
 * set is frozen, so a changed file means results are no longer comparable.
 */
export function loadFixture(path = PATHS.fixture, lock = readLock()): { items: TestItem[]; sha256: string } {
  const buf = readFileSync(path);
  const digest = sha256(buf);
  if (digest !== lock.fixture.sha256) {
    throw new Error(`fixture SHA-256 ${digest} does not match eval.lock ${lock.fixture.sha256}`);
  }
  const items = parseFixture(buf.toString('utf8'));
  if (items.length !== lock.fixture.rows) throw new Error(`fixture has ${items.length} rows, eval.lock says ${lock.fixture.rows}`);
  return { items, sha256: digest };
}

export function loadJson<T>(path: string): { data: T; sha256: string } {
  const buf = readFileSync(path);
  return { data: JSON.parse(buf.toString('utf8')) as T, sha256: sha256(buf) };
}

/** A v1 or v2 lexicon file (both load with Lexicon.fromJSON; the default is v1, which eval.lock pins). */
export const loadLexiconFile = (path = PATHS.lexicon) => loadJson<LexiconFile | LexiconFileV2>(path);

/** The v1 file a lexicon was derived from: itself for v1, `derived_from.sha256` for a compact v2 file. */
export function lexiconSourceSha(l: { data: LexiconFile | LexiconFileV2; sha256: string }): string {
  const from = (l.data as { derived_from?: { sha256?: unknown } }).derived_from?.sha256;
  return l.data.v === 2 && typeof from === 'string' ? from : l.sha256;
}
export const loadBigramFile = (path = PATHS.bigram) => loadJson<BigramFile>(path);

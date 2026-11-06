/** Frozen test set (spec eval-harness Req 1.1 - 1.4; properties P1-P3). */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { encodeWord, tokenize, validate } from '@ninth/core';
import { loadFixture, parseFixture, PATHS, readLock, sha256 } from '../src/fixture';

const lock = readLock();
const { items } = loadFixture();

describe('fixtures/test.v1.jsonl', () => {
  it('matches the SHA-256 and row count in eval.lock', () => {
    expect(sha256(readFileSync(PATHS.fixture))).toBe(lock.fixture.sha256);
    expect(items).toHaveLength(lock.fixture.rows);
  });

  it('refuses a modified fixture', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ninth-eval-'));
    const p = join(dir, 'test.jsonl');
    writeFileSync(p, readFileSync(PATHS.fixture, 'utf8').replace('I love you.', 'I love you!'));
    expect(() => loadFixture(p, lock)).toThrow(/does not match eval.lock/);
  });

  it('has AACText test items plus at most 300 Turk partner/reply pairs, ids unique and sorted', () => {
    const turk = items.filter((r) => r.src === 'turk');
    expect(turk.length).toBeLessThanOrEqual(300);
    expect(turk.every((r) => typeof r.partner === 'string' && r.partner.length > 0)).toBe(true);
    expect(items.filter((r) => r.src === 'aac').length).toBeGreaterThan(500);
    const ids = items.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
  });

  it('stores codes that are exactly the encoding of the gold words', () => {
    for (const r of items) {
      expect(r.codes).toEqual(r.words.map((w) => encodeWord(w)));
      expect(validate(r.words, r.codes)).toBe(true);
      expect(r.words.length).toBeGreaterThanOrEqual(1);
      expect(r.words.length).toBeLessThanOrEqual(20);
    }
  });

  it('agrees with @ninth/core tokenize() on every gold sentence', () => {
    const diff = items.filter((r) => tokenize(r.text).join(' ') !== r.words.join(' '));
    expect(diff.map((r) => `${r.id}: ${r.text}`)).toEqual([]);
  });

  it('parseFixture rejects a line whose words and codes disagree in length', () => {
    expect(() => parseFixture('{"id":"x","src":"aac","text":"a b","words":["a","b"],"codes":["2"]}\n')).toThrow();
  });
});

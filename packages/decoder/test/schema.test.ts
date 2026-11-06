import { describe, expect, it } from 'vitest';
import { DecodeRequestSchema, LIMITS, readBody } from '../src/schema.js';

// DS-1 (input limits). Plan §4.3: <= 20 codes, <= 16 digits each, partner <= 280 chars,
// <= 3 recent items, body <= 4 KB.

const base = () => ({
  v: 1,
  lang: 'en',
  mode: 'letter',
  codes: ['4', '6333', '92837'],
  lattice: [['i', 'g', 'h'], ['need'], ['water']],
  context: { partner: 'Can I get you anything?', recent: ['I am cold'] },
  k: 5,
});

describe('DecodeRequestSchema', () => {
  it('accepts the plan example (with corrected codes)', () => {
    const r = DecodeRequestSchema.parse(base());
    expect(r.codes).toEqual(['4', '6333', '92837']);
  });

  it('defaults mode to letter and k to 5', () => {
    const { mode: _m, k: _k, ...rest } = base();
    const r = DecodeRequestSchema.parse(rest);
    expect(r.mode).toBe('letter');
    expect(r.k).toBe(5);
  });

  it('accepts exactly 20 codes, rejects 21', () => {
    const ok = { ...base(), codes: Array(20).fill('2'), lattice: Array(20).fill([]) };
    expect(DecodeRequestSchema.safeParse(ok).success).toBe(true);
    const bad = { ...base(), codes: Array(21).fill('2'), lattice: Array(21).fill([]) };
    expect(DecodeRequestSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts a 16-digit code, rejects 17 digits', () => {
    const ok = { ...base(), codes: ['2'.repeat(16)], lattice: [[]] };
    expect(DecodeRequestSchema.safeParse(ok).success).toBe(true);
    const bad = { ...base(), codes: ['2'.repeat(17)], lattice: [[]] };
    expect(DecodeRequestSchema.safeParse(bad).success).toBe(false);
  });

  it.each(['', '0', '1', '12', '2a', ' 2', '２'])('rejects code %j', (c) => {
    expect(DecodeRequestSchema.safeParse({ ...base(), codes: [c], lattice: [[]] }).success).toBe(false);
  });

  it('partner: 280 chars ok, 281 rejected', () => {
    const ok = { ...base(), context: { partner: 'a'.repeat(280) } };
    expect(DecodeRequestSchema.safeParse(ok).success).toBe(true);
    const bad = { ...base(), context: { partner: 'a'.repeat(281) } };
    expect(DecodeRequestSchema.safeParse(bad).success).toBe(false);
  });

  it('recent: 3 items ok, 4 rejected', () => {
    const ok = { ...base(), context: { recent: ['a', 'b', 'c'] } };
    expect(DecodeRequestSchema.safeParse(ok).success).toBe(true);
    const bad = { ...base(), context: { recent: ['a', 'b', 'c', 'd'] } };
    expect(DecodeRequestSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a lattice whose length differs from codes', () => {
    expect(DecodeRequestSchema.safeParse({ ...base(), lattice: [['i']] }).success).toBe(false);
  });

  it('rejects more than 12 words in a slot', () => {
    const lattice = [Array(13).fill('g'), ['need'], ['water']];
    expect(DecodeRequestSchema.safeParse({ ...base(), lattice }).success).toBe(false);
  });

  it('rejects more than 10 beams', () => {
    const beams = Array(11).fill(['i', 'need', 'water']);
    expect(DecodeRequestSchema.safeParse({ ...base(), beams }).success).toBe(false);
  });

  it('rejects k outside 1..5', () => {
    expect(DecodeRequestSchema.safeParse({ ...base(), k: 0 }).success).toBe(false);
    expect(DecodeRequestSchema.safeParse({ ...base(), k: 6 }).success).toBe(false);
  });

  it('rejects unknown fields, versions and languages', () => {
    expect(DecodeRequestSchema.safeParse({ ...base(), extra: 1 }).success).toBe(false);
    expect(DecodeRequestSchema.safeParse({ ...base(), v: 2 }).success).toBe(false);
    expect(DecodeRequestSchema.safeParse({ ...base(), lang: 'de' }).success).toBe(false);
  });

  it('initials mode requires one digit per code', () => {
    const ok = { ...base(), mode: 'initials', codes: ['4', '6', '9'] };
    expect(DecodeRequestSchema.safeParse(ok).success).toBe(true);
    const bad = { ...base(), mode: 'initials' };
    expect(DecodeRequestSchema.safeParse(bad).success).toBe(false);
  });
});

describe('readBody (4 KB limit)', () => {
  it('accepts exactly 4096 bytes and rejects 4097 with 413', () => {
    const pad = (n: number) => {
      const s = JSON.stringify({ x: '' });
      return JSON.stringify({ x: 'a'.repeat(n - s.length) });
    };
    expect(pad(LIMITS.maxBodyBytes)).toHaveLength(4096);
    expect(readBody(pad(4096)).ok).toBe(true);
    const r = readBody(pad(4097));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(413);
  });

  it('counts bytes, not characters', () => {
    const s = JSON.stringify({ x: 'é'.repeat(2045) }); // 2 bytes each -> over 4 KB
    expect(s.length).toBeLessThan(4096);
    const r = readBody(s);
    expect(r.ok).toBe(false);
  });

  it('measures already-parsed objects too', () => {
    expect(readBody({ x: 'a'.repeat(5000) }).ok).toBe(false);
    expect(readBody({ x: 'a' }).ok).toBe(true);
  });

  it('returns 400 for invalid JSON without echoing it', () => {
    const r = readBody('{"secret partner text"');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(JSON.stringify(r.json)).not.toContain('secret');
    }
  });
});

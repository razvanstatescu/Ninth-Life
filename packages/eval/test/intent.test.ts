/** Reply types (ADR-008): the oracle reply type, B1i and B4's request. No test calls the API. */
import { describe, expect, it } from 'vitest';
import { bigramModel, decodeGhost, encodeWord, INTENT_POOL, Lexicon, rankByIntent, validate } from '@ninth/core';
import { parseArgs } from '../src/cli';
import { ghostIntentDecoder } from '../src/decoders';
import { loadBigramFile, loadFixture, loadLexiconFile, PATHS, readLock } from '../src/fixture';
import { oracleIntent, oracleItems } from '../src/intent';
import { parseLlmArgs } from '../src/llm/cli';
import { appRequest } from '../src/llm/configs';
import { runId } from '../src/llm/report';
import { runEval } from '../src/run';
import type { DecodeOutput } from '../src/types';

const item = (text: string, partner?: string) => ({ text, words: text.toLowerCase().replace(/[?.!,]/g, '').split(' '), partner });

describe('oracle reply type', () => {
  it('reads ask, disagree and agree off the gold sentence, only with a partner line', () => {
    expect(oracleIntent(item('Are you coming?', 'I am leaving.'))).toBe('ask');
    expect(oracleIntent(item('No I am not.', 'Are you cold?'))).toBe('disagree');
    expect(oracleIntent(item('Yes please.', 'Tea?'))).toBe('agree');
    expect(oracleIntent(item('Okay then.', 'Tea?'))).toBe('agree');
    expect(oracleIntent(item('I like tea.', 'Tea?'))).toBeUndefined();
    expect(oracleIntent(item('Yes please.'))).toBeUndefined();
    expect(oracleIntent(item('Yes please.', '  '))).toBeUndefined();
  });

  it('the frozen test set has items for it, all with a partner line', () => {
    const { items } = loadFixture(PATHS.fixture, readLock());
    const picked = oracleItems(items);
    expect(picked.length).toBeGreaterThan(50);
    expect(picked.every((it) => it.partner)).toBe(true);
  });
});

describe('B1i "B1+intent (oracle)"', () => {
  const lexFile = loadLexiconFile();
  const big = loadBigramFile();
  const lex = Lexicon.fromJSON(lexFile.data);
  const lm = bigramModel(big.data, lex);
  const d = ghostIntentDecoder(lex, big.data);

  it('without a reply type it is exactly B1', () => {
    const codes = ['66', '69', '929'];
    const out = d.decode({ codes, mode: 'letter', k: 5 }) as DecodeOutput;
    expect(out.candidates).toEqual(decodeGhost(codes, { lexicon: lex, lm, k: 5 }).map((c) => c.words));
  });

  it('with one, it re-ranks a pool of INTENT_POOL and keeps the top k, all valid', () => {
    const codes = ['on', 'my', 'way'].map((w) => encodeWord(w)!);
    const out = d.decode({ codes, mode: 'letter', k: 3, intent: 'agree' }) as DecodeOutput;
    const want = rankByIntent(decodeGhost(codes, { lexicon: lex, lm, k: INTENT_POOL }), 'agree').slice(0, 3).map((c) => c.words);
    expect(out.candidates).toEqual(want);
    expect(out.candidates[0]).toEqual(['on', 'my', 'way']);
    for (const c of out.candidates) expect(validate(c, codes)).toBe(true);
  });

  it('runEval with intent oracle hands each item its reply type', async () => {
    const { items, sha256 } = loadFixture(PATHS.fixture, readLock());
    const seen: (string | undefined)[] = [];
    const spy = { id: 'SPY', label: 'spy', deterministic: true, validated: true, decode: ({ intent }: { intent?: string }) => (seen.push(intent), { candidates: [] }) };
    const picked = oracleItems(items).slice(0, 10);
    await runEval({ items, select: () => picked, fixture: { path: 'x', sha256 }, lexicon: lexFile, bigram: big, only: ['SPY'], extra: [spy], intent: 'oracle' });
    expect(seen).toEqual(picked.map((it) => oracleIntent(it)));
    seen.length = 0;
    await runEval({ items, select: () => picked, fixture: { path: 'x', sha256 }, lexicon: lexFile, bigram: big, only: ['SPY'], extra: [spy] });
    expect(seen.every((x) => x === undefined)).toBe(true);
  });
});

describe('B4 request with a reply type (what the app sends)', () => {
  const lexFile = loadLexiconFile();
  const lex = Lexicon.fromJSON(lexFile.data);
  const lm = bigramModel(loadBigramFile().data, lex);
  const codes = ['66', '69', '929'];

  it('adds context.intent and sends the re-ranked top 5 as beams', () => {
    const plain = appRequest(codes, 'letter', 'Are you coming?', lex, lm)!;
    const agree = appRequest(codes, 'letter', 'Are you coming?', lex, lm, 'agree')!;
    expect((plain.context as Record<string, unknown>).intent).toBeUndefined();
    expect(agree.context).toEqual({ recent: [], partner: 'Are you coming?', intent: 'agree' });
    const beams = agree.beams as string[][];
    expect(beams).toEqual(rankByIntent(decodeGhost(codes, { lexicon: lex, lm, k: INTENT_POOL }), 'agree').slice(0, 5).map((c) => c.words));
    expect(beams[0]).toEqual(['on', 'my', 'way']);
    expect((plain.beams as string[][])[0]).toEqual(['no', 'my', 'way']);
  });
});

describe('CLI --intent oracle', () => {
  it('parses on both CLIs and refuses other values', () => {
    expect(parseArgs(['--intent', 'oracle']).intent).toBe('oracle');
    expect(() => parseArgs(['--intent', 'agree'])).toThrow(/oracle/);
    expect(parseLlmArgs(['--intent', 'oracle']).intent).toBe('oracle');
    expect(() => parseLlmArgs(['--intent', 'x'])).toThrow(/oracle/);
  });

  it('never writes an upper-bound run into packages/eval', () => {
    expect(() => parseArgs(['--intent', 'oracle', '--write'])).toThrow(/never writes/);
  });

  it('gets its own RESULTS.md section id', () => {
    expect(runId('m', 'letter', 'oracle')).toBe('m:letter:intent-oracle');
    expect(runId('m', 'letter')).toBe('m:letter');
  });
});

import { encodeSentence, tokenize } from '@ninth/core';
import type { DecodeDeps } from '../src/handler.js';
import { StaticFlags } from '../src/flags.js';
import { FakeLlmClient, type FakeReply, type LlmClient } from '../src/llm.js';
import type { DecodeMetrics } from '../src/log.js';
import { MemoryQuotaStore, type QuotaLimits, type QuotaStore } from '../src/quota.js';

/** Independent oracle: a second keypad encoder written from the keypad itself, not from core. */
const PAD: Record<string, string> = {};
for (const [d, letters] of Object.entries({ 2: 'abc', 3: 'def', 4: 'ghi', 5: 'jkl', 6: 'mno', 7: 'pqrs', 8: 'tuv', 9: 'wxyz' })) {
  for (const ch of letters) PAD[ch] = d;
}
export function oracleEncode(word: string): string | null {
  if (!/^[a-z']+$/.test(word)) return null;
  const out = [...word].filter((c) => c !== "'").map((c) => PAD[c]).join('');
  return out.length ? out : null;
}
export function oracleValid(words: string[], codes: string[], mode: 'letter' | 'initials'): boolean {
  if (words.length !== codes.length) return false;
  return words.every((w, i) => {
    const c = oracleEncode(w);
    if (!c) return false;
    return mode === 'letter' ? c === codes[i] : c[0] === codes[i];
  });
}

/** Build a request for a sentence, with that sentence's words as the lattice. */
export function requestFor(sentence: string, extra: Record<string, unknown> = {}) {
  const words = tokenize(sentence);
  return {
    v: 1,
    lang: 'en',
    mode: 'letter',
    codes: encodeSentence(sentence),
    lattice: words.map((w) => [w]),
    k: 5,
    ...extra,
  };
}

export interface TestDeps extends DecodeDeps {
  logs: DecodeMetrics[];
  fake?: FakeLlmClient;
  quotaStore: QuotaStore;
  flagStore: StaticFlags;
}

export function makeDeps(
  opts: {
    reply?: FakeReply | ((p: { system: string; user: string }) => FakeReply);
    llm?: LlmClient;
    limits?: Partial<QuotaLimits>;
    quota?: QuotaStore;
    enabled?: boolean;
    now?: () => number;
    timeoutMs?: number;
  } = {},
): TestDeps {
  const logs: DecodeMetrics[] = [];
  const fake = opts.llm ? undefined : new FakeLlmClient(opts.reply ?? '{"c":[]}');
  const quotaStore =
    opts.quota ??
    new MemoryQuotaStore({ ipPerMinute: 30, ipPerDay: 300, globalPerDay: 20_000, globalUsdMicrosPerDay: 8_000_000, ...opts.limits });
  const flagStore = new StaticFlags(opts.enabled ?? true);
  return {
    llm: opts.llm ?? fake!,
    fake,
    quota: quotaStore,
    quotaStore,
    flags: flagStore,
    flagStore,
    now: opts.now ?? (() => Date.UTC(2026, 10, 6, 12, 0, 0)),
    logs,
    options: { log: (m) => logs.push(m), timeoutMs: opts.timeoutMs ?? 1000 },
  };
}

export const META = { ipHash: 'test-ip-hash', origin: 'https://example.test' };

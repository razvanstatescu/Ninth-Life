// SIMULATION: initials mode ambiguity (bigram only) and hybrid typing.
import { core, items, lex, lm, bigFile, pct } from './common.ts';
const { encodeWord, BOS, DIGITS } = core;
const N = items.length; const key = (ws: string[]) => ws.join(' ');
const codeOf = new Map<string, string>(); const enc = (w: string) => { let c = codeOf.get(w); if (c === undefined) { c = encodeWord(w) ?? ''; codeOf.set(w, c); } return c; };
// successors of prev grouped by first key
const succByKey = new Map<string, Map<string, string[]>>();
function succ(prev: string, d: string): string[] {
  let m = succByKey.get(prev);
  if (!m) { m = new Map(); for (const w of Object.keys(bigFile.logp[prev] ?? {})) { if (!lex.has(w)) continue; const k = enc(w)[0]!; if (!m.has(k)) m.set(k, []); m.get(k)!.push(w); } succByKey.set(prev, m); }
  return m.get(d) ?? [];
}
type Slot = { kind: 'init'; d: string } | { kind: 'full'; code: string };
function decode(slots: Slot[], perKey: number, B: number, dynamic: boolean, K: number) {
  let beams: { w: string[]; s: number }[] = [{ w: [], s: 0 }];
  for (const sl of slots) {
    const next: { w: string[]; s: number }[] = [];
    for (const b of beams) {
      const prev = b.w.length ? b.w[b.w.length - 1]! : BOS;
      let cands: string[];
      if (sl.kind === 'full') cands = lex.lookup(sl.code).slice(0, 12);
      else { const base = lex.completions(sl.d, perKey); cands = dynamic ? [...new Set([...base, ...succ(prev, sl.d)])] : base; }
      for (const w of cands) next.push({ w: [...b.w, w], s: b.s + lm.logP(prev, w) });
    }
    next.sort((a, b) => b.s - a.s); beams = next.slice(0, B);
    if (!beams.length) return [];
  }
  const out: string[] = []; const seen = new Set<string>();
  for (const b of beams) { const k = key(b.w); if (!seen.has(k)) { seen.add(k); out.push(k); if (out.length >= K) break; } }
  return out;
}
function evalInit(name: string, mk: (it: any) => Slot[], perKey: number, B: number, dynamic: boolean, subset = items) {
  let t1 = 0, t5 = 0, t20 = 0, presses = 0, chars = 0, wordsInLat = 0, words = 0;
  for (const it of subset) {
    const slots = mk(it);
    const r = decode(slots, perKey, B, dynamic, 20).indexOf(key(it.words));
    if (r === 0) t1++; if (r >= 0 && r < 5) t5++; if (r >= 0) t20++;
    presses += slots.reduce((s, x) => s + (x.kind === 'init' ? 1 : x.code.length), 0) + slots.length - 1;
    chars += it.words.reduce((s: number, w: string) => s + w.length, 0) + it.words.length - 1;
  }
  console.log(`${name}: top1 ${pct(t1, subset.length)} top5 ${pct(t5, subset.length)} top20 ${pct(t20, subset.length)} | typing presses/char (no picks, no fixes) ${(presses / chars).toFixed(2)}`);
}
const allInit = (it: any): Slot[] => it.codes.map((c: string) => ({ kind: 'init', d: c[0] }));
console.log('--- all words as initials, bigram only');
evalInit('today: 12/key static, beam 32', allInit, 12, 32, false);
evalInit('50/key static, beam 256', allInit, 50, 256, false);
evalInit('12/key + bigram successors of prev, beam 256', allInit, 12, 256, true);
evalInit('200/key + bigram successors, beam 512', allInit, 200, 512, true);
const short = items.filter((it) => it.words.length <= 3);
console.log(`--- short sentences only (<=3 words, ${short.length} items)`);
evalInit('12/key + successors, beam 256', allInit, 12, 256, true, short);
console.log('--- hybrid: short words as initials, long words in full');
for (const L of [2, 3, 4]) {
  const hy = (it: any): Slot[] => it.codes.map((c: string, i: number) => (it.words[i].replace(/'/g, '').length <= L ? { kind: 'init', d: c[0] } : { kind: 'full', code: c }));
  evalInit(`words of <=${L} letters as initials`, hy, 12, 256, true);
}
// hybrid: the 100 most frequent words as initials
const topWords = new Set(DIGITS.flatMap((d: string) => lex.completions(d, 40)));
const top100 = new Set([...topWords].map((w) => [w, lex.zipf(w)!] as const).sort((a, b) => b[1] - a[1]).slice(0, 100).map((x) => x[0]));
const hyTop = (it: any): Slot[] => it.codes.map((c: string, i: number) => (top100.has(it.words[i]) ? { kind: 'init', d: c[0] } : { kind: 'full', code: c }));
evalInit('the 100 most frequent words as initials', hyTop, 12, 256, true);
const fullAll = (it: any): Slot[] => it.codes.map((c: string) => ({ kind: 'full', code: c }));
evalInit('reference: letter mode (all words full)', fullAll, 12, 256, true);

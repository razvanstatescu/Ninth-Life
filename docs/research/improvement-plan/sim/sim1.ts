// SIMULATION: word completion / next-word prediction press savings on fixtures/test.v1.jsonl.
import { core, items, lex, lm, uni, bigFile, pct } from './common.ts';
// @ts-ignore
import { scanSteps } from '../../../../packages/eval/src/scan-cost.ts';
const { encodeWord, beam, validate, BOS, DIGITS } = core;

const codeOf = new Map<string, string>();
const enc = (w: string) => { let c = codeOf.get(w); if (c === undefined) { c = encodeWord(w) ?? ''; codeOf.set(w, c); } return c; };
const succ = new Map<string, string[]>();
const successors = (prev: string) => { let s = succ.get(prev); if (!s) { s = Object.keys(bigFile.logp[prev] ?? {}); succ.set(prev, s); } return s; };
const cache = new Map<string, string[]>();
function offered(prefix: string, prev: string, k: number, ctx: boolean): string[] {
  const key = `${ctx}|${k}|${prev}|${prefix}`;
  const hit = cache.get(key); if (hit) return hit;
  let out: string[];
  if (!ctx) out = prefix ? lex.completions(prefix, k) : [];
  else {
    const pool = new Set<string>(prefix ? lex.completions(prefix, 300) : DIGITS.flatMap((d: string) => lex.completions(d, 60)));
    for (const w of successors(prev)) if (enc(w).startsWith(prefix) && lex.has(w)) pool.add(w);
    out = [...pool].map((w) => [w, lm.logP(prev, w)] as const).sort((a, b) => b[1] - a[1]).slice(0, k).map((x) => x[0]);
  }
  cache.set(key, out); return out;
}
interface Policy { real?: boolean; src?: string; name: string; k: number; minPrefix: number; predict: boolean; ctx: boolean; enabled: boolean; maxPrefix?: number }
function run(pol: Policy) {
  let keys = 0, chars = 0, scan = 0, accepted = 0, words = 0, t1 = 0, sel = 0, corr = 0, speakable = 0;
  for (const it of items.filter((x) => !pol.src || x.src === pol.src)) {
    const gold = it.words, n = gold.length;
    chars += gold.reduce((s, w) => s + w.length, 0) + (n - 1);
    const pins: (string | null)[] = gold.map(() => null);
    const targets: any[] = [];
    let presses = 0;
    gold.forEach((w, i) => {
      words++;
      const c = it.codes[i]!, last = i === n - 1;
      let prev = i === 0 ? BOS : gold[i - 1]!; // optimistic: earlier words assumed right
      if (pol.real && i > 0) {
        if (pins[i - 1]) prev = pins[i - 1]!;
        else {
          const lat0 = it.codes.slice(0, i).map((c2, j) => (pins[j] ? [pins[j]!] : lex.lookup(c2).slice(0, 12)));
          const b0 = lat0.every((x) => x.length) ? beam(lat0, lm, 32, BOS)[0] : undefined;
          prev = b0?.words[i - 1] ?? BOS;
        }
      }
      if (pol.enabled) {
        const start = pol.predict ? 0 : Math.max(1, pol.minPrefix);
        for (let p = start; p < c.length && p <= (pol.maxPrefix ?? 99); p++) {
          if (p > 0 && p < pol.minPrefix) continue;
          const saving = c.length - p - (last ? 1 : 0);
          if (saving <= 0) break;
          const list = offered(c.slice(0, p), prev, pol.k, pol.ctx);
          const j = list.indexOf(w);
          if (j >= 0) {
            for (const d of c.slice(0, p)) targets.push({ key: d });
            targets.push({ candidate: j });
            presses += p + 1; pins[i] = w; accepted++; return;
          }
        }
      }
      for (const d of c) targets.push({ key: d });
      presses += c.length;
      if (!last) { targets.push({ key: '0' }); presses++; }
    });
    // sentence decode with pins (as decodeWithPins)
    const lat = it.codes.map((c, i) => (pins[i] ? [pins[i]!] : lex.lookup(c).slice(0, 12)));
    const seen = new Set<string>(); const cands: string[][] = [];
    if (lat.every((s) => s.length)) for (const b of beam(lat, lm, 32, BOS)) {
      if (!validate(b.words, it.codes, 'letter')) continue;
      const kk = b.words.join(' '); if (seen.has(kk)) continue; seen.add(kk); cands.push(b.words); if (cands.length >= 5) break;
    }
    const rank = cands.findIndex((c) => c.join(' ') === gold.join(' '));
    let selections = 0;
    if (rank === 0) t1++;
    if (rank > 0) { selections = 1; sel++; targets.push({ candidate: rank }); }
    else if (rank < 0) {
      const top1 = cands[0] ?? it.codes.map((c, i) => pins[i] ?? lex.lookup(c)[0] ?? '');
      gold.forEach((w, i) => {
        if (top1[i] === w) return;
        const rs = lex.lookup(it.codes[i]!);
        const to = rs.indexOf(w), at = rs.indexOf(top1[i] ?? '');
        const m = to < 0 ? rs.length : at < 0 ? to + 1 : (to - at + rs.length) % rs.length;
        presses += m; corr += m; for (let j = 0; j < m; j++) targets.push({ key: '#' });
      });
    }
    keys += presses + selections;
    scan += scanSteps(targets);
  }
  const N = items.filter((x) => !pol.src || x.src === pol.src).length;
  return { name: pol.name, keysPerSent: (keys / N).toFixed(2), KSR: pct(chars - keys, chars), presPerChar: (keys / chars).toFixed(3), scanPerChar: (scan / chars).toFixed(2), accepted: pct(accepted, words), top1AfterTyping: pct(t1, N), chars: chars };
}
const pols: Policy[] = [
  { name: 'V0 today (no completion)', k: 0, minPrefix: 0, predict: false, ctx: false, enabled: false },
  { name: 'V1 freq completion top-1, >=2 keys', k: 1, minPrefix: 2, predict: false, ctx: false, enabled: true },
  { name: 'V1 freq completion top-3, >=2 keys', k: 3, minPrefix: 2, predict: false, ctx: false, enabled: true },
  { name: 'V1 freq completion top-5, >=1 key', k: 5, minPrefix: 1, predict: false, ctx: false, enabled: true },
  { name: 'V2 bigram completion top-1, >=1 key', k: 1, minPrefix: 1, predict: false, ctx: true, enabled: true },
  { name: 'V2 bigram completion top-3, >=1 key', k: 3, minPrefix: 1, predict: false, ctx: true, enabled: true },
  { name: 'V2 bigram completion top-5, >=1 key', k: 5, minPrefix: 1, predict: false, ctx: true, enabled: true },
  { name: 'V3 bigram prediction+completion top-1', k: 1, minPrefix: 1, predict: true, ctx: true, enabled: true },
  { name: 'V3 bigram prediction+completion top-3', k: 3, minPrefix: 1, predict: true, ctx: true, enabled: true },
  { name: 'V3 bigram prediction+completion top-5', k: 5, minPrefix: 1, predict: true, ctx: true, enabled: true },
  { name: 'V4 prediction only (0 keys) top-3', k: 3, minPrefix: 99, predict: true, ctx: true, enabled: true, maxPrefix: 0 },
];
const sel2 = process.argv[2];
if (sel2 === 'real') { for (const p of pols) { p.real = true; p.name += ' [decoded prev]'; } }
if (sel2 === 'aac' || sel2 === 'turk') for (const p of pols) { p.real = true; p.src = sel2; p.name += ' [decoded prev, ' + sel2 + ']'; }
const total = items.reduce((s, it) => s + it.words.length, 0);
console.log('items', items.length, 'words', total, 'mean words/sent', (total / items.length).toFixed(2));
for (const p of pols) console.log(JSON.stringify(run(p)));

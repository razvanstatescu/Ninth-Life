// SIMULATION: on-device personal cache (recency/frequency of the person's own spoken sentences).
// Proxy only: the 866 test items are treated as ONE person's history in file order (they are many people).
import { core, items, lex, lm, pct } from './common.ts';
const { decodeGhost, BOS } = core;
const key = (ws: string[]) => ws.join(' ');
function cacheModel(lambda: number) {
  const uni = new Map<string, number>(); const bi = new Map<string, Map<string, number>>(); let tot = 0;
  const model = {
    logP(prev: string, w: string) {
      const base = Math.pow(10, lm.logP(prev, w));
      const row = bi.get(prev); const nb = row ? [...row.values()].reduce((a, b) => a + b, 0) : 0;
      const pb = row && nb ? (row.get(w) ?? 0) / nb : 0;
      const pu = tot ? (uni.get(w) ?? 0) / tot : 0;
      const pc = 0.7 * pb + 0.3 * pu;
      return Math.log10((1 - lambda) * base + lambda * pc);
    },
    add(ws: string[]) { let p = BOS; for (const w of ws) { uni.set(w, (uni.get(w) ?? 0) + 1); tot++; if (!bi.has(p)) bi.set(p, new Map()); bi.get(p)!.set(w, (bi.get(p)!.get(w) ?? 0) + 1); p = w; } },
  };
  return model;
}
for (const lambda of [0, 0.05, 0.1, 0.2]) {
  const m = cacheModel(lambda); let t1 = 0, t5 = 0;
  for (const it of items) {
    const r = decodeGhost(it.codes, { lexicon: lex, lm: lambda ? m : lm, k: 5 }).map((c: any) => key(c.words));
    const i = r.indexOf(key(it.words)); if (i === 0) t1++; if (i >= 0) t5++;
    m.add(it.words);
  }
  console.log(`cache lambda ${lambda}: top1 ${pct(t1, items.length)} top5 ${pct(t5, items.length)}`);
}
// repeats: how many test sentences repeat an earlier test sentence exactly
const seen = new Set<string>(); let rep = 0; for (const it of items) { const k = key(it.words); if (seen.has(k)) rep++; seen.add(k); }
console.log('exact repeats of an earlier item (crowd, not one person):', rep, pct(rep, items.length));
// "say it again" replay: every sentence said once before (history = whole set), measure top1 with cache lambda 0.1
{ const m = cacheModel(0.1); for (const it of items) m.add(it.words); let t1 = 0; for (const it of items) { const r = decodeGhost(it.codes, { lexicon: lex, lm: m, k: 5 }); if (r[0] && key(r[0].words) === key(it.words)) t1++; } console.log('replay (each sentence said once before, lambda 0.1): top1', pct(t1, items.length)); }

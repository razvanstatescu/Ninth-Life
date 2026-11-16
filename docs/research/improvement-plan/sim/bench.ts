import { core, lex, lm, bigFile } from './common.ts';
lex.prepare();
const prevs = ['<s>', 'i', 'the', 'you', 'want', 'to', 'can', 'my'];
const pre = ['4', '46', '466', '6', '63', '8', '84', '843', '2', '22'];
const t = performance.now(); let n = 0;
for (let r = 0; r < 20; r++) for (const p of prevs) for (const x of pre) {
  const pool = new Set<string>(lex.completions(x + (r % 2 ? '' : ''), 300));
  for (const w of Object.keys(bigFile.logp[p] ?? {})) if ((core.encodeWord(w) ?? '').startsWith(x)) pool.add(w);
  [...pool].map((w) => [w, lm.logP(p, w)] as const).sort((a, b) => b[1] - a[1]).slice(0, 3); n++;
}
console.log('ms per context-ranked completion (pool 300 + successors, warm prefix cache):', ((performance.now() - t) / n).toFixed(3));

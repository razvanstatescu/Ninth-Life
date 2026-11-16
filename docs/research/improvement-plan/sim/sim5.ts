import { core, items, lex, lm, pct } from './common.ts';
const { beam, BOS } = core; const key = (ws: string[]) => ws.join(' ');
const DIG = '23456789';
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
// only offer key fixes for a slot whose code has NO word (dead code); edits: substitution, deletion (extra key), insertion (missed key)
function neighbours(c: string): string[] {
  const out = new Set<string>();
  for (let i = 0; i < c.length; i++) { for (const d of DIG) if (d !== c[i]) out.add(c.slice(0, i) + d + c.slice(i + 1)); if (c.length > 1) out.add(c.slice(0, i) + c.slice(i + 1)); }
  for (let i = 0; i <= c.length; i++) for (const d of DIG) out.add(c.slice(0, i) + d + c.slice(i));
  return [...out];
}
function fixDecode(codes: string[]) {
  const lat = codes.map((c) => { const ex = lex.lookup(c).slice(0, 12); if (ex.length) return ex; const s: string[] = []; for (const c2 of neighbours(c)) for (const w of lex.lookup(c2).slice(0, 3)) if (!s.includes(w)) s.push(w); return s.sort((a, b) => (lex.zipf(b) ?? 0) - (lex.zipf(a) ?? 0)).slice(0, 24); });
  return lat.every((x) => x.length) ? beam(lat, lm, 64, BOS).slice(0, 5).map((b: any) => key(b.words)) : [];
}
for (const kind of ['sub', 'extra', 'missed']) {
  let dead = 0, t1 = 0, t5 = 0;
  for (const it of items) {
    const i = Math.floor(rnd() * it.codes.length); const c = it.codes[i]!; const j = Math.floor(rnd() * c.length);
    let c2: string;
    if (kind === 'sub') { let d = c[j]!; while (d === c[j]) d = DIG[Math.floor(rnd() * 8)]!; c2 = c.slice(0, j) + d + c.slice(j + 1); }
    else if (kind === 'extra') c2 = c.slice(0, j + 1) + c[j] + c.slice(j + 1); // double press (tremor)
    else { if (c.length < 2) continue; c2 = c.slice(0, j) + c.slice(j + 1); }
    if (lex.lookup(c2).length) continue; // only dead codes
    dead++;
    const codes = [...it.codes]; codes[i] = c2;
    const r = fixDecode(codes).indexOf(key(it.words)); if (r === 0) t1++; if (r >= 0) t5++;
  }
  console.log(`${kind}: dead-code cases ${dead}; key-fix suggestions put gold at top1 ${pct(t1, dead)} top5 ${pct(t5, dead)}`);
}
// mid-sentence punctuation / multi-sentence lines in the gold text
const mid = items.filter((it) => /[,;:.!?]\s*\S/.test(it.text.trim().replace(/[.!?]+$/, ''))).length;
console.log('items with punctuation inside the line:', mid, pct(mid, items.length));

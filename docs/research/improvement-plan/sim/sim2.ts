// SIMULATIONS: phrases, partner boost, unreachable, capitals, wrong key.
import { core, items, lex, lm, bigFile, pack, pct } from './common.ts';
const { encodeWord, beam, validate, BOS, decodeGhost, tokenize, formatSentence } = core;
const N = items.length;
const key = (ws: string[]) => ws.join(' ');
// (a) pack phrases
const phr = (pack.phrases as string[]).map((p) => tokenize(p));
const phrSet = new Set(phr.map(key));
const exact = items.filter((it) => phrSet.has(key(it.words)));
console.log('pack phrases', phr.length, 'test sentences equal to a pack phrase:', exact.length, pct(exact.length, N), 'aac', exact.filter((x) => x.src === 'aac').length, 'turk', exact.filter((x) => x.src === 'turk').length);
// phrase completion: after each committed word, top-3 pack phrases whose codes start with typed codes (and longer)
const phrCodes = phr.map((p) => p.map((w) => encodeWord(w)!));
let saved = 0, chars = 0, hits = 0;
for (const it of items) {
  chars += it.words.reduce((s, w) => s + w.length, 0) + it.words.length - 1;
  const full = it.codes.reduce((s, c) => s + c.length, 0) + it.codes.length - 1;
  let best = 0;
  for (let m = 1; m < it.codes.length; m++) {
    const typed = it.codes.slice(0, m);
    const match = phr.filter((p, j) => p.length > m && typed.every((c, i) => phrCodes[j]![i] === c)).slice(0, 3);
    if (match.some((p) => key(p) === key(it.words))) {
      const cost = it.codes.slice(0, m).reduce((s, c) => s + c.length, 0) + (m - 1) + 1 + 1; // keys, spaces, space before?, pick
      best = Math.max(best, full - cost); break;
    }
  }
  if (best > 0) { hits++; saved += best; }
}
console.log('phrase completion from pack (top-3 after >=1 full word):', hits, 'items', pct(hits, N), 'presses saved', saved, 'of', chars, pct(saved, chars));
// (b) partner-line boost on turk items
function boosted(partner: string, bonus: number) {
  const ws = new Set(tokenize(partner));
  return { logP: (p: string, w: string) => lm.logP(p, w) + (ws.has(w) ? bonus : 0) };
}
const turk = items.filter((x) => x.partner);
const overlap = turk.filter((it) => { const ws = new Set(tokenize(it.partner!)); return it.words.some((w) => ws.has(w) && w.length > 3); }).length;
console.log('turk items', turk.length, 'reply shares a 4+ letter word with partner line:', overlap, pct(overlap, turk.length));
for (const b of [0, 0.5, 1, 2]) {
  let t1 = 0, t5 = 0, t1a = 0;
  for (const it of turk) {
    const r = decodeGhost(it.codes, { lexicon: lex, lm: boosted(it.partner!, b), k: 5 }).map((c: any) => key(c.words));
    const i = r.indexOf(key(it.words)); if (i === 0) t1++; if (i >= 0) t5++;
  }
  console.log(`partner boost +${b} log10: turk top1 ${pct(t1, turk.length)} top5 ${pct(t5, turk.length)}`);
}
// does passing context (partner last word as prev) change anything? (decodeGhost uses last token as prev)
{ let t1 = 0; for (const it of turk) { const r = decodeGhost(it.codes, { lexicon: lex, lm, k: 5, context: [it.partner!] }); if (r[0] && key(r[0].words) === key(it.words)) t1++; } console.log('decodeGhost with context=[partner] (prev = partner last word) top1', pct(t1, turk.length)); }
// (c) unreachable words
const unk: string[] = [];
for (const it of items) for (const w of it.words) if (!lex.lookup(encodeWord(w)!).includes(w)) unk.push(`${w} (${it.id})`);
console.log('OOV words', unk.length, unk.join(', '));
// (d) capitals: gold text words capitalised mid-sentence that formatSentence would not reproduce
let capItems = 0; const capWords = new Map<string, number>();
for (const it of items) {
  const raw = it.text.split(/[^\p{L}\p{N}'’]+/u).filter(Boolean);
  if (raw.length !== it.words.length) continue;
  if (it.text === it.text.toUpperCase() || it.text === it.text.toLowerCase()) continue; // all caps / all lower lines
  let any = false;
  raw.forEach((w, i) => { if (i > 0 && /^\p{Lu}/u.test(w) && it.words[i] !== 'i' && !/^i'/.test(it.words[i]!)) { any = true; capWords.set(w, (capWords.get(w) ?? 0) + 1); } });
  if (any) capItems++;
}
console.log('items with a mid-sentence capital (not I):', capItems, pct(capItems, N), [...capWords].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([w, n]) => `${w}:${n}`).join(' '));
// (e) wrong key: substitute one key in one word (seeded)
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
let dead = 0, silentWrong = 0, sameReading = 0, fuzzyTop5 = 0, fuzzyTop1 = 0, total = 0;
const DIG = '23456789';
function fuzzyDecode(codes: string[], penalty: number) {
  // each slot: words of the exact code, plus words of codes at Hamming distance 1 (same length) with a penalty
  const lat: string[][] = []; const pen = new Map<string, number>();
  for (const c of codes) {
    const slot = lex.lookup(c).slice(0, 12);
    for (let i = 0; i < c.length; i++) for (const d of DIG) if (d !== c[i]) {
      const c2 = c.slice(0, i) + d + c.slice(i + 1);
      for (const w of lex.lookup(c2).slice(0, 3)) { if (!slot.includes(w)) { slot.push(w); pen.set(w, penalty); } }
    }
    lat.push(slot);
  }
  const m = { logP: (p: string, w: string) => lm.logP(p, w) + (pen.get(w) ?? 0) };
  return beam(lat, m, 64, BOS).slice(0, 5).map((b: any) => key(b.words));
}
for (const it of items) {
  total++;
  const i = Math.floor(rnd() * it.codes.length);
  const c = it.codes[i]!; const j = Math.floor(rnd() * c.length);
  let d = c[j]!; while (d === c[j]) d = DIG[Math.floor(rnd() * 8)]!;
  const codes = [...it.codes]; codes[i] = c.slice(0, j) + d + c.slice(j + 1);
  if (lex.lookup(codes[i]!).length === 0) dead++;
  else silentWrong++;
  const f = fuzzyDecode(codes, -2);
  const r = f.indexOf(key(it.words)); if (r === 0) fuzzyTop1++; if (r >= 0) fuzzyTop5++;
}
console.log(`wrong key (1 substitution in 1 word, ${total} items): dead code (no word, visible) ${pct(dead, total)}; still has words (wrong word offered, gold impossible) ${pct(silentWrong, total)}; fuzzy 1-edit decode (penalty -2 log10) gold top1 ${pct(fuzzyTop1, total)} top5 ${pct(fuzzyTop5, total)}`);
// fuzzy cost on clean input: does the fuzzy decoder hurt correct typing?
{ let t1 = 0, t5 = 0; for (const it of items) { const f = fuzzyDecode(it.codes, -2); const r = f.indexOf(key(it.words)); if (r === 0) t1++; if (r >= 0) t5++; } console.log('fuzzy decoder on clean input top1', pct(t1, N), 'top5', pct(t5, N)); }
// sentence length distribution
const lens = items.map((x) => x.words.length); console.log('words/sentence max', Math.max(...lens), '>=15:', lens.filter((l) => l >= 15).length, '1-word:', lens.filter((l) => l === 1).length);

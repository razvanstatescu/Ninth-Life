/**
 * Writes the caption file for the upload (out/ninth-life-hello-again.srt): the narrator's lines, the app's
 * spoken lines (named "App voice:"), and the sounds a viewer cannot hear, placed only where nobody speaks.
 * Times come from src/timeline.ts, src/data/narration.json and src/data/voice.json, so they follow the cut.
 * Lines are at most 42 characters, at most two lines per cue (WCAG 1.2.2; 13, section 3.5).
 *
 *   npx tsx scripts/make-srt.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FPS, NARRATION_AT, VOICE_AT, ACT2_START, at, sec, TOTAL, type NarrationId, type VoiceId } from '../src/timeline';

type Word = { text: string; start: number; end: number };
type Line = { text: string; duration: number; words?: Word[] };
const here = dirname(fileURLToPath(import.meta.url));
const read = (f: string) => JSON.parse(readFileSync(join(here, '..', 'src', 'data', f), 'utf8')) as Record<string, Line>;
const voice = read('voice.json');
const narr = read('narration.json');

const t = (frames: number) => {
  const ms = Math.round((frames / FPS) * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor((ms % 3600000) / 60000))}:${p(Math.floor((ms % 60000) / 1000))},${p(ms % 1000, 3)}`;
};

type Cue = { from: number; to: number; text: string; kind: 'speech' | 'sound' };
const MAX = 42;

/** Break a text into at most two lines of MAX characters: at a sentence end, then a comma, then a space. */
const twoLines = (text: string): string[] | null => {
  if (text.length <= MAX) return [text];
  const candidates: number[] = [];
  for (const re of [/[.?!] /g, /, /g, / /g]) {
    let m: RegExpExecArray | null;
    const found: number[] = [];
    while ((m = re.exec(text))) found.push(m.index + m[0].length - 1);
    const ok = found.filter((i) => i <= MAX && text.length - i - 1 <= MAX);
    if (ok.length) {
      candidates.push(ok.sort((a, b) => Math.abs(a - text.length / 2) - Math.abs(b - text.length / 2))[0]!);
      break;
    }
  }
  if (!candidates.length) return null;
  const i = candidates[0]!;
  return [text.slice(0, i).trim(), text.slice(i + 1).trim()];
};

const speech: Cue[] = [];
let lastSpeaker: 'narrator' | 'app' | null = null;
const events = [
  ...(Object.keys(NARRATION_AT) as NarrationId[]).filter((id) => narr[id]).map((id) => ({ id, who: 'narrator' as const, from: NARRATION_AT[id], line: narr[id]! })),
  ...(Object.keys(VOICE_AT) as VoiceId[]).filter((id) => voice[id]).map((id) => ({ id, who: 'app' as const, from: VOICE_AT[id], line: voice[id]! })),
].sort((a, b) => a.from - b.from);

for (const e of events) {
  const label = e.who === 'app' ? 'App voice: ' : lastSpeaker === 'narrator' || e.from > ACT2_START && lastSpeaker === null ? '' : 'Narrator: ';
  lastSpeaker = e.who;
  const text = label + e.line.text.replace(/\s+/g, ' ').trim();
  const end = e.from + sec(e.line.duration) + sec(0.25);
  const lines = twoLines(text);
  if (lines && lines.length <= 2) {
    speech.push({ from: e.from, to: end, text: lines.join('\n'), kind: 'speech' });
    continue;
  }
  // Too long for one cue: split at the sentence nearest the middle, timed from the words.
  const words = e.line.words ?? [];
  const cutAt = words.findIndex((w, i) => i > 0 && /[.?!,]$/.test(words[i - 1]!.text) && i >= words.length / 3);
  const k = cutAt > 0 ? cutAt : Math.ceil(words.length / 2);
  const a = words.slice(0, k).map((w) => w.text).join(' ');
  const b = words.slice(k).map((w) => w.text).join(' ');
  const mid = e.from + sec(words[k]?.start ?? e.line.duration / 2);
  speech.push({ from: e.from, to: mid, text: (twoLines(label + a) ?? [label + a]).join('\n'), kind: 'speech' });
  speech.push({ from: mid, to: end, text: (twoLines(b) ?? [b]).join('\n'), kind: 'speech' });
}

// Sounds, kept only in the gaps between speech (at least 0.8 s left).
const sounds: Cue[] = [
  { from: 0, to: sec(3), text: '[An old television switches on. Static.]', kind: 'sound' },
  { from: sec(7.6), to: sec(10), text: '[Soft key beeps]', kind: 'sound' },
  { from: sec(11.6), to: sec(13.3), text: '[Two falling beeps. The phone goes dark.]', kind: 'sound' },
  { from: sec(18), to: sec(19.7), text: '[The television switches off. Silence.]', kind: 'sound' },
  { from: ACT2_START, to: at(3), text: '[A low hit. Key tones, rising]', kind: 'sound' },
  { from: at(3), to: at(5), text: '[A melody of key tones]', kind: 'sound' },
  { from: at(5), to: at(5) + sec(0.3), text: '[Music stops]', kind: 'sound' },
  { from: at(6), to: at(6, 3), text: '[Music, full]', kind: 'sound' },
  { from: at(17, 4), to: at(18, 2), text: '[A rising swell. The beat returns]', kind: 'sound' },
  { from: at(35), to: at(37), text: '[The music lifts]', kind: 'sound' },
  { from: at(40), to: at(41), text: '[Five soft key tones]', kind: 'sound' },
  { from: at(43), to: TOTAL, text: '[Music fades out]', kind: 'sound' },
];
const gaps = (c: Cue) => {
  let pieces: [number, number][] = [[c.from, c.to]];
  for (const s of speech) pieces = pieces.flatMap(([a, b]) => (s.to <= a || s.from >= b ? [[a, b]] : ([[a, s.from], [s.to, b]] as [number, number][]).filter(([x, y]) => y > x)));
  return pieces.filter(([a, b]) => b - a >= sec(0.8)).map(([a, b]) => ({ ...c, from: a, to: b }));
};

const cues = [...speech, ...sounds.flatMap(gaps)].sort((a, b) => a.from - b.from);
const out = join(here, '..', 'out', 'ninth-life-hello-again.srt');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, cues.map((c, i) => `${i + 1}\n${t(c.from)} --> ${t(c.to)}\n${c.text}\n`).join('\n'));
console.log(`make-srt: ${cues.length} cues (${speech.length} spoken) -> ${out}`);

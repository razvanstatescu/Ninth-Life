/**
 * Checks where the narrator's lines sit (07-revision-v2.md, section 3), from the measured files:
 * no overlaps (at least 0.25 s apart), never in a quiet zone, never within a beat of the app's voice,
 * Act 1 lines over by 27.0 s. Prints the table the lead uses to place lines.
 *
 *   npx tsx scripts/check-narration.ts
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACT2_START, BAR, BEAT, FPS, NARRATION_AT, QUIET_ZONES, SCENES, SCENE_IDS, VOICE_AT, sec, type NarrationId } from '../src/timeline';

const here = dirname(fileURLToPath(import.meta.url));
const narr = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'narration.json'), 'utf8')) as Record<string, { duration: number; text: string }>;
const voice = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'voice.json'), 'utf8')) as Record<string, { duration: number }>;

const s = (f: number) => (f / FPS).toFixed(2);
const pos = (f: number) => {
  if (f < ACT2_START) return `act1 ${s(f)}s`;
  const r = f - ACT2_START;
  const bar = Math.floor(r / BAR) + 1;
  const beat = (r % BAR) / BEAT + 1;
  return `bar ${bar} beat ${beat.toFixed(2)}`;
};
const sceneOf = (f: number) => SCENE_IDS.find((id) => f >= SCENES[id].from && f < SCENES[id].to) ?? '-';

const problems: string[] = [];
const rows = (Object.keys(NARRATION_AT) as NarrationId[]).map((id) => {
  const from = NARRATION_AT[id];
  const d = narr[id]?.duration;
  const to = d ? from + sec(d) : NaN;
  return { id, from, to, measured: !!d };
});

for (const r of rows) {
  if (!r.measured) {
    problems.push(`${r.id}: not measured yet (no entry in narration.json)`);
    continue;
  }
  if (r.from < ACT2_START && r.to > sec(27.0)) problems.push(`${r.id}: Act 1 line ends at ${s(r.to)}s, after 27.0s`);
  for (const z of QUIET_ZONES) if (r.from < z.to && r.to > z.from) problems.push(`${r.id}: in the quiet zone "${z.why}" (${s(z.from)}-${s(z.to)}s)`);
  for (const [vid, at] of Object.entries(VOICE_AT)) {
    const vEnd = at + sec(voice[vid]?.duration ?? 1.5);
    if (r.from < vEnd + BEAT && r.to > at - BEAT) problems.push(`${r.id}: within a beat of the app's "${vid}"`);
  }
  // Act 1's shots run across its scene lines (components/act1/shots.tsx), so only Act 2 is checked here.
  if (r.from >= ACT2_START && sceneOf(r.from) !== sceneOf(r.to - 1)) problems.push(`${r.id}: crosses from ${sceneOf(r.from)} into ${sceneOf(r.to - 1)} (allowed only on purpose)`);
}
const measured = rows.filter((r) => r.measured).sort((a, b) => a.from - b.from);
for (let i = 1; i < measured.length; i++) {
  const gap = measured[i]!.from - measured[i - 1]!.to;
  if (gap < sec(0.25)) problems.push(`${measured[i - 1]!.id} -> ${measured[i]!.id}: gap ${s(gap)}s (min 0.25s)`);
}

console.log('id                      start   end     len    where                 scene');
for (const r of rows) {
  const len = r.measured ? s(r.to - r.from) : '  ?  ';
  console.log(`${r.id.padEnd(22)}  ${s(r.from).padStart(6)}  ${r.measured ? s(r.to).padStart(6) : '   ?  '}  ${len.padStart(5)}  ${pos(r.from).padEnd(20)}  ${sceneOf(r.from)}`);
}
const words = Object.values(narr).reduce((n, l) => n + (l.text?.split(/\s+/).filter(Boolean).length ?? 0), 0);
console.log(`\n${Object.keys(narr).length} lines measured, ${words} words.`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):\n- ` + problems.join('\n- '));
  process.exitCode = 1;
} else console.log('\ncheck-narration: OK');

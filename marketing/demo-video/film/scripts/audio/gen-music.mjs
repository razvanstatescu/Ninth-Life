// Generate one take of the Act 2 music from prompts/music.json (ElevenLabs /v1/music, composition plan).
// From film/: node --env-file=../../.env scripts/audio/gen-music.mjs t1
// Writes _takes/audio/music/act2-<take>.{pcm|mp3}, a .wav copy and a .json sidecar (request + headers).
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { postBinary, guard, spent } from './lib/eleven.mjs';

const here = new URL('.', import.meta.url).pathname;
const film = new URL('../../', import.meta.url).pathname;
const cfg = JSON.parse(readFileSync(here + 'prompts/music.json', 'utf8'));
const takeId = process.argv[2] || 't1';
const take = cfg.takes.find((t) => t.take === takeId);
if (!take) throw new Error(`unknown take ${takeId}`);

const core = ['electronic', '120 BPM', 'A minor', 'instrumental', 'warm analog synths', 'clean mix'];
// plan v1: the sections as written, context_adherence high. plan v2: per-section overrides (text, styles,
// context_adherence) from cfg.plan_v2_overrides, same durations.
const plan = take.plan || 'v1';
const chunks = cfg.sections.map((s0, i) => {
  const o = plan === 'v2' ? cfg.plan_v2_overrides[i] : {};
  if (plan === 'v2' && o.name !== s0.name) throw new Error(`override ${i} is ${o.name}, expected ${s0.name}`);
  const s = { ...s0, ...o };
  return {
    text: s.text,
    duration_ms: s0.duration_ms,
    positive_styles: i === 0 ? [...cfg.global_positive_styles, ...s.positive_styles] : [...core, ...s.positive_styles],
    negative_styles: [...cfg.global_negative_styles, ...s.negative_styles],
    context_adherence: s.context_adherence || 'high',
  };
});
const total = chunks.reduce((a, c) => a + c.duration_ms, 0);
if (total !== cfg.duration_ms) throw new Error(`sections add to ${total}, expected ${cfg.duration_ms}`);

const body = { model_id: cfg.model_id, composition_plan: { chunks }, seed: take.seed };
const outDir = film + '_takes/audio/music/';
mkdirSync(outDir, { recursive: true });

const before = await guard(1800, `music ${takeId}`);
let fmt = cfg.output_format;
let res;
const t0 = Date.now();
try {
  res = await postBinary('/v1/music', body, { output_format: fmt }, `${outDir}act2-${takeId}.${fmt.startsWith('pcm') ? 'pcm' : 'mp3'}`);
} catch (e) {
  if (e.status && e.status < 500 && /format|tier|output/i.test(e.body || '')) {
    console.error(`output_format ${fmt} refused, falling back: ${String(e.body).slice(0, 300)}`);
    fmt = cfg.fallback_output_format;
    res = await postBinary('/v1/music', body, { output_format: fmt }, `${outDir}act2-${takeId}.mp3`);
  } else {
    throw e;
  }
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);
const raw = `${outDir}act2-${takeId}.${fmt.startsWith('pcm') ? 'pcm' : 'mp3'}`;
const wav = `${outDir}act2-${takeId}.wav`;
let channels = null;
if (fmt.startsWith('pcm')) {
  // Raw 16-bit little-endian PCM. Infer the channel count from the byte length and the planned length.
  const bytes = statSync(raw).size;
  const sr = Number(fmt.split('_')[1]);
  const monoSecs = bytes / (sr * 2);
  channels = Math.abs(monoSecs - total / 1000) < Math.abs(monoSecs / 2 - total / 1000) ? 1 : 2;
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', String(sr), '-ac', String(channels), '-i', raw, '-c:a', 'pcm_s16le', wav]);
} else {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw, '-ar', '48000', '-c:a', 'pcm_s24le', wav]);
}
const after = await spent();
const side = {
  take: takeId,
  model_id: cfg.model_id,
  output_format: fmt,
  channels,
  seed: take.seed,
  request: body,
  response_headers: res.headers,
  bytes: res.bytes,
  seconds_to_generate: Number(secs),
  credits_before: before.character_count,
  credits_after: after.character_count,
  credits_used: after.character_count - before.character_count,
  date: new Date().toISOString(),
};
writeFileSync(`${outDir}act2-${takeId}.json`, JSON.stringify(side, null, 2));
console.log(JSON.stringify({ take: takeId, fmt, channels, bytes: res.bytes, secs, credits_used: side.credits_used, spent_total: after.spent, headers: res.headers }, null, 2));

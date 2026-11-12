// Generate one take of the Act 2 music v2 from prompts/music-v2.json (ElevenLabs /v1/music, composition plan).
// From film/: node --env-file=../../.env scripts/audio/gen-music-v2.mjs v2a
// Writes _takes/music-v2/act2-v2-<take>.pcm, a .wav copy and a .json sidecar (request, safe headers, credits).
// Chunk styles: the first chunk carries first_chunk_styles, later chunks core_styles; every chunk carries the global
// negative styles, narrated chunks also the narrated_negative_styles (room for the narrator in 1-4 kHz).
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { postBinary, credits } from './lib/eleven.mjs';

const here = new URL('.', import.meta.url).pathname;
const film = new URL('../../', import.meta.url).pathname;
const cfg = JSON.parse(readFileSync(here + 'prompts/music-v2.json', 'utf8'));
const takeId = process.argv[2] || 'v2a';
const take = cfg.takes.find((t) => t.take === takeId);
if (!take) throw new Error(`unknown take ${takeId}`);

const chunks = cfg.chunks.map((c, i) => ({
  text: c.text,
  duration_ms: c.duration_ms,
  positive_styles: [...(i === 0 ? cfg.first_chunk_styles : cfg.core_styles), ...c.positive],
  negative_styles: [...cfg.global_negative_styles, ...(c.narrated ? cfg.narrated_negative_styles : []), ...c.negative],
  context_adherence: c.context_adherence || 'high',
}));
const total = chunks.reduce((a, c) => a + c.duration_ms, 0);
if (total !== cfg.duration_ms) throw new Error(`chunks add to ${total}, expected ${cfg.duration_ms}`);

const body = { model_id: cfg.model_id, composition_plan: { chunks }, seed: take.seed, store_for_inpainting: true };
const outDir = film + '_takes/music-v2/';
mkdirSync(outDir, { recursive: true });
const raw = `${outDir}act2-v2-${takeId}.pcm`;
if (existsSync(raw)) { console.log(`skip ${takeId}: ${raw} exists`); process.exit(0); }

const before = await credits();
const t0 = Date.now();
const res = await postBinary('/v1/music', body, { output_format: cfg.output_format }, raw);
const secs = ((Date.now() - t0) / 1000).toFixed(1);
// Raw 16-bit little-endian PCM: infer the channel count from the byte length and the planned length.
const sr = Number(cfg.output_format.split('_')[1]);
const bytes = statSync(raw).size;
const monoSecs = bytes / (sr * 2);
const channels = Math.abs(monoSecs - total / 1000) < Math.abs(monoSecs / 2 - total / 1000) ? 1 : 2;
const wav = `${outDir}act2-v2-${takeId}.wav`;
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', String(sr), '-ac', String(channels), '-i', raw, '-c:a', 'pcm_s16le', wav]);
await new Promise((r) => setTimeout(r, 21000)); // the subscription counter lags; the credits() cache lives 20 s
const after = await credits();
const side = { take: takeId, model_id: cfg.model_id, output_format: cfg.output_format, channels, seed: take.seed,
  request: body, response_headers: res.headers, bytes: res.bytes, seconds_to_generate: Number(secs),
  credits_before: before.character_count, credits_after: after.character_count,
  credits_used_by_counter: after.character_count - before.character_count, date: new Date().toISOString() };
writeFileSync(`${outDir}act2-v2-${takeId}.json`, JSON.stringify(side, null, 2));
console.log(JSON.stringify({ take: takeId, channels, bytes: res.bytes, secs, seconds: (bytes / (sr * 2 * channels)).toFixed(3),
  credits_used_by_counter: side.credits_used_by_counter, headers: res.headers }, null, 2));

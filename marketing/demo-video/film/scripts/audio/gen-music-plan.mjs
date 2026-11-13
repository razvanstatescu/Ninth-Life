// Compose music from a fully written composition plan (generation chunks and audio-reference chunks, i.e. inpainting).
// From film/: node --env-file=../../.env scripts/audio/gen-music-plan.mjs prompts/music-v2-inpaint.json i1
// The plan's chunks are sent as they are. Writes _takes/music-v2/act2-v2-<take>.pcm, .wav and a .json sidecar.
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { postBinary, credits } from './lib/eleven.mjs';

const here = new URL('.', import.meta.url).pathname;
const film = new URL('../../', import.meta.url).pathname;
const [planArg, takeId] = process.argv.slice(2);
const cfg = JSON.parse(readFileSync(here + planArg, 'utf8'));
const take = cfg.takes.find((t) => t.take === takeId);
if (!take) throw new Error(`unknown take ${takeId}`);
const chunksOf = (t) => (t.plan && t.plan !== 'chunks' ? cfg[t.plan].chunks : cfg.chunks);
const total = chunksOf(take).reduce((a, c) => a + (c.duration_ms ?? (c.range.end_ms - c.range.start_ms)), 0);
if (total !== cfg.duration_ms) throw new Error(`chunks add to ${total}, expected ${cfg.duration_ms}`);
for (const c of chunksOf(take)) for (const line of (c.text || '').split('\n')) if (line.length > 200) throw new Error(`line over 200 characters: ${line}`);

const planChunks = take.plan && take.plan !== 'chunks' ? cfg[take.plan].chunks : cfg.chunks;
const body = { model_id: cfg.model_id, composition_plan: { chunks: planChunks }, seed: take.seed, store_for_inpainting: true };
const outDir = film + '_takes/music-v2/';
mkdirSync(outDir, { recursive: true });
const raw = `${outDir}act2-v2-${takeId}.pcm`;
if (existsSync(raw)) { console.log(`skip ${takeId}: ${raw} exists`); process.exit(0); }
const before = await credits();
const t0 = Date.now();
const res = await postBinary('/v1/music', body, { output_format: cfg.output_format }, raw);
const secs = ((Date.now() - t0) / 1000).toFixed(1);
const sr = Number(cfg.output_format.split('_')[1]);
const bytes = statSync(raw).size;
const monoSecs = bytes / (sr * 2);
const channels = Math.abs(monoSecs - total / 1000) < Math.abs(monoSecs / 2 - total / 1000) ? 1 : 2;
const wav = `${outDir}act2-v2-${takeId}.wav`;
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', String(sr), '-ac', String(channels), '-i', raw, '-c:a', 'pcm_s16le', wav]);
const side = { take: takeId, plan: planArg, model_id: cfg.model_id, output_format: cfg.output_format, channels, seed: take.seed,
  request: body, response_headers: res.headers, bytes: res.bytes, seconds_to_generate: Number(secs),
  credits_before: before.character_count, note: 'the account counter lags by a minute or more; read it later', date: new Date().toISOString() };
writeFileSync(`${outDir}act2-v2-${takeId}.json`, JSON.stringify(side, null, 2));
console.log(JSON.stringify({ take: takeId, channels, seconds: (bytes / (sr * 2 * channels)).toFixed(3), secs, headers: res.headers }));

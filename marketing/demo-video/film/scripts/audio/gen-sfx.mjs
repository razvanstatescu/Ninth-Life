// Generate sound-effect takes from prompts/sfx.json (ElevenLabs /v1/sound-generation).
// From film/: node --env-file=../../.env scripts/audio/gen-sfx.mjs [id ...] [--takes N] [--start K]
// Writes _takes/audio/sfx/<id>/take-<k>.wav and take-<k>.json (request, cost). Never overwrites a take.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { postBinary, guard, spent } from './lib/eleven.mjs';

const here = new URL('.', import.meta.url).pathname;
const film = new URL('../../', import.meta.url).pathname;
const cfg = JSON.parse(readFileSync(here + 'prompts/sfx.json', 'utf8'));
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : undefined; };
const takesOverride = opt('--takes');
const v2 = args.includes('--v2'); // round 2: the effect's v2 prompt, takes numbered after round 1
const start = opt('--start') ?? 1;
const ids = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && args[i - 1] !== '--v2'));
let list = ids.length ? cfg.effects.filter((e) => ids.includes(e.id)) : cfg.effects;
if (v2) list = list.filter((e) => e.v2);

let fmt = cfg.output_format;
for (const e of list) {
  const dir = `${film}_takes/audio/sfx/${e.id}/`;
  mkdirSync(dir, { recursive: true });
  const p = v2 ? { ...e, ...e.v2 } : e;
  const n = takesOverride ?? p.takes;
  const k0 = v2 ? e.takes + 1 : start;
  for (let k = k0; k < k0 + n; k++) {
    const wav = `${dir}take-${k}.wav`;
    if (existsSync(wav)) { console.log(`skip ${e.id} take ${k} (exists)`); continue; }
    const body = { text: p.text, model_id: cfg.model_id, duration_seconds: p.duration_seconds,
      prompt_influence: p.prompt_influence ?? cfg.prompt_influence, loop: false };
    const before = await guard(200, `sfx ${e.id}`);
    let res;
    try {
      res = await postBinary('/v1/sound-generation', body, { output_format: fmt }, fmt.startsWith('wav') ? wav : `${dir}take-${k}.pcm`);
    } catch (err) {
      if (fmt === cfg.output_format && err.status && err.status < 500 && /format|tier|output/i.test(err.body || '')) {
        console.error(`format ${fmt} refused: ${String(err.body).slice(0, 200)}; using ${cfg.fallback_output_format}`);
        fmt = cfg.fallback_output_format;
        res = await postBinary('/v1/sound-generation', body, { output_format: fmt }, `${dir}take-${k}.pcm`);
      } else {
        throw err;
      }
    }
    if (!fmt.startsWith('wav')) {
      const raw = `${dir}take-${k}.pcm`;
      const bytes = statSync(raw).size;
      const ch = Math.abs(bytes / 96000 - e.duration_seconds) < Math.abs(bytes / 192000 - e.duration_seconds) ? 1 : 2;
      execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', '48000', '-ac', String(ch), '-i', raw, wav]);
    }
    writeFileSync(`${dir}take-${k}.json`, JSON.stringify({ id: e.id, take: k, request: body, output_format: fmt,
      response_headers: res.headers, bytes: res.bytes, credits_before: before.character_count,
      date: new Date().toISOString() }, null, 2));
    console.log(`${e.id} take ${k}: ${res.bytes} bytes`);
  }
}
const s = await spent();
console.log(`credits: count ${s.character_count}, spent by audio job ${s.spent}`);

// Generate speech takes with character timestamps (ElevenLabs /v1/text-to-speech/{voice}/with-timestamps).
// From film/:
//   node --env-file=../../.env scripts/audio/gen-voice.mjs <label> <variant> <line|all> <take ...>
//   e.g.  gen-voice.mjs angela v2s85 hello-again 1      or      gen-voice.mjs angela v2s85 all 1 2 3
// Voices, lines and variants (model, settings, text prefix) are in prompts/voice.json.
// Writes _takes/audio/voice/<label>/<variant>/<line>/take-<k>.wav and .json (request, alignment). No overwrite.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { postJson, guard, spent } from './lib/eleven.mjs';

const here = new URL('.', import.meta.url).pathname;
const film = new URL('../../', import.meta.url).pathname;
const cfg = JSON.parse(readFileSync(here + 'prompts/voice.json', 'utf8'));
const [label, variantId, lineId, ...takeArgs] = process.argv.slice(2);
const voice = cfg.candidates.find((c) => c.label === label);
const variant = cfg.variants[variantId];
if (!voice || !variant) {
  console.error('usage: gen-voice.mjs <label> <variant> <line|all> <take ...>');
  process.exit(2);
}
const lines = lineId === 'all' ? cfg.lines : cfg.lines.filter((l) => l.id === lineId);
const takes = takeArgs.length ? takeArgs.map(Number) : [1];

let fmt = cfg.output_format;
async function one(line, k) {
  const dir = `${film}_takes/audio/voice/${voice.label}/${variantId}/${line.id}/`;
  mkdirSync(dir, { recursive: true });
  const wav = `${dir}take-${k}.wav`;
  if (existsSync(wav)) { console.log(`skip ${voice.label} ${variantId} ${line.id} ${k}`); return; }
  const text = (variant.prefix || '') + line.text;
  const body = { text, model_id: variant.model_id, voice_settings: variant.voice_settings };
  await guard(text.length * 2 + 10, `voice ${line.id}`);
  let res;
  for (const f of [fmt, ...cfg.fallback_output_formats]) {
    try {
      res = await postJson(`/v1/text-to-speech/${voice.voice_id}/with-timestamps`, body, { output_format: f });
      fmt = f;
      break;
    } catch (e) {
      if (e.status && e.status < 500 && /format|tier|output|subscription/i.test(e.body || '')) {
        console.error(`format ${f} refused: ${String(e.body).slice(0, 160)}`);
        continue;
      }
      throw e;
    }
  }
  if (!res) throw new Error('no output format accepted');
  const buf = Buffer.from(res.audio_base64, 'base64');
  if (fmt.startsWith('wav')) {
    writeFileSync(wav, buf);
  } else {
    const rawPath = `${dir}take-${k}.${fmt.split('_')[0]}`;
    writeFileSync(rawPath, buf);
    const args = fmt.startsWith('pcm')
      ? ['-f', 's16le', '-ar', fmt.split('_')[1], '-ac', '1', '-i', rawPath]
      : ['-i', rawPath];
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args, wav]);
  }
  writeFileSync(`${dir}take-${k}.json`, JSON.stringify({ voice_id: voice.voice_id, label: voice.label,
    variant: variantId, line: line.id, line_text: line.text, sent_text: text, take: k, model_id: variant.model_id,
    output_format: fmt, request: body, alignment: res.alignment, normalized_alignment: res.normalized_alignment,
    date: new Date().toISOString() }, null, 2));
  console.log(`${voice.label} ${variantId} ${line.id} take ${k}: ${buf.length} bytes (${fmt})`);
}

for (const line of lines) for (const k of takes) await one(line, k);
const s = await spent();
console.log(`credits: count ${s.character_count}, spent by audio job ${s.spent}`);

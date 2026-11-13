// Transcribe takes with ElevenLabs speech to text (/v1/speech-to-text), to verify the words.
// From film/: node --env-file=../../.env scripts/audio/stt.mjs <file.wav> [...]
// Writes <file>.stt.json next to each file (model, text, words with times). Skips files already done.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { postMultipart, spent } from './lib/eleven.mjs';

const here = new URL('.', import.meta.url).pathname;
const cfg = JSON.parse(readFileSync(here + 'prompts/voice.json', 'utf8'));
const files = process.argv.slice(2);
for (const f of files) {
  const out = f.replace(/\.wav$/, '.stt.json');
  if (existsSync(out)) { console.log(`skip ${f}`); continue; }
  let model = cfg.stt_model_id;
  let r;
  for (const m of [cfg.stt_model_id, cfg.stt_fallback_model_id]) {
    try {
      r = await postMultipart('/v1/speech-to-text', { model_id: m, language_code: 'en', timestamps_granularity: 'word',
        tag_audio_events: 'false', diarize: 'false' }, f, 'file');
      model = m;
      break;
    } catch (e) {
      if (e.status === 400 || e.status === 422) { console.error(`stt ${m} refused: ${String(e.body).slice(0, 200)}`); continue; }
      throw e;
    }
  }
  if (!r) throw new Error('no stt model accepted');
  const words = (r.words || []).filter((w) => w.type === 'word').map((w) => ({ text: w.text, start: w.start, end: w.end, logprob: w.logprob }));
  writeFileSync(out, JSON.stringify({ model, language_code: r.language_code, text: r.text, words, date: new Date().toISOString() }, null, 2));
  console.log(`${f.split('/').slice(-3).join('/')}: "${r.text}" (${model})`);
}
const s = await spent();
console.log(`credits: count ${s.character_count}, spent by audio job ${s.spent}`);

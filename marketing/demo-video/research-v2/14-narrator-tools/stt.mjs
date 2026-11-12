// Transcribe narrator takes with ElevenLabs speech to text (POST /v1/speech-to-text) to confirm the words.
// Run:  node --env-file=<repo>/marketing/.env stt.mjs <takesDir> <file.wav> [...]
// Writes <file>.stt.json next to each file (model, text, words with times, safe headers). Skips files done.
// Appends each call to <takesDir>/ledger.json. The key is never printed.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const [takesDir, ...files] = process.argv.slice(2);
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY || !takesDir || !files.length) { console.error('usage: stt.mjs <takesDir> <file.wav> [...] (with the key in the environment)'); process.exit(2); }
const ledgerPath = `${takesDir}/ledger.json`;
const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : { entries: [] };
const SAFE = /^(request-id|x-request-id|character-cost|x-character-count|content-type|x-region|.*cost.*|.*credit.*|.*duration.*)$/i;
const MODELS = ['scribe_v3', 'scribe_v2'];

for (const f of files) {
  const out = f.replace(/\.wav$/, '.stt.json');
  if (existsSync(out)) { console.log(`skip ${f}`); continue; }
  let done = false;
  for (const model of MODELS) {
    const form = new FormData();
    form.set('model_id', model);
    form.set('language_code', 'en');
    form.set('timestamps_granularity', 'word');
    form.set('tag_audio_events', 'false');
    form.set('diarize', 'false');
    form.set('file', new Blob([readFileSync(f)], { type: 'audio/wav' }), f.split('/').pop());
    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': KEY }, body: form });
    const headers = {};
    for (const [k, v] of res.headers.entries()) if (SAFE.test(k)) headers[k] = v;
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.error(`stt ${model} on ${f.split('/').slice(-3).join('/')}: HTTP ${res.status} ${t.slice(0, 200)}`);
      if (res.status === 400 || res.status === 422) continue;
      process.exit(1);
    }
    const r = await res.json();
    const words = (r.words || []).filter((w) => w.type === 'word').map((w) => ({ text: w.text, start: w.start, end: w.end, logprob: w.logprob }));
    writeFileSync(out, JSON.stringify({ model, language_code: r.language_code, language_probability: r.language_probability, text: r.text, words, response_headers: headers, date: new Date().toISOString() }, null, 2));
    ledger.entries.push({ at: new Date().toISOString(), kind: 'stt', file: f.split('/').slice(-3).join('/'), model, credits: headers['character-cost'] != null ? Number(headers['character-cost']) : null, headers });
    writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
    console.log(`${f.split('/').slice(-3).join('/')}: "${r.text}" (${model}) headers ${JSON.stringify(headers)}`);
    done = true;
    break;
  }
  if (!done) { console.error(`no stt model accepted ${f}`); process.exit(1); }
}

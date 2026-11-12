// The narrator's takes, line by line (prompts/narration.json), with the choice made inside the loop so that each
// line is conditioned on the takes actually chosen before it.
// From film/:  node --env-file=../../.env scripts/audio/narration-takes.mjs [line-id ...]
//
// Per line: 3 takes (seeds 1111, 2222, 3333) from /v1/text-to-speech/{voice}/with-timestamps, wav_48000, all with
// previous_request_ids = the request ids of the chosen takes of up to 3 earlier lines of the SAME act (never across
// the act boundary; the closest line last). Then speech to text (scribe_v3, word times, audio events tagged), then
// scripts/audio/narration_select.py. If no take passes, one extra round (seeds 4444, 5555, 6666) and a final choice.
// Writes _takes/narration-v2/<id>/take-<k>.wav, .json (request, safe headers, alignment), .stt.json, select.json,
// and _takes/narration-v2/ledger.json. Stops before this step passes 4,000 credits. The key is never printed.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const film = new URL('../../', import.meta.url).pathname;
const cfg = JSON.parse(readFileSync(film + 'scripts/audio/prompts/narration.json', 'utf8'));
const TAKES = film + '_takes/narration-v2/';
const BUDGET = 4000;
const SEEDS = [1111, 2222, 3333];
const EXTRA = [4444, 5555, 6666];
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('ELEVENLABS_API_KEY is not set (run with --env-file=../../.env from film/)'); process.exit(2); }
mkdirSync(TAKES, { recursive: true });

const ledgerPath = TAKES + 'ledger.json';
const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : { entries: [] };
const saveLedger = () => writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
const spent = () => ledger.entries.reduce((a, e) => a + (e.credits ?? 0), 0);
const SAFE = /^(request-id|character-cost|history-item-id|content-type|tts-latency-ms|x-region|fiat-cost-before-overages)$/i;

async function call(url, init) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init);
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    const headers = {};
    for (const [k, v] of res.headers.entries()) if (SAFE.test(k)) headers[k] = v;
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      const e = new Error(`HTTP ${res.status}: ${t.slice(0, 500)}`);
      e.status = res.status;
      throw e;
    }
    return { json: await res.json(), headers };
  }
}

async function subscriptionCount() {
  const { json } = await call('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': KEY } });
  return json.character_count;
}

async function take(line, k, seed, context) {
  const dir = `${TAKES}${line.id}/`;
  mkdirSync(dir, { recursive: true });
  const base = `${dir}take-${k}`;
  if (existsSync(`${base}.wav`)) return;
  const text = (line.act === 1 ? cfg.act1_tag + ' ' : '') + line.text;
  if (spent() + Math.ceil(text.length * 0.3) > BUDGET) throw new Error(`budget: ${line.id} take ${k} (ledger ${spent()})`);
  const body = { text, model_id: cfg.model_id, voice_settings: cfg.voice_settings, seed };
  if (context.length) body.previous_request_ids = context;
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${cfg.voice_id}/with-timestamps`);
  url.searchParams.set('output_format', cfg.output_format);
  const { json, headers } = await call(url, { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const buf = Buffer.from(json.audio_base64, 'base64');
  writeFileSync(`${base}.wav`, buf);
  writeFileSync(`${base}.json`, JSON.stringify({ id: line.id, act: line.act, line_text: line.text, sent_text: text, take: k,
    voice_id: cfg.voice_id, voice_name: cfg.voice_label, model_id: cfg.model_id, output_format: cfg.output_format,
    endpoint: '/v1/text-to-speech/{voice_id}/with-timestamps', request: body, response_headers: headers,
    alignment: json.alignment, normalized_alignment: json.normalized_alignment, date: new Date().toISOString() }, null, 2));
  const cost = headers['character-cost'] != null ? Number(headers['character-cost']) : text.length;
  ledger.entries.push({ at: new Date().toISOString(), kind: 'tts', id: line.id, take: k, seed, chars: text.length, credits: cost,
    request_id: headers['request-id'] ?? null, previous_request_ids: context });
  saveLedger();
}

async function stt(line, k) {
  const wav = `${TAKES}${line.id}/take-${k}.wav`;
  const out = wav.replace(/\.wav$/, '.stt.json');
  if (existsSync(out)) return;
  const form = new FormData();
  form.set('model_id', 'scribe_v3');
  form.set('language_code', 'en');
  form.set('timestamps_granularity', 'word');
  form.set('tag_audio_events', 'true');
  form.set('diarize', 'false');
  form.set('file', new Blob([readFileSync(wav)], { type: 'audio/wav' }), `take-${k}.wav`);
  const { json, headers } = await call('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': KEY }, body: form });
  const words = (json.words || []).filter((w) => w.type === 'word').map((w) => ({ text: w.text, start: w.start, end: w.end, logprob: w.logprob }));
  const events = (json.words || []).filter((w) => w.type === 'audio_event').map((w) => w.text);
  writeFileSync(out, JSON.stringify({ model: 'scribe_v3', language_code: json.language_code, raw_text: json.text,
    text: words.map((w) => w.text).join(' '), words, events, response_headers: headers, date: new Date().toISOString() }, null, 2));
  ledger.entries.push({ at: new Date().toISOString(), kind: 'stt', id: line.id, take: k,
    credits: headers['character-cost'] != null ? Number(headers['character-cost']) : 1 });
  saveLedger();
}

function select(line, final) {
  const out = execFileSync(film + '.venv/bin/python', ['-I', '-B', film + 'scripts/audio/narration_select.py', line.id, ...(final ? ['--final'] : [])],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return JSON.parse(out.trim().split('\n').pop());
}

const only = new Set(process.argv.slice(2));
const before = await subscriptionCount();
console.log(`account character_count before: ${before}; this step's ledger: ${spent()} of ${BUDGET}`);
const chosen = {}; // id -> request id of the chosen take
for (let i = 0; i < cfg.lines.length; i++) {
  const line = cfg.lines[i];
  // context: chosen takes of up to 3 earlier lines of the same act, oldest first
  const context = [];
  for (let j = i - 1; j >= 0 && context.length < 3; j--) {
    const l = cfg.lines[j];
    if (l.act !== line.act) break;
    const sel = JSON.parse(readFileSync(`${TAKES}${l.id}/select.json`, 'utf8'));
    const meta = JSON.parse(readFileSync(`${TAKES}${l.id}/${sel.chosen}.json`, 'utf8'));
    context.unshift(meta.response_headers['request-id']);
  }
  if (only.size && !only.has(line.id)) continue;
  if (existsSync(`${TAKES}${line.id}/select.json`) && !only.has(line.id)) {
    const sel = JSON.parse(readFileSync(`${TAKES}${line.id}/select.json`, 'utf8'));
    if (sel.chosen) { console.log(`${line.id}: already chosen ${sel.chosen}`); continue; }
  }
  await Promise.all(SEEDS.map((s, n) => take(line, n + 1, s, context)));
  await Promise.all(SEEDS.map((s, n) => stt(line, n + 1)));
  let r = select(line, false);
  if (!r.chosen) {
    console.log(`${line.id}: no take passes ${JSON.stringify(r.takes.map((t) => t.fails))}; extra round`);
    await Promise.all(EXTRA.map((s, n) => take(line, n + 4, s, context)));
    await Promise.all(EXTRA.map((s, n) => stt(line, n + 4)));
    r = select(line, true);
  }
  chosen[line.id] = r.chosen;
  console.log(`${line.id} (act ${line.act}, after ${context.length}): ${r.chosen}${r.fallback ? ' FALLBACK' : ''} | ` +
    r.takes.map((t) => `${t.take} ${t.wps}wps dF0 ${t.d_f0_st} timbre ${t.d_timbre_db} s ${t.score}${t.fails.length ? ' x[' + t.fails.join(';') + ']' : ''}`).join(' | '));
}
const after = await subscriptionCount();
ledger.checks = (ledger.checks || []).concat([{ at: new Date().toISOString(), before, after }]);
saveLedger();
console.log(`account character_count after: ${after} (+${after - before}); this step's ledger: ${spent()}`);

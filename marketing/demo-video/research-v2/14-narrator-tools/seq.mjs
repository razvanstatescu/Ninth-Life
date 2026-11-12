// Timbre drift test: the lines of seq-plan.json in order, one request each, independent or stitched.
// Run:  node --env-file=<repo>/marketing/.env seq.mjs <takesDir> <label> <independent|stitched>
// Writes <takesDir>/<label>/seq-<mode>/<id>.wav and .json; appends to <takesDir>/ledger.json; obeys the budget in
// narrator-plan.json. The key is never printed.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const here = new URL('.', import.meta.url).pathname;
const plan = JSON.parse(readFileSync(here + 'narrator-plan.json', 'utf8'));
const seq = JSON.parse(readFileSync(here + 'seq-plan.json', 'utf8'));
const [takesDir, label, mode] = process.argv.slice(2);
const cand = plan.candidates.find((c) => c.label === label);
if (!takesDir || !cand || !['independent', 'stitched'].includes(mode)) {
  console.error('usage: seq.mjs <takesDir> <label> <independent|stitched>');
  process.exit(2);
}
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('ELEVENLABS_API_KEY is not set'); process.exit(2); }
const ledgerPath = `${takesDir}/ledger.json`;
const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : { entries: [] };
const spent = () => ledger.entries.reduce((a, e) => a + (e.credits ?? 0), 0);
const SAFE = /^(request-id|character-cost|history-item-id|content-type|tts-latency-ms|x-region)$/i;

const dir = `${takesDir}/${label}/seq-${mode}`;
mkdirSync(dir, { recursive: true });
const ids = { 1: [], 2: [] };
for (const line of seq.lines) {
  const base = `${dir}/${line.id}`;
  if (existsSync(`${base}.wav`)) {
    const prev = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
    if (prev.response_headers?.['request-id']) ids[line.act].push(prev.response_headers['request-id']);
    console.log(`skip ${base}`);
    continue;
  }
  const text = (seq.tags[String(line.act)] || '') + line.text;
  if (spent() + text.length > plan.budget.max_spend) { console.error(`budget guard at ${line.id} (ledger ${spent()})`); process.exit(3); }
  const body = { text, model_id: seq.model_id, voice_settings: seq.voice_settings, seed: 1111 };
  if (mode === 'stitched' && ids[line.act].length) body.previous_request_ids = ids[line.act].slice(-3);
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${cand.voice_id}/with-timestamps`);
  url.searchParams.set('output_format', seq.output_format);
  const res = await fetch(url, { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const headers = {};
  for (const [k, v] of res.headers.entries()) if (SAFE.test(k)) headers[k] = v;
  if (!res.ok) {
    console.error(`${label} ${mode} ${line.id}: HTTP ${res.status} ${(await res.text()).slice(0, 400)}`);
    process.exit(1);
  }
  const j = await res.json();
  const buf = Buffer.from(j.audio_base64, 'base64');
  writeFileSync(`${base}.wav`, buf);
  const cost = headers['character-cost'] != null ? Number(headers['character-cost']) : text.length;
  writeFileSync(`${base}.json`, JSON.stringify({ label, voice_id: cand.voice_id, voice_name: cand.name, variant: `seq-${mode}`,
    line: line.id, act: line.act, line_text: line.text, sent_text: text, take: 1, model_id: seq.model_id,
    output_format: seq.output_format, endpoint: '/v1/text-to-speech/{voice_id}/with-timestamps', request: body,
    response_headers: headers, alignment: j.alignment, normalized_alignment: j.normalized_alignment, date: new Date().toISOString() }, null, 2));
  ledger.entries.push({ at: new Date().toISOString(), kind: 'tts', label, variant: `seq-${mode}`, line: line.id, take: 1,
    chars: text.length, credits: cost, header_cost: headers['character-cost'] ?? null, request_id: headers['request-id'] ?? null, bytes: buf.length });
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
  if (headers['request-id']) ids[line.act].push(headers['request-id']);
  console.log(`${label} ${mode} ${line.id}: cost ${cost}, request ${headers['request-id']}${body.previous_request_ids ? ` (after ${body.previous_request_ids.length})` : ''}`);
}
console.log(`ledger total ${spent()}`);

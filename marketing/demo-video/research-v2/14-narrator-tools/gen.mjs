// Narrator test reads: ElevenLabs /v1/text-to-speech/{voice}/with-timestamps, 48 kHz WAV.
// Run:  node --env-file=<repo>/marketing/.env gen.mjs <takesDir> <variant> <labels,...|all> <A|B|AB> [take ...]
// Writes <takesDir>/<label>/<variant>/<line>-take<k>.wav and .json (request, alignment, safe headers). No overwrite.
// Keeps a ledger (<takesDir>/ledger.json) of every request and its character cost, and refuses to start a
// request that could take this job past the budget in narrator-plan.json. The key is never printed.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const here = new URL('.', import.meta.url).pathname;
const plan = JSON.parse(readFileSync(here + 'narrator-plan.json', 'utf8'));
const [takesDir, variantId, labelsArg, linesArg = 'AB', ...takeArgs] = process.argv.slice(2);
const variant = plan.variants[variantId];
if (!takesDir || !variant || !labelsArg) {
  console.error('usage: gen.mjs <takesDir> <variant> <labels|all> <A|B|AB> [take ...]');
  process.exit(2);
}
const labels = labelsArg === 'all' ? plan.candidates.map((c) => c.label) : labelsArg.split(',');
const takes = takeArgs.length ? takeArgs.map(Number) : [1];
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('ELEVENLABS_API_KEY is not set'); process.exit(2); }

const ledgerPath = `${takesDir}/ledger.json`;
const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : { entries: [] };
const saveLedger = () => writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
const spentSoFar = () => ledger.entries.reduce((a, e) => a + (e.credits ?? 0), 0);

async function subscriptionCount() {
  const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': KEY } });
  if (!r.ok) throw new Error(`subscription HTTP ${r.status}`);
  const s = await r.json();
  return s.character_count;
}

const SAFE_HEADERS = /^(request-id|x-request-id|character-cost|x-character-count|history-item-id|content-type|current-concurrent-requests|maximum-concurrent-requests|x-region|tts-latency-ms)$/i;

async function tts(voiceId, body, outputFormat) {
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`);
  url.searchParams.set('output_format', outputFormat);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.status === 429 && attempt < 5) { await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt)); continue; }
    const headers = {};
    for (const [k, v] of res.headers.entries()) if (SAFE_HEADERS.test(k)) headers[k] = v;
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      const e = new Error(`HTTP ${res.status}: ${t.slice(0, 600)}`);
      e.status = res.status; e.headers = headers;
      throw e;
    }
    return { json: await res.json(), headers };
  }
}

const before = await subscriptionCount();
console.log(`subscription character_count before: ${before}; this job's ledger so far: ${spentSoFar()} of ${plan.budget.max_spend}`);
for (const label of labels) {
  const cand = plan.candidates.find((c) => c.label === label);
  if (!cand) { console.error(`unknown label ${label}`); continue; }
  for (const lineId of linesArg.split('')) {
    const line = plan.lines[lineId];
    for (const k of takes) {
      const dir = `${takesDir}/${label}/${variantId}`;
      mkdirSync(dir, { recursive: true });
      const base = `${dir}/${lineId}-take${k}`;
      if (existsSync(`${base}.wav`)) { console.log(`skip ${base}`); continue; }
      const text = (variant.tags?.[lineId] || '') + line.text;
      const estimate = text.length; // all candidates have no credit multiplier (rate 1)
      if (spentSoFar() + estimate > plan.budget.max_spend) {
        console.error(`budget guard: ${label} ${variantId} ${lineId} take ${k} would pass ${plan.budget.max_spend} (ledger ${spentSoFar()})`);
        process.exit(3);
      }
      const seed = 1110 + k;
      const body = { text, model_id: variant.model_id, voice_settings: variant.voice_settings, seed };
      let r;
      try {
        r = await tts(cand.voice_id, body, plan.output_format);
      } catch (e) {
        console.error(`${label} ${variantId} ${lineId} take ${k}: ${e.message}`);
        ledger.entries.push({ at: new Date().toISOString(), kind: 'tts-error', label, variant: variantId, line: lineId, take: k, status: e.status, credits: 0, headers: e.headers });
        saveLedger();
        continue;
      }
      const buf = Buffer.from(r.json.audio_base64, 'base64');
      writeFileSync(`${base}.wav`, buf);
      const cost = r.headers['character-cost'] != null ? Number(r.headers['character-cost']) : estimate;
      writeFileSync(`${base}.json`, JSON.stringify({
        label, voice_id: cand.voice_id, voice_name: cand.name, variant: variantId, line: lineId, line_text: line.text,
        sent_text: text, take: k, model_id: variant.model_id, output_format: plan.output_format,
        endpoint: '/v1/text-to-speech/{voice_id}/with-timestamps', request: body, response_headers: r.headers,
        alignment: r.json.alignment, normalized_alignment: r.json.normalized_alignment, date: new Date().toISOString(),
      }, null, 2));
      ledger.entries.push({ at: new Date().toISOString(), kind: 'tts', label, variant: variantId, line: lineId, take: k,
        chars: text.length, credits: cost, header_cost: r.headers['character-cost'] ?? null, request_id: r.headers['request-id'] ?? null, bytes: buf.length });
      saveLedger();
      console.log(`${label} ${variantId} ${lineId} take ${k}: ${buf.length} bytes, cost ${cost} (${text.length} chars), request ${r.headers['request-id'] ?? '?'}`);
    }
  }
}
const after = await subscriptionCount();
ledger.checks = (ledger.checks || []).concat([{ at: new Date().toISOString(), what: `gen ${variantId} ${labelsArg} ${linesArg} ${takes}`, subscription_before: before, subscription_after: after, delta: after - before }]);
saveLedger();
console.log(`subscription character_count after: ${after} (delta ${after - before}); ledger total ${spentSoFar()}`);

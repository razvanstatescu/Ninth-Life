// Word times for the finished narrator lines: ElevenLabs Forced Alignment (POST /v1/forced-alignment, audio + text).
// From film/:  node --env-file=../../.env scripts/audio/narration-align.mjs [line-id ...]
// Aligns public/audio/narration/<id>.wav with the line's exact text; writes _takes/narration-v2/<id>/align.json
// (words and characters with start/end in seconds of the finished file, loss) and a ledger entry. Re-run after
// narration_finish.py whenever a file changes. The key is never printed.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const film = new URL('../../', import.meta.url).pathname;
const cfg = JSON.parse(readFileSync(film + 'scripts/audio/prompts/narration.json', 'utf8'));
const TAKES = film + '_takes/narration-v2/';
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('ELEVENLABS_API_KEY is not set'); process.exit(2); }
const ledgerPath = TAKES + 'ledger.json';
const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : { entries: [] };
const only = new Set(process.argv.slice(2));

for (const line of cfg.lines) {
  if (only.size && !only.has(line.id)) continue;
  const wav = `${film}public/audio/narration/${line.id}.wav`;
  const form = new FormData();
  form.set('text', line.text);
  form.set('file', new Blob([readFileSync(wav)], { type: 'audio/wav' }), `${line.id}.wav`);
  let res;
  for (let attempt = 0; attempt < 5; attempt++) {
    res = await fetch('https://api.elevenlabs.io/v1/forced-alignment', { method: 'POST', headers: { 'xi-api-key': KEY }, body: form });
    if (res.status !== 429 && res.status < 500) break;
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
  const headers = {};
  for (const [k, v] of res.headers.entries()) if (/^(request-id|character-cost|content-type|fiat-cost-before-overages)$/i.test(k)) headers[k] = v;
  if (!res.ok) { console.error(`${line.id}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`); process.exit(1); }
  const j = await res.json();
  writeFileSync(`${TAKES}${line.id}/align.json`, JSON.stringify({ endpoint: '/v1/forced-alignment', file: `public/audio/narration/${line.id}.wav`,
    text: line.text, loss: j.loss, words: j.words, characters: j.characters, response_headers: headers, date: new Date().toISOString() }, null, 2));
  ledger.entries.push({ at: new Date().toISOString(), kind: 'align', id: line.id,
    credits: headers['character-cost'] != null ? Number(headers['character-cost']) : null, headers });
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
  console.log(`${line.id}: ${j.words.length} words, loss ${j.loss?.toFixed?.(3)}, cost ${headers['character-cost'] ?? '?'}`);
}

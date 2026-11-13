// Minimal ElevenLabs client for the film's audio scripts.
//
// The key is read from process.env.ELEVENLABS_API_KEY. Run every script from film/ with
//   node --env-file=../../.env scripts/audio/<script>.mjs ...
// The key is never printed, logged or written anywhere. Errors print the HTTP status and the
// response body only (the API never echoes the key back).

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

const BASE = 'https://api.elevenlabs.io';

function key() {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error('ELEVENLABS_API_KEY is not set (run with --env-file=../../.env from film/)');
  return k;
}

async function request(path, { method = 'GET', json, form, query } = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  const headers = { 'xi-api-key': key() };
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  let res;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(url, { method, headers, body });
    if (res.status === 429 && attempt < 6) {
      const wait = 2000 * 2 ** attempt;
      console.error(`rate limited on ${path}; retrying in ${wait / 1000} s`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    break;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status} ${method} ${path}: ${text.slice(0, 2000)}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return res;
}

export async function getJson(path, query) {
  const res = await request(path, { query });
  return res.json();
}

export async function postJson(path, json, query) {
  const res = await request(path, { method: 'POST', json, query });
  return res.json();
}

/** POST JSON, save the binary response to outPath. Returns response headers as a plain object. */
export async function postBinary(path, json, query, outPath) {
  const res = await request(path, { method: 'POST', json, query });
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, buf);
  const headers = {};
  for (const [k, v] of res.headers.entries()) {
    // keep only harmless metadata headers
    if (/^(content-type|song-id|x-song-id|request-id|x-request-id|history-item-id|x-character-count|character-cost|x-credits|.*cost.*|.*song.*)$/i.test(k)) headers[k] = v;
  }
  return { bytes: buf.length, headers };
}

/** POST multipart with a file field, return parsed JSON or save binary. */
export async function postMultipart(path, fields, filePath, fileField = 'file', query, outPath) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields || {})) if (v !== undefined && v !== null) form.set(k, String(v));
  const data = readFileSync(filePath);
  const name = filePath.split('/').pop();
  const type = name.endsWith('.wav') ? 'audio/wav' : name.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream';
  form.set(fileField, new Blob([data], { type }), name);
  const res = await request(path, { method: 'POST', form, query });
  if (outPath) {
    const buf = Buffer.from(await res.arrayBuffer());
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, buf);
    return { bytes: buf.length, contentType: res.headers.get('content-type') };
  }
  return res.json();
}

let cache = { at: 0, value: null };
export async function credits() {
  if (cache.value && Date.now() - cache.at < 20000) return cache.value;
  const s = await getJson('/v1/user/subscription');
  cache = { at: Date.now(), value: null };
  cache.value = {
    tier: s.tier,
    status: s.status,
    character_count: s.character_count,
    character_limit: s.character_limit,
    remaining: s.character_limit - s.character_count,
    next_reset_unix: s.next_character_count_reset_unix ?? null,
    can_extend: s.can_extend_character_limit ?? null,
    max_credit_limit_extension: s.max_credit_limit_extension ?? null,
  };
  return cache.value;
}

// ---- spend guard -------------------------------------------------------------------------
// The sound designer's hard cap is 14,000 credits over the whole job. The baseline
// character_count is stored in _takes/audio/credits-baseline.json at the first run.
export const CAP = 14000;
const BASELINE_FILE = new URL('../../../_takes/audio/credits-baseline.json', import.meta.url);

export async function spent() {
  const now = await credits();
  let base;
  try {
    base = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
  } catch {
    base = { character_count: now.character_count, at: new Date().toISOString() };
    mkdirSync(dirname(BASELINE_FILE.pathname), { recursive: true });
    writeFileSync(BASELINE_FILE, JSON.stringify(base, null, 2));
  }
  return { ...now, baseline: base.character_count, spent: now.character_count - base.character_count };
}

/** Throw if spending `estimate` more credits would pass the cap. */
export async function guard(estimate, label = '') {
  const s = await spent();
  if (s.spent + estimate > CAP) {
    throw new Error(`credit guard: ${label} would exceed the cap (spent ${s.spent}, estimate ${estimate}, cap ${CAP})`);
  }
  return s;
}

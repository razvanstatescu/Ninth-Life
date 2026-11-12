// Generate takes of one v2 Act 1 plate with OpenAI's image model (research-v2/10-act1-old-world.md, section 4.8).
//
//   node --env-file=../../.env scripts/images/gen-v2.mjs <id> [--draft] [--n 2] [--quality high] [--size WxH] [--note "..."]
//
// Run from film/. The key is read from process.env.OPENAI_API_KEY and is never printed, logged or written;
// errors print the HTTP status and the response body only.
// Prompts: scripts/images/prompts-v2.json ([BLOCK] tokens are expanded from its "blocks").
// Takes: out/act1-v2/takes/<id>/<id>-NN.png with a JSON sidecar (model, date, full prompt, params, refs, usage).
// Every call is appended to out/act1-v2/takes/ledger.jsonl. Budget: at most 40 pictures in all (BUDGET below);
// a call that would pass it is refused before it is sent.
import https from 'node:https';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILM = resolve(HERE, '..', '..');
const PROMPTS = JSON.parse(readFileSync(join(HERE, 'prompts-v2.json'), 'utf8'));
const TAKES = join(FILM, 'out', 'act1-v2', 'takes');
const LEDGER = join(TAKES, 'ledger.jsonl');
const BUDGET = 40;

const MODELS = { final: 'gpt-image-2.6-sunburst', draft: 'gpt-image-2.6-flare' };

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
};
const opt = (name, def) => {
  const i = args.indexOf(name);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const draft = flag('--draft');
const n = Number(opt('--n', '1'));
const quality = opt('--quality', draft ? 'medium' : 'high');
const sizeOpt = opt('--size', '');
const note = opt('--note', '');
const id = args[0];
if (!id || !PROMPTS.ids[id]) {
  console.error(`usage: gen-v2.mjs <${Object.keys(PROMPTS.ids).join('|')}> [--draft] [--n N] [--quality q] [--size WxH] [--note "..."]`);
  process.exit(2);
}
const spec = PROMPTS.ids[id];
const model = draft ? MODELS.draft : MODELS.final;
const size = sizeOpt || spec.size;

/** "@v2-..." is a chosen final in public/img/v2; anything else is a path relative to film/. */
function refPath(ref) {
  if (!ref.startsWith('@')) return join(FILM, ref);
  const rid = ref.slice(1);
  return join(FILM, 'public', 'img', 'v2', `${PROMPTS.ids[rid].name}.png`);
}

function buildPrompt() {
  return spec.prompt.replace(/\[([A-Z-]+)\]/g, (m, name) => {
    const block = PROMPTS.blocks[name];
    if (!block) throw new Error(`unknown block ${m}`);
    return block;
  });
}

function used() {
  if (!existsSync(LEDGER)) return 0;
  return readFileSync(LEDGER, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l).got ?? 0)
    .reduce((a, b) => a + b, 0);
}

function key() {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error('OPENAI_API_KEY is not set (run with --env-file=../../.env from film/)');
  return k;
}

function post(path, body, contentType) {
  return new Promise((resolvePost, reject) => {
    const req = https.request(
      {
        hostname: 'api.openai.com',
        path,
        method: 'POST',
        headers: { Authorization: `Bearer ${key()}`, 'Content-Type': contentType, 'Content-Length': body.length },
        timeout: 20 * 60 * 1000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode >= 300) reject(new Error(`HTTP ${res.statusCode} ${path}: ${text.slice(0, 3000)}`));
          else {
            try {
              resolvePost(JSON.parse(text));
            } catch (e) {
              reject(new Error(`bad JSON from ${path}: ${text.slice(0, 500)}`));
            }
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('request timed out')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function multipart(fields, files) {
  const boundary = `----nlimg${randomBytes(12).toString('hex')}`;
  const chunks = [];
  for (const [name, value] of fields) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  }
  for (const f of files) {
    chunks.push(
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${f.name}"; filename="${f.filename}"\r\nContent-Type: image/png\r\n\r\n`),
      f.data,
      Buffer.from('\r\n'),
    );
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

function nextTake(dir) {
  const nums = existsSync(dir) ? readdirSync(dir).map((f) => /-(\d+)\.png$/.exec(f)?.[1]).filter(Boolean).map(Number) : [];
  return nums.length ? Math.max(...nums) + 1 : 1;
}

async function main() {
  const spent = used();
  if (spent + n > BUDGET) throw new Error(`budget: ${spent} pictures made, ${n} more would pass ${BUDGET}`);
  const prompt = buildPrompt();
  const refs = spec.refs.map(refPath);
  for (const r of refs) if (!existsSync(r)) throw new Error(`missing reference ${r.replace(FILM + '/', '')}`);
  const params = { model, size, quality, n, output_format: 'png', ...(spec.complexity ? { complexity: spec.complexity } : {}) };
  const t0 = Date.now();
  let json;
  if (refs.length === 0) {
    json = await post('/v1/images/generations', Buffer.from(JSON.stringify({ ...params, prompt })), 'application/json');
  } else {
    const fields = Object.entries(params).map(([k, v]) => [k, String(v)]);
    fields.push(['prompt', prompt]);
    const files = refs.map((r) => ({ name: 'image[]', filename: basename(r), data: readFileSync(r) }));
    const mp = multipart(fields, files);
    json = await post('/v1/images/edits', mp.body, mp.contentType);
  }
  const elapsed = Math.round((Date.now() - t0) / 1000);
  const dir = join(TAKES, id);
  mkdirSync(dir, { recursive: true });
  let take = nextTake(dir);
  const date = new Date().toISOString();
  const written = [];
  for (const item of json.data ?? []) {
    if (!item.b64_json) continue;
    const name = `${id}-${String(take).padStart(2, '0')}`;
    writeFileSync(join(dir, `${name}.png`), Buffer.from(item.b64_json, 'base64'));
    const side = {
      id,
      take: name,
      model,
      endpoint: refs.length ? '/v1/images/edits' : '/v1/images/generations',
      date,
      params,
      refs: refs.map((r) => r.replace(FILM + '/', '')),
      prompt,
      revised_prompt: item.revised_prompt ?? null,
      usage: json.usage ?? null,
      elapsed_s: elapsed,
      note,
    };
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(side, null, 1) + '\n');
    written.push(name);
    take++;
  }
  appendFileSync(LEDGER, JSON.stringify({ id, model, quality, size, n, got: written.length, takes: written, date, elapsed_s: elapsed, usage: json.usage ?? null, note }) + '\n');
  console.log(`${id}: ${written.join(', ')} (${model}, ${quality}, ${size}, ${elapsed}s; budget ${used()}/${BUDGET})`);
}

mkdirSync(TAKES, { recursive: true });
main().catch((e) => {
  console.error(`${id}: FAILED ${e.message}`);
  appendFileSync(LEDGER, JSON.stringify({ id, model, quality, size, n, got: 0, failed: String(e.message).slice(0, 400), date: new Date().toISOString() }) + '\n');
  process.exitCode = 1;
});

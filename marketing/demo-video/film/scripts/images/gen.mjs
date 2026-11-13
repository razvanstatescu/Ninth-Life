// Generate takes of one Act 1 plate with OpenAI's image model (04-asset-plan.md, section 1).
//
//   node --env-file=../../.env scripts/images/gen.mjs <id> [--draft] [--n 2] [--quality high] [--extra "..."]
//
// Run from film/. The key is read from process.env.OPENAI_API_KEY and is never printed, logged or
// written anywhere; errors print the HTTP status and the response body only.
// Prompts are in scripts/images/prompts.json. Takes go to _takes/images/<id>/<id>-NN.png with a JSON
// sidecar (model, date, full prompt, params, usage). Every call is appended to _takes/images/ledger.jsonl
// so the budget (about 60 pictures) can be counted.
import https from 'node:https';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILM = resolve(HERE, '..', '..');
const PROMPTS = JSON.parse(readFileSync(join(HERE, 'prompts.json'), 'utf8'));
const TAKES = join(FILM, '_takes', 'images');

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
const size = opt('--size', '2560x1440');
const extra = opt('--extra', '');
const note = opt('--note', '');
const refOverride = opt('--refs', '');
const id = args[0];
if (!id || !PROMPTS.ids[id]) {
  console.error(`usage: gen.mjs <${Object.keys(PROMPTS.ids).join('|')}> [--draft] [--n N] [--quality q] [--extra "..."] [--refs a,b]`);
  process.exit(2);
}
const spec = PROMPTS.ids[id];
const model = draft ? MODELS.draft : MODELS.final;

/** "@img-00" is the approved style reference; "@img-0N" the chosen plate in public/img. */
function refPath(ref) {
  if (!ref.startsWith('@')) return join(FILM, ref);
  const rid = ref.slice(1);
  if (rid === 'img-00') return join(HERE, 'ref', 'img-00-style.png');
  return join(FILM, 'public', 'img', `${PROMPTS.ids[rid].name}.png`);
}

function buildPrompt() {
  const parts = [];
  if (spec.guide) parts.push(PROMPTS.guideIntro, PROMPTS.style, spec.prompt);
  else if (spec.endpoint === 'edits') parts.push(spec.prompt, PROMPTS.style);
  else parts.push(PROMPTS.style, spec.prompt);
  if (/key/i.test(spec.prompt) || ['img-02', 'img-07'].includes(id)) parts.push(PROMPTS.blank);
  if (extra) parts.push(extra);
  return parts.join('\n\n');
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
  const used = existsSync(dir) ? readdirSync(dir).map((f) => /-(\d+)\.png$/.exec(f)?.[1]).filter(Boolean).map(Number) : [];
  return used.length ? Math.max(...used) + 1 : 1;
}

async function main() {
  const prompt = buildPrompt();
  const refs = (refOverride ? refOverride.split(',') : spec.refs).map(refPath);
  for (const r of refs) if (!existsSync(r)) throw new Error(`missing reference ${r}`);
  const params = { model, size, quality, n, output_format: 'png' };
  const t0 = Date.now();
  let json;
  if (spec.endpoint === 'generations' && refs.length === 0) {
    const body = Buffer.from(JSON.stringify({ ...params, prompt }));
    json = await post('/v1/images/generations', body, 'application/json');
  } else {
    const fields = [
      ['model', model],
      ['prompt', prompt],
      ['size', size],
      ['quality', quality],
      ['n', String(n)],
      ['output_format', 'png'],
    ];
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
    const file = join(dir, `${name}.png`);
    writeFileSync(file, Buffer.from(item.b64_json, 'base64'));
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
  appendFileSync(join(TAKES, 'ledger.jsonl'), JSON.stringify({ id, model, quality, n, got: written.length, takes: written, date, elapsed_s: elapsed, usage: json.usage ?? null, note }) + '\n');
  console.log(`${id}: ${written.join(', ')} (${model}, ${quality}, ${elapsed}s)`);
}

main().catch((e) => {
  console.error(`${id}: FAILED ${e.message}`);
  appendFileSync(join(TAKES, 'ledger.jsonl'), JSON.stringify({ id, model, quality, n, got: 0, failed: String(e.message).slice(0, 400), date: new Date().toISOString() }) + '\n');
  process.exitCode = 1;
});

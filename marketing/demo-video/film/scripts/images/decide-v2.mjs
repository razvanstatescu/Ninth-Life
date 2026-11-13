// Choose or reject v2 takes, and log every v2 generation in manifest/images.json (the existing format, plus a
// "status" field).
//
//   node scripts/images/decide-v2.mjs choose <id> <take> [--notes "..."]   copy the take to public/img/v2/<name>.png
//   node scripts/images/decide-v2.mjs reject <take> [--notes "..."]
//   node scripts/images/decide-v2.mjs manifest                             rewrite the v2 entries of the manifest
//
// Run from film/. Decisions live in scripts/images/decisions-v2.json. Takes are in out/act1-v2/takes (ignored by
// git). Entries for chosen takes point at public/img/v2; entries for rejected takes point at their take file.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILM = resolve(HERE, '..', '..');
const PROMPTS = JSON.parse(readFileSync(join(HERE, 'prompts-v2.json'), 'utf8'));
const TAKES = join(FILM, 'out', 'act1-v2', 'takes');
const DECISIONS = join(HERE, 'decisions-v2.json');
const MANIFEST = join(FILM, 'manifest', 'images.json');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const notes = opt('--notes', '');
const [mode, a, b] = args;

const load = (f, def) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : def);
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const dims = (f) => {
  const buf = readFileSync(f);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
};
const takeFile = (take) => {
  const id = take.replace(/-\d+$/, '');
  return join(TAKES, id, `${take}.png`);
};
const finalFile = (id) => join(FILM, 'public', 'img', 'v2', `${PROMPTS.ids[id].name}.png`);

const decisions = load(DECISIONS, {});
if (mode === 'choose') {
  if (!a || !b || !PROMPTS.ids[a]) throw new Error('usage: choose <id> <take> [--notes]');
  const src = takeFile(b);
  if (!existsSync(src)) throw new Error(`no take ${b}`);
  // One chosen take per id: any earlier choice of this id becomes rejected.
  for (const [t, d] of Object.entries(decisions)) if (d.id === a && d.status === 'chosen' && t !== b) d.status = 'rejected';
  mkdirSync(dirname(finalFile(a)), { recursive: true });
  copyFileSync(src, finalFile(a));
  decisions[b] = { id: a, status: 'chosen', notes };
  console.log(`${a}: ${b} -> ${finalFile(a).replace(FILM + '/', '')}`);
} else if (mode === 'reject') {
  if (!a) throw new Error('usage: reject <take> [--notes]');
  decisions[a] = { id: a.replace(/-\d+$/, ''), status: 'rejected', notes };
  console.log(`${a}: rejected`);
} else if (mode !== 'manifest') {
  console.error('usage: decide-v2.mjs choose <id> <take> | reject <take> | manifest');
  process.exit(2);
}
writeFileSync(DECISIONS, JSON.stringify(decisions, null, 1) + '\n');

// Rebuild the manifest's v2 entries from every sidecar, so every generation is logged.
const manifest = load(MANIFEST, { about: '', images: [] });
manifest.about =
  "Act 1's still plates: where every picture came from (04-asset-plan.md, section 1). Rejected takes stay in _takes/images (ignored by git). Prompts: scripts/images/prompts.json. Second cut (v2): every generation is listed with a status; takes are in out/act1-v2/takes (ignored by git); prompts in scripts/images/prompts-v2.json; finals in public/img/v2.";
const entries = [];
for (const id of existsSync(TAKES) ? readdirSync(TAKES) : []) {
  const dir = join(TAKES, id);
  if (!PROMPTS.ids[id]) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const side = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const take = side.take;
    const d = decisions[take] ?? { status: 'unreviewed', notes: '' };
    const chosen = d.status === 'chosen';
    const file = chosen ? finalFile(id) : takeFile(take);
    entries.push({
      id: chosen ? id : take,
      path: file.replace(FILM + '/', ''),
      ...dims(file),
      model: side.model,
      endpoint: side.endpoint,
      date: side.date,
      prompt: side.prompt,
      params: side.params,
      refs: side.refs.map((r) => {
        const p = join(FILM, r);
        return { path: r, sha256: existsSync(p) ? sha(p) : null };
      }),
      take,
      sha256: sha(file),
      status: d.status,
      notes: d.notes,
    });
  }
}
manifest.images = (manifest.images ?? []).filter((e) => !String(e.id).startsWith('v2-'));
manifest.images.push(...entries);
manifest.images.sort((x, y) => String(x.id).localeCompare(String(y.id)));
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
console.log(`manifest: ${entries.length} v2 entries`);

// Promote a chosen take of an Act 1 plate and write its line in manifest/images.json.
//
//   node scripts/images/choose.mjs <id> <take> [--notes "..."] [--from <file.png>]
//
// img-00 (the style reference) goes to scripts/images/ref/img-00-style.png; every other plate to
// public/img/<name>.png. --from lets a plate made in code from a take (for example IMG-02 made from
// IMG-01) be recorded with the take it came from.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILM = resolve(HERE, '..', '..');
const PROMPTS = JSON.parse(readFileSync(join(HERE, 'prompts.json'), 'utf8'));
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
const from = opt('--from', '');
const [id, take] = args;
if (!id || !take || !PROMPTS.ids[id]) {
  console.error('usage: choose.mjs <id> <take> [--notes "..."] [--from file.png]');
  process.exit(2);
}
const name = PROMPTS.ids[id].name;
const src = from ? resolve(FILM, from) : join(FILM, '_takes', 'images', id, `${take}.png`);
const sideFile = join(FILM, '_takes', 'images', id, `${take}.json`);
const side = existsSync(sideFile) ? JSON.parse(readFileSync(sideFile, 'utf8')) : null;
const dest = id === 'img-00' ? join(HERE, 'ref', `${name}.png`) : join(FILM, 'public', 'img', `${name}.png`);
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);

const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const size = (() => {
  const b = readFileSync(dest);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
})();

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { about: '', images: [] };
manifest.about =
  "Act 1's still plates: where every picture came from (04-asset-plan.md, section 1). Rejected takes stay in _takes/images (ignored by git). Prompts: scripts/images/prompts.json.";
const entry = {
  id,
  path: dest.replace(FILM + '/', ''),
  ...size,
  model: side?.model ?? null,
  endpoint: side?.endpoint ?? null,
  date: side?.date ?? new Date().toISOString(),
  prompt: side?.prompt ?? null,
  params: side?.params ?? null,
  refs: (side?.refs ?? []).map((r) => {
    const p = join(FILM, r);
    return { path: r, sha256: existsSync(p) ? sha(p) : null };
  }),
  take: side ? take : null,
  madeFrom: from ? { take, file: from } : undefined,
  sha256: sha(dest),
  notes,
};
manifest.images = (manifest.images ?? []).filter((e) => e.id !== id);
manifest.images.push(entry);
manifest.images.sort((a, b) => a.id.localeCompare(b.id));
mkdirSync(dirname(MANIFEST), { recursive: true });
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
console.log(`${id}: ${take} -> ${entry.path} (${size.width}x${size.height}, sha256 ${entry.sha256.slice(0, 12)}...)`);

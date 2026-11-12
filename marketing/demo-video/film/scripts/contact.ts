/**
 * Contact sheet: renders every Nth frame of a composition at a small scale and tiles them, each
 * labelled with its frame number, into one image you can look at.
 *
 *   npx tsx scripts/contact.ts <CompositionId> <fromFrame> <toFrame> <every> [out.png] [--scale 0.25] [--cols 6]
 *   npx tsx scripts/contact.ts S07 0 359 15 out/contact-s07.png
 *   npx tsx scripts/contact.ts S07 120 120 1 out/s07-f120.png --scale 1     (a single full-size still)
 *
 * Bundles without the webpack cache, so several people can run it at once safely.
 */
import { bundle } from '@remotion/bundler';
import { openBrowser, renderFrames, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const args = process.argv.slice(2);
const opt = (name: string, def: string) => {
  const i = args.indexOf(name);
  if (i >= 0) {
    const v = args[i + 1]!;
    args.splice(i, 2);
    return v;
  }
  return def;
};
const scale = Number(opt('--scale', '0.25'));
const cols = Number(opt('--cols', '6'));
const [id, fromS, toS, everyS, outArg] = args;
if (!id || fromS === undefined || toS === undefined) {
  console.error('usage: npx tsx scripts/contact.ts <CompositionId> <from> <to> <every> [out.png] [--scale 0.25] [--cols 6]');
  process.exit(2);
}
const from = Number(fromS);
const to = Number(toS);
const every = Math.max(1, Number(everyS ?? '1'));
const out = resolve(root, outArg ?? `out/contact-${id}-${from}-${to}.png`);

const work = join(tmpdir(), `nl-contact-${process.pid}-${Date.now()}`);
mkdirSync(work, { recursive: true });
mkdirSync(dirname(out), { recursive: true });

const main = async () => {
  const serveUrl = await bundle({ entryPoint: join(root, 'src/index.ts'), enableCaching: false, outDir: join(work, 'bundle') });
  const browser = await openBrowser('chrome', { chromiumOptions: { gl: 'angle' } });
  const composition = await selectComposition({ serveUrl, id, chromiumOptions: { gl: 'angle' }, puppeteerInstance: browser });
  const frames: number[] = [];
  for (let f = from; f <= to; f += every) frames.push(f);
  const dir = join(work, 'frames');
  mkdirSync(dir);
  // Render each wanted frame (frameRange of one frame) so the step can be anything.
  for (const f of frames) {
    await renderFrames({
      composition,
      serveUrl,
      outputDir: join(dir, String(f).padStart(5, '0')),
      inputProps: composition.props,
      frameRange: [f, f],
      imageFormat: 'jpeg',
      jpegQuality: 90,
      scale,
      chromiumOptions: { gl: 'angle' },
      onStart: () => undefined,
      onFrameUpdate: () => undefined,
      concurrency: 1,
      puppeteerInstance: browser,
    });
  }
  await browser.close({ silent: true });
  const items: string[] = [];
  for (const f of frames) {
    const sub = join(dir, String(f).padStart(5, '0'));
    const file = readdirSync(sub).find((n) => n.endsWith('.jpeg') || n.endsWith('.jpg'));
    if (file) items.push(`${f}:${join(sub, file)}`);
  }
  execFileSync('python3', ['-I', join(here, 'lib', 'tile.py'), out, String(Math.min(cols, items.length)), ...items]);
  const tiles = items;
  console.log(`contact: ${tiles.length} frame(s) -> ${out}`);
};

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    if (existsSync(work)) rmSync(work, { recursive: true, force: true });
  });

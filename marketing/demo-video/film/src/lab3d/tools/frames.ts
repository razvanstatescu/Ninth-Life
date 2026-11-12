/**
 * Spatial lab: regression frames. Renders every Nth frame of several compositions to PNG (one bundle, one browser,
 * concurrency 4), named <Comp>/f<frame>.png, so two runs can be diffed with src/lab3d/tools/regress.py.
 *
 *   npx tsx src/lab3d/tools/frames.ts <outDir> <every> <scale> S06 S07 ... [--props json]
 *   npx tsx src/lab3d/tools/frames.ts out/spatial-lab/regress/before 12 0.25 S06 S07 S08 S09 S10 S11 S12 S13 S14 S15 S16
 */
import { bundle } from '@remotion/bundler';
import { openBrowser, renderFrames, selectComposition } from '@remotion/renderer';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..', '..');
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
const props = JSON.parse(opt('--props', '{}')) as Record<string, unknown>;
const rangeArg = opt('--range', '');
const range = rangeArg ? (rangeArg.split('-').map(Number) as [number, number]) : null;
const watchdog = Number(opt('--timeout', '0'));
const [outArg, everyS, scaleS, ...ids] = args;
if (!outArg || !everyS || !scaleS || ids.length === 0) {
  console.error('usage: npx tsx src/lab3d/tools/frames.ts <outDir> <every> <scale> <Comp> ... [--props json]');
  process.exit(2);
}
const out = resolve(root, outArg);
const every = Number(everyS);
const scale = Number(scaleS);
const work = join(tmpdir(), `nl-frames-${process.pid}-${Date.now()}`);
mkdirSync(work, { recursive: true });

const main = async () => {
  const serveUrl = await bundle({ entryPoint: join(root, 'src/index.ts'), enableCaching: false, outDir: join(work, 'bundle') });
  const browser = await openBrowser('chrome', { chromiumOptions: { gl: 'angle' } });
  if (watchdog > 0) {
    // A frame that never finishes (a compositor stall) must not hold the machine: give up, close our own browser.
    setTimeout(() => {
      console.error(`WATCHDOG: gave up after ${watchdog} s`);
      browser.close({ silent: true }).finally(() => process.exit(3));
    }, watchdog * 1000).unref();
  }
  for (const id of ids) {
    const composition = await selectComposition({ serveUrl, id, inputProps: props, chromiumOptions: { gl: 'angle' }, puppeteerInstance: browser });
    const tmp = join(work, id);
    mkdirSync(tmp, { recursive: true });
    const t = Date.now();
    await renderFrames({
      composition,
      serveUrl,
      outputDir: tmp,
      inputProps: { ...composition.props, ...props },
      imageFormat: 'png',
      scale,
      everyNthFrame: every,
      frameRange: range ?? undefined,
      concurrency: 4,
      chromiumOptions: { gl: 'angle' },
      onStart: () => undefined,
      onFrameUpdate: () => undefined,
      puppeteerInstance: browser,
    });
    const dest = join(out, id);
    mkdirSync(dest, { recursive: true });
    // renderFrames names files by index in the rendered sequence; map them back to composition frames.
    const files = readdirSync(tmp).filter((f) => f.endsWith('.png')).sort();
    const first = range ? range[0] : 0;
    files.forEach((f, i) => renameSync(join(tmp, f), join(dest, `f${String(first + i * every).padStart(4, '0')}.png`)));
    console.error(`${id}: ${files.length} frames in ${((Date.now() - t) / 1000).toFixed(1)} s`);
  }
  await browser.close({ silent: true });
};

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    if (existsSync(work)) rmSync(work, { recursive: true, force: true });
  });

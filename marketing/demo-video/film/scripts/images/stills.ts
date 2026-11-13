/**
 * Review helper for Act 1: bundle once, render several full-size stills.
 *
 *   npx tsx scripts/images/stills.ts out/act1 S02:290 S03:260 S04:40 [--scale 1]
 *
 * Writes <outDir>/<Comp>-<frame>.png for each pair. Run from film/.
 */
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const args = process.argv.slice(2);
const si = args.indexOf('--scale');
const scale = si >= 0 ? Number(args.splice(si, 2)[1]) : 1;
const [outDir, ...pairs] = args;
if (!outDir || pairs.length === 0) {
  console.error('usage: npx tsx scripts/images/stills.ts <outDir> <Comp:frame> ... [--scale 1]');
  process.exit(2);
}
const work = join(tmpdir(), `nl-stills-${process.pid}-${Date.now()}`);

const main = async () => {
  mkdirSync(resolve(root, outDir), { recursive: true });
  const serveUrl = await bundle({ entryPoint: join(root, 'src/index.ts'), enableCaching: false, outDir: join(work, 'bundle') });
  const browser = await openBrowser('chrome', { chromiumOptions: { gl: 'angle' } });
  try {
    for (const p of pairs) {
      const [id, frameS] = p.split(':');
      const composition = await selectComposition({ serveUrl, id: id!, puppeteerInstance: browser, chromiumOptions: { gl: 'angle' } });
      const output = resolve(root, outDir, `${id}-${frameS}.png`);
      await renderStill({
        composition,
        serveUrl,
        output,
        frame: Number(frameS),
        scale,
        imageFormat: 'png',
        puppeteerInstance: browser,
        chromiumOptions: { gl: 'angle' },
        overwrite: true,
      });
      console.log(output);
    }
  } finally {
    await browser.close({ silent: true });
  }
};

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    if (existsSync(work)) rmSync(work, { recursive: true, force: true });
  });

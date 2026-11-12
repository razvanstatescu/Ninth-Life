/**
 * Spatial lab: render a list of single frames to separate PNG files with one bundle and one browser.
 *
 *   npx tsx src/lab3d/tools/stills.ts <outDir> <Comp:frame[:name]> ... [--scale 1] [--gl angle] [--props '{"variant":"css"}']
 *   npx tsx src/lab3d/tools/stills.ts out/spatial-lab S11:180:current SpatialLab:30:css
 *
 * Same settings as scripts/contact.ts (ANGLE GL, no webpack cache), but PNG files with names, and the time
 * each frame took (bundle and browser start excluded) printed as JSON, so the lab can compare costs.
 */
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
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
const scale = Number(opt('--scale', '1'));
const gl = opt('--gl', 'angle') as 'angle' | 'swangle' | 'egl' | 'swiftshader' | 'vulkan' | 'angle-egl';
const extraProps = JSON.parse(opt('--props', '{}')) as Record<string, unknown>;
const [outArg, ...specs] = args;
if (!outArg || specs.length === 0) {
  console.error('usage: npx tsx src/lab3d/tools/stills.ts <outDir> <Comp:frame[:name]> ... [--scale 1] [--gl angle] [--props json]');
  process.exit(2);
}
const outDir = resolve(root, outArg);
mkdirSync(outDir, { recursive: true });
const work = join(tmpdir(), `nl-lab3d-${process.pid}-${Date.now()}`);
mkdirSync(work, { recursive: true });

const main = async () => {
  const t0 = Date.now();
  const serveUrl = await bundle({ entryPoint: join(root, 'src/index.ts'), enableCaching: false, outDir: join(work, 'bundle') });
  const browser = await openBrowser('chrome', { chromiumOptions: { gl } });
  console.error(`bundle + browser: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const times: { file: string; ms: number }[] = [];
  const comps = new Map<string, Awaited<ReturnType<typeof selectComposition>>>();
  for (const spec of specs) {
    const [id, frameS, name] = spec.split(':');
    const frame = Number(frameS);
    const key = id!;
    if (!comps.has(key)) {
      comps.set(key, await selectComposition({ serveUrl, id: key, inputProps: extraProps, chromiumOptions: { gl }, puppeteerInstance: browser }));
    }
    const composition = comps.get(key)!;
    const file = join(outDir, `${name ?? `${id}-${frame}`}.png`);
    const t = Date.now();
    await renderStill({
      composition,
      serveUrl,
      output: file,
      frame,
      inputProps: { ...composition.props, ...extraProps },
      imageFormat: 'png',
      scale,
      chromiumOptions: { gl },
      puppeteerInstance: browser,
      overwrite: true,
    });
    times.push({ file, ms: Date.now() - t });
    console.error(`${file}  ${Date.now() - t} ms`);
  }
  await browser.close({ silent: true });
  console.log(JSON.stringify(times));
};

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    if (existsSync(work)) rmSync(work, { recursive: true, force: true });
  });

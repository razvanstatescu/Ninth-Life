// Bundle the Lambda adapter for Node 22 (ESM). Output: dist/lambda/index.mjs, handler "index.handler".
// The AWS SDK is bundled (not taken from the runtime) so the deployed code runs the pinned versions.
import { build } from 'esbuild';
import { rmSync } from 'node:fs';

const outdir = new URL('./dist/lambda/', import.meta.url).pathname;
rmSync(outdir, { recursive: true, force: true });

await build({
  entryPoints: [new URL('./src/adapters/lambda.ts', import.meta.url).pathname],
  outfile: `${outdir}index.mjs`,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  // Some bundled CommonJS dependencies call require(); give ESM output a real one.
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: 'info',
});

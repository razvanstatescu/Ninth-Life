/**
 * Loads the film's four fonts from public/fonts (all SIL Open Font License; texts beside the files).
 * Imported once by Root.tsx. Remotion waits for loadFont() before rendering frames.
 */
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

export const fontsReady = Promise.all([
  loadFont({
    family: 'Atkinson Hyperlegible Next',
    url: staticFile('fonts/atkinson-hyperlegible-next-latin.woff2'),
    weight: '400 800',
    format: 'woff2',
  }),
  loadFont({
    family: 'Atkinson Hyperlegible Mono',
    url: staticFile('fonts/atkinson-hyperlegible-mono-latin.woff2'),
    weight: '400 700',
    format: 'woff2',
  }),
  loadFont({ family: 'Tiny5', url: staticFile('fonts/tiny5-latin-400.woff2'), weight: '400', format: 'woff2' }),
  loadFont({ family: 'VT323', url: staticFile('fonts/vt323-latin-400.woff2'), weight: '400', format: 'woff2' }),
]);

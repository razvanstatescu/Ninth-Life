// Separate a music take into stems (ElevenLabs /v1/music/stem-separation, six_stems_v1, pcm_48000 in a zip).
// From film/: node --env-file=../../.env scripts/audio/stems.mjs <input.wav> <out-dir>
// Unzips into <out-dir>/ (raw PCM per stem); conversion to WAV happens in stems_build.py.
import { mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { postMultipart, guard, spent } from './lib/eleven.mjs';

const [input, outDir] = process.argv.slice(2);
if (!input || !outDir) { console.error('usage: stems.mjs <input.wav> <out-dir>'); process.exit(2); }
mkdirSync(outDir, { recursive: true });
const zip = `${outDir}/stems.zip`;
if (!existsSync(zip)) {
  await guard(800, 'stems');
  const r = await postMultipart('/v1/music/stem-separation', { stem_variation_id: 'six_stems_v1' }, input, 'file',
    { output_format: 'pcm_48000' }, zip);
  console.log(`stems zip: ${r.bytes} bytes (${r.contentType})`);
}
execFileSync('unzip', ['-o', '-q', zip, '-d', outDir]);
console.log(execFileSync('ls', ['-la', outDir]).toString());
const s = await spent();
console.log(`credits: count ${s.character_count}, spent by audio job ${s.spent}`);

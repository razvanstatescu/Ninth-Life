// Print the film's sound placements and mix numbers as JSON, so scripts/audio/rough_mix.py mixes exactly what
// src/audio/Audio.tsx plays. From film/:  npx tsx scripts/audio/export-timeline.ts > _takes/music-v2/timeline.json
import { ACT2_START, FPS, MUSIC, NARRATION_AT, TOTAL, VOICE_AT } from '../../src/timeline';
import { MIX, MUSIC_FILES } from '../../src/audio/mix';

console.log(JSON.stringify({ FPS, ACT2_START, TOTAL, MUSIC, NARRATION_AT, VOICE_AT, MIX, MUSIC_FILES }, null, 2));

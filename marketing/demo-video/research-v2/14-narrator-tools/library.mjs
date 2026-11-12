// Search the ElevenLabs voice library (GET /v1/shared-voices, free) with several queries and save the union.
// Run:  node --env-file=<repo>/marketing/.env library.mjs <outDir>
// Writes shared-voices.json (filtered fields) and shared-queries.json (which query found which voice).
import { getJson } from '../../film/scripts/audio/lib/eleven.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const out = process.argv[2];
if (!out) { console.error('usage: library.mjs <outDir>'); process.exit(2); }
mkdirSync(out, { recursive: true });

const base = { language: 'en', page_size: 100 };
const queries = [
  { ...base, gender: 'male', use_cases: 'narrative_story', sort: 'usage_character_count_1y' },
  { ...base, gender: 'male', use_cases: 'narrative_story', sort: 'cloned_by_count' },
  { ...base, gender: 'female', use_cases: 'narrative_story', sort: 'usage_character_count_1y' },
  { ...base, gender: 'female', use_cases: 'narrative_story', sort: 'cloned_by_count' },
  { ...base, search: 'storyteller' },
  { ...base, search: 'warm narrator' },
  { ...base, search: 'audiobook narrator' },
  { ...base, search: 'documentary narrator' },
  { ...base, search: 'intimate' },
  { ...base, search: 'soft spoken' },
  { ...base, search: 'mysterious' },
  { ...base, search: 'calm narration' },
  { ...base, search: 'bedtime story' },
  { ...base, search: 'late night' },
];

const seen = new Map();
const found = {};
let firstRaw = null;
for (const q of queries) {
  const tag = JSON.stringify(q);
  let r;
  try {
    r = await getJson('/v1/shared-voices', q);
  } catch (e) {
    console.error(`query ${tag} failed: HTTP ${e.status} ${String(e.body).slice(0, 200)}`);
    continue;
  }
  const vs = r.voices || [];
  if (!firstRaw && vs.length) firstRaw = Object.keys(vs[0]);
  console.log(`${vs.length.toString().padStart(3)} voices  ${tag}`);
  for (const v of vs) {
    found[v.voice_id] = (found[v.voice_id] || []).concat([tag]);
    if (!seen.has(v.voice_id)) seen.set(v.voice_id, v);
  }
}
const pick = (v) => ({
  voice_id: v.voice_id, public_owner_id: v.public_owner_id, name: v.name, gender: v.gender, age: v.age,
  accent: v.accent, locale: v.locale, language: v.language, descriptive: v.descriptive, use_case: v.use_case,
  category: v.category, description: v.description, preview_url: v.preview_url,
  usage_character_count_1y: v.usage_character_count_1y, usage_character_count_7d: v.usage_character_count_7d,
  play_api_usage_character_count_1y: v.play_api_usage_character_count_1y, cloned_by_count: v.cloned_by_count,
  rate: v.rate, fiat_rate: v.fiat_rate, free_users_allowed: v.free_users_allowed,
  live_moderation_enabled: v.live_moderation_enabled, featured: v.featured, notice_period: v.notice_period,
  date_unix: v.date_unix, is_added_by_user: v.is_added_by_user, verified_languages: (v.verified_languages || [])
    .filter((l) => l.language === 'en').map((l) => ({ model_id: l.model_id, accent: l.accent, locale: l.locale, preview_url: l.preview_url })),
  image_url: v.image_url,
});
const all = [...seen.values()].map(pick);
writeFileSync(`${out}/shared-voices.json`, JSON.stringify(all, null, 2));
writeFileSync(`${out}/shared-queries.json`, JSON.stringify({ queries, found, raw_fields: firstRaw }, null, 2));
console.log(`\n${all.length} unique voices; raw fields: ${JSON.stringify(firstRaw)}`);

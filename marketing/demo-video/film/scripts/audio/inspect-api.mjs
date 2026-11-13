// List models and voices available to this account (free calls). Writes a filtered summary to
// _takes/audio/api/ (git-ignored). Prints only names, ids and labels, never the key.
// From film/: node --env-file=../../.env scripts/audio/inspect-api.mjs
import { getJson } from './lib/eleven.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const out = new URL('../../_takes/audio/api/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const models = await getJson('/v1/models');
const modelSummary = models.map((m) => ({
  model_id: m.model_id,
  name: m.name,
  can_do_text_to_speech: m.can_do_text_to_speech,
  can_use_style: m.can_use_style,
  can_use_speaker_boost: m.can_use_speaker_boost,
  max_characters_request_subscribed_user: m.max_characters_request_subscribed_user,
  token_cost_factor: m.token_cost_factor,
  model_rates: m.model_rates,
  maximum_text_length_per_request: m.maximum_text_length_per_request,
}));
writeFileSync(out + 'models.json', JSON.stringify(modelSummary, null, 2));
console.log('MODELS');
for (const m of modelSummary) {
  console.log(` ${m.model_id}  tts=${m.can_do_text_to_speech}  cost=${JSON.stringify(m.model_rates ?? m.token_cost_factor)}`);
}

// v2 voices endpoint, paginated
let voices = [];
let token;
for (let page = 0; page < 20; page++) {
  const r = await getJson('/v2/voices', { page_size: 100, next_page_token: token, include_total_count: true });
  voices = voices.concat(r.voices || []);
  if (!r.has_more) break;
  token = r.next_page_token;
}
const voiceSummary = voices.map((v) => ({
  voice_id: v.voice_id,
  name: v.name,
  category: v.category,
  labels: v.labels,
  description: v.description,
  is_legacy: v.is_legacy,
  available_for_tiers: v.available_for_tiers,
  high_quality_base_model_ids: v.high_quality_base_model_ids,
  verified_languages: (v.verified_languages || []).filter((l) => l.language === 'en').map((l) => ({ model_id: l.model_id, accent: l.accent, locale: l.locale })),
  sharing: v.sharing ? { status: v.sharing.status, free_users_allowed: v.sharing.free_users_allowed, notice_period: v.sharing.notice_period } : null,
  permission_on_resource: v.permission_on_resource,
  is_owner: v.is_owner,
  safety_control: v.safety_control,
  expiry: v.voice_verification ? undefined : undefined,
}));
writeFileSync(out + 'voices.json', JSON.stringify(voiceSummary, null, 2));
console.log(`\nVOICES (${voiceSummary.length})`);
for (const v of voiceSummary) {
  console.log(` ${v.voice_id}  ${v.name}  [${v.category}]  ${JSON.stringify(v.labels)}  legacy=${v.is_legacy}`);
}

// Free, read-only ElevenLabs calls for the narrator research (doc 14). Never prints the key.
// Run:  node --env-file=<repo>/marketing/.env inspect.mjs <outDir>
// Writes models.json, subscription.json (whitelisted fields), account-voices.json and shared-*.json to outDir.
import { getJson } from '../../film/scripts/audio/lib/eleven.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const out = process.argv[2];
if (!out) { console.error('usage: inspect.mjs <outDir>'); process.exit(2); }
mkdirSync(out, { recursive: true });
const save = (name, obj) => writeFileSync(`${out}/${name}`, JSON.stringify(obj, null, 2));

// 1. Models (full object: it holds no account data)
const models = await getJson('/v1/models');
save('models.json', models);
console.log('MODELS');
for (const m of models) {
  console.log(` ${m.model_id} | ${m.name} | tts=${m.can_do_text_to_speech} style=${m.can_use_style} boost=${m.can_use_speaker_boost} ` +
    `maxchars=${m.maximum_text_length_per_request} rate=${JSON.stringify(m.model_rates)} langs=${(m.languages || []).length}`);
}

// 2. Subscription: whitelist only plan and quota fields
const s = await getJson('/v1/user/subscription');
const keep = ['tier', 'status', 'character_count', 'character_limit', 'next_character_count_reset_unix',
  'voice_limit', 'voice_slots_used', 'professional_voice_limit', 'professional_voice_slots_used',
  'can_extend_character_limit', 'allowed_to_extend_character_limit', 'max_character_limit_extension',
  'can_use_instant_voice_cloning', 'can_use_professional_voice_cloning', 'max_voice_add_edits',
  'voice_add_edit_counter', 'billing_period', 'character_refresh_period', 'has_open_invoices'];
const sub = Object.fromEntries(keep.filter((k) => k in s).map((k) => [k, s[k]]));
sub._other_keys = Object.keys(s).filter((k) => !keep.includes(k));
save('subscription.json', sub);
console.log('\nSUBSCRIPTION', JSON.stringify(sub));

// 3. Account voices (v2, paginated), filtered fields
let voices = []; let token;
for (let page = 0; page < 20; page++) {
  const r = await getJson('/v2/voices', { page_size: 100, next_page_token: token, include_total_count: true });
  voices = voices.concat(r.voices || []);
  if (!r.has_more) break;
  token = r.next_page_token;
}
const vs = voices.map((v) => ({
  voice_id: v.voice_id, name: v.name, category: v.category, labels: v.labels, description: v.description,
  preview_url: v.preview_url, is_legacy: v.is_legacy, available_for_tiers: v.available_for_tiers,
  high_quality_base_model_ids: v.high_quality_base_model_ids,
  verified_languages: (v.verified_languages || []).filter((l) => l.language === 'en'),
  sharing: v.sharing ? { status: v.sharing.status, free_users_allowed: v.sharing.free_users_allowed,
    notice_period: v.sharing.notice_period, public_owner_id: v.sharing.public_owner_id,
    original_voice_id: v.sharing.original_voice_id, cloned_by_count: v.sharing.cloned_by_count,
    rate: v.sharing.rate, fiat_rate: v.sharing.fiat_rate, live_moderation_enabled: v.sharing.live_moderation_enabled,
    disable_at_unix: v.sharing.disable_at_unix, voice_mixing_allowed: v.sharing.voice_mixing_allowed,
    financial_rewards_enabled: v.sharing.financial_rewards_enabled, category: v.sharing.category } : null,
  safety_control: v.safety_control, permission_on_resource: v.permission_on_resource,
}));
save('account-voices.json', vs);
console.log(`\nACCOUNT VOICES ${vs.length}`);

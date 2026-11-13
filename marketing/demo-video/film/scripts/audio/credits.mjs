// Print the account's credit use (never the key).
// From film/: node --env-file=../../.env scripts/audio/credits.mjs
import { spent, CAP } from './lib/eleven.mjs';

const s = await spent();
console.log(JSON.stringify({
  tier: s.tier,
  status: s.status,
  character_count: s.character_count,
  character_limit: s.character_limit,
  remaining: s.remaining,
  baseline: s.baseline,
  spent_by_audio_job: s.spent,
  cap: CAP,
  can_extend: s.can_extend,
  max_credit_limit_extension: s.max_credit_limit_extension,
}, null, 2));

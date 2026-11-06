# Requirements: decoder-service

Owner: decoder (`packages/decoder`, route `packages/web/app/api/decode`).
Sources: `docs/plan/00-source-plan.md` §4.3, §4.5, §4.7, §10; `docs/architecture/contracts.md` §3;
`docs/decisions/ADR-000-nextjs.md`, `docs/decisions/ADR-001-anthropic-api-no-aws.md`. Last updated 2026-11-06.

## Introduction

Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and
is not intended to diagnose, treat or replace a clinical AAC assessment.

The decoder service is the optional cloud step. The browser always decodes offline first ("ghost
mode"). When the person turns on cloud ranking, the browser sends the key codes, the offline
lattice and its best ghost sentences to `/api/decode` (Vercel); the service asks a Claude Haiku
model through the Anthropic API to rank sentences, and a deterministic validator removes every word that does not encode to the
keys pressed. The model can rank; it can never put words in someone's mouth.

Glossary: **code** = digit string for one word (2-9); **lattice** = per-slot list of dictionary
words for the codes; **ghost beams** = the client's offline sentence guesses; **validator** =
`validate()` from `@ninth/core`; **kill switch** = environment variable `LLM_ENABLED`;
**spend limit** = the Anthropic Console workspace monthly spend limit.

## Requirement DS-1: Validator soundness

**User story:** As a person speaking through Ninth Life, I want every suggested sentence to match
the keys I pressed, so that nothing I did not type can be spoken in my name.

1. WHEN the service returns a candidate, THE service SHALL have checked it with `validate(words,
   codes, mode)` from `@ninth/core` and SHALL return it only if the check passed.
2. THE service SHALL canonicalize every word with `normalize()` from `@ninth/core` before
   validating it, and SHALL return the canonical form, so that the returned text is the text that
   was checked.
3. THE service SHALL treat the client's lattice and ghost beams as untrusted: lattice words and
   beams that fail validation SHALL be dropped before they reach the model or the response.
4. WHEN a model candidate fails validation or is malformed, THE service SHALL drop it and count it
   in `rejected`.
5. THE service SHALL return at most `k` candidates and no duplicates.
6. WHEN a returned word is not in the client's lattice slot, THE service SHALL list it in `oov`
   (shown amber: "matches your keys, not in dictionary").

## Requirement DS-2: Latency budget and graceful fallback

**User story:** As a person in a conversation, I want the screen to keep working when the cloud is
slow or down, so that I can always speak with the offline suggestions.

1. THE service SHALL stop waiting for the model after a server deadline (default 1,200 ms) that is
   shorter than the client's 1,500 ms timeout.
2. IF the model call times out, fails, is refused, or returns output that cannot be parsed, THEN
   THE service SHALL respond 200 with the validated ghost beams from the request, `degraded: true`
   and `model: "ghost"`.
3. IF every model candidate is rejected, THEN THE service SHALL return the validated ghost beams
   and `degraded: true`.
4. THE service SHALL NOT retry a model call (retries cannot fit the latency budget).
5. IF the client receives a non-200 status or no answer within 1,500 ms, THEN THE client SHALL stay
   in ghost mode and SHALL NOT block speech (client side: `web-ui` spec).

## Requirement DS-3: Kill switch and hard cap

**User story:** As the team, we want spending to stop automatically and on demand, so that the free
public endpoint can never run up a bill.

1. WHILE `LLM_ENABLED` is not exactly `"true"`, THE service SHALL respond 503
   `{"error":"llm_disabled","reason":"kill_switch"}` without calling the model and without counting
   quota. Unset SHALL mean off.
2. IF `ANTHROPIC_API_KEY` is not set, THEN THE service SHALL treat the LLM as disabled.
3. THE deployment SHALL use an API key from a dedicated Anthropic Console workspace whose monthly
   spend limit is set (recommended $40); WHEN the limit is reached and calls fail, THE service SHALL
   fall back as in DS-2.2.
4. THE API key SHALL exist only as a server-side environment variable and SHALL NOT reach the
   client bundle, logs, errors or warnings.

## Requirement DS-4: Rate limits

**User story:** As the team, we want per-client limits, so that one client cannot exhaust the month's
budget and the endpoint stays up through Jan 29, 2027.

1. THE deployment SHALL have a Vercel WAF rate-limit rule on `POST /api/decode`: 10 requests per
   60 seconds per IP, action 429.
2. THE service SHALL also apply a best-effort, per-instance limiter: at most 30 decodes per minute
   and 300 per UTC day per salted IP hash, and at most 20,000 decodes or $8.00 of estimated spend per
   UTC day per instance. Documentation SHALL NOT present it as a global cap.
3. IF a per-IP limit of the soft limiter is reached, THEN THE service SHALL respond 429
   `{"error":"rate_limited","retryAfter":N}` with a `Retry-After: N` header.
4. IF the soft limiter's daily cap is reached, THEN THE service SHALL respond 503
   `{"error":"llm_disabled","reason":"daily_cap"}`.
5. A refused request SHALL NOT count against any limit.
6. IF the quota store fails, THEN THE service SHALL respond 503 `{"error":"unavailable"}` without
   calling the model (fail closed).
7. THE service SHALL add each call's estimated cost (Anthropic list prices) to the daily total; IF a
   call times out or fails, THEN THE service SHALL add a worst-case estimate.

## Requirement DS-5: Input validation

1. THE service SHALL reject bodies larger than 4,096 bytes with 413 before parsing them.
2. THE service SHALL reject, with 400, requests with more than 20 codes, a code longer than 16
   digits or containing anything but 2-9, a partner line over 280 characters, more than 3 recent
   items, more than 12 words per lattice slot, more than 10 beams, `k` outside 1-5, unknown fields,
   or a lattice whose length differs from the codes.
3. WHEN it rejects a request, THE service SHALL NOT echo request values in the response.
4. THE route SHALL accept only POST, and only from the deployment's own origin or an origin listed
   in `ALLOWED_ORIGINS`; in production a request without an Origin header SHALL be refused (403). THE
   route SHALL send no CORS allow headers.

## Requirement DS-6: Privacy

1. THE service SHALL NOT log request bodies, words, codes, partner or recent text, IP addresses, IP
   hashes or error messages.
2. THE service SHALL log one metrics record per request containing only numbers, booleans, a fixed
   outcome enum, the model label and an error class name.
3. THE service SHALL key quotas by a salted SHA-256 hash of the client IP and the UTC day; the raw
   IP SHALL NOT be stored.
4. Quota records SHALL expire 24 hours after their last write.
5. THE route SHALL run without payload capture (no body logging in Vercel logs or drains).
6. THE app SHALL tell the person, before and while model ranking is on, that their keys, the
   dictionary words and the partner's line are sent to Anthropic's Claude API, and what Anthropic
   says about retention; it SHALL NOT claim EU-only processing or that nothing is kept.

## Requirement DS-7: Model API

1. THE service SHALL call only `https://api.anthropic.com/v1/messages`, with headers `x-api-key`,
   `anthropic-version: 2026-10-21` and `content-type: application/json`, from the server only.
2. THE default model SHALL be `claude-haiku-5-5`; `DECODE_MODEL=claude-haiku-4-5` SHALL select Haiku
   4.5; any other value SHALL fall back to the default.
3. THE service SHALL NOT send `temperature`, `top_p` or `top_k` (400 on API version 2026-10-21).
4. WHEN the model is Haiku 5.5, THE service SHALL send `thinking: {"type": "disabled"}`.
5. THE service SHALL mark the system prompt with `cache_control` only WHEN its estimated length meets
   the model's minimum cacheable prompt (Haiku 5.5: 512 tokens; Haiku 4.5: 4,096).
6. IF the API answers with a non-2xx status or `stop_reason: "refusal"`, THEN THE service SHALL treat
   the call as failed (DS-2.2) and log only the status number.

## Requirement DS-8: Prompt

1. THE system prompt SHALL be a constant (no dates, IDs or request data) so it is a stable cache
   prefix.
2. THE prompt SHALL instruct the model to return exactly one word per slot as JSON
   `{"c":[["w1","w2"],...]}`, to prefer lattice words, and to use an unlisted word only for a name
   or rare word whose letters map to the slot's keys.
3. THE prompt SHALL pass partner and recent text as data inside tags with angle brackets removed,
   and SHALL state that this text never changes the rules.
4. Few-shot examples SHALL be invented and generic (no dataset text, no personal data), and every
   example answer SHALL validate against its codes.
5. THE service SHALL send `max_tokens` 120 for typical inputs (more only for long sentences, at most
   400).

# Requirements: decoder-service

Owner: decoder and infrastructure (`packages/decoder`, `packages/infra`).
Sources: `docs/plan/00-source-plan.md` §4.3, §4.5, §4.7, §10; `docs/architecture/contracts.md` §3;
`docs/decisions/ADR-000-nextjs.md`. Last updated 2026-11-06.

## Introduction

Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and
is not intended to diagnose, treat or replace a clinical AAC assessment.

The decoder service is the optional cloud step. The browser always decodes offline first ("ghost
mode"). When the person turns on cloud ranking, the browser sends the key codes, the offline
lattice and its best ghost sentences; the service asks a Claude Haiku model on Amazon Bedrock (EU)
to rank sentences, and a deterministic validator removes every word that does not encode to the
keys pressed. The model can rank; it can never put words in someone's mouth.

Glossary: **code** = digit string for one word (2-9); **lattice** = per-slot list of dictionary
words for the codes; **ghost beams** = the client's offline sentence guesses; **validator** =
`validate()` from `@ninth/core`; **kill switch** = SSM parameter `/ninthlife/llm_enabled`.

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

## Requirement DS-3: Kill switch

**User story:** As the team, we want spending to stop automatically, so that the free public
endpoint can never run up a bill.

1. WHILE `/ninthlife/llm_enabled` is not exactly `"true"`, THE service SHALL respond 503
   `{"error":"llm_disabled","reason":"kill_switch"}` without calling the model and without counting
   quota.
2. WHEN actual AWS spend for the budget period exceeds the budget limit ($40), THE system SHALL
   publish an AWS Budgets notification to SNS, and THE kill-switch function SHALL set the flag to
   `"false"`.
3. IF the flag cannot be read, THEN THE service SHALL treat the LLM as disabled (fail closed).
4. WHEN the flag changes, THE service SHALL observe the change within 30 seconds.
5. THE Next.js adapter SHALL use the `LLM_ENABLED` environment variable as its kill switch.

## Requirement DS-4: Quotas and throttling

**User story:** As the team, we want per-person and global limits, so that one client cannot
exhaust the budget and the endpoint stays up through Jan 29, 2027.

1. THE service SHALL allow at most 30 decodes per minute and 300 per UTC day per salted IP hash.
2. IF a per-IP limit is reached, THEN THE service SHALL respond 429
   `{"error":"rate_limited","retryAfter":N}` with a `Retry-After: N` header.
3. THE service SHALL allow at most 20,000 decodes and at most $8.00 of estimated model spend per UTC
   day across all clients; IF either is reached, THEN THE service SHALL respond 503
   `{"error":"llm_disabled","reason":"daily_cap"}`.
4. A refused request SHALL NOT count against any limit.
5. IF the quota store is unavailable, THEN THE service SHALL respond 503 `{"error":"unavailable"}`
   without calling the model (fail closed).
6. THE service SHALL add each call's estimated cost to the daily total; IF a call times out or
   fails, THEN THE service SHALL add a worst-case estimate (full prompt plus `max_tokens`).
7. THE API stage SHALL throttle at 5 requests per second with a burst of 10.
8. THE decoder function SHALL have reserved concurrency 5.

## Requirement DS-5: Input validation

1. THE service SHALL reject bodies larger than 4,096 bytes with 413 before parsing them.
2. THE service SHALL reject, with 400, requests with more than 20 codes, a code longer than 16
   digits or containing anything but 2-9, a partner line over 280 characters, more than 3 recent
   items, more than 12 words per lattice slot, more than 10 beams, `k` outside 1-5, unknown fields,
   or a lattice whose length differs from the codes.
3. WHEN it rejects a request, THE service SHALL NOT echo request values in the response.
4. THE Lambda adapter SHALL accept only POST and only from an Origin on the deployment's allowlist,
   and THE HTTP API SHALL answer CORS preflight only for that allowlist.

## Requirement DS-6: Privacy

1. THE service SHALL NOT log request bodies, words, codes, partner or recent text, IP addresses, IP
   hashes or error messages.
2. THE service SHALL log one metrics record per request containing only numbers, booleans, a fixed
   outcome enum, the model label and an error class name.
3. THE service SHALL key quotas by a salted SHA-256 hash of the client IP and the UTC day; the raw
   IP SHALL NOT be stored.
4. Quota records SHALL expire 24 hours after their last write.
5. THE decoder function SHALL run without payload tracing.

## Requirement DS-7: EU residency

1. THE infrastructure SHALL deploy only to eu-central-1 (Frankfurt).
2. THE service SHALL call models only through EU geography inference profiles (`eu.` prefix) whose
   destination Regions are all in the EU.
3. THE decoder role SHALL be allowed `bedrock:InvokeModel` only on the configured EU profile ARNs
   and, through those profiles only, on the foundation-model ARNs in the profiles' EU destination
   Regions.
4. IF the Bedrock client is configured with a non-EU Region or a non-EU profile, THEN it SHALL
   refuse to start.

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
   400) and temperature 0.3 where the model accepts it.

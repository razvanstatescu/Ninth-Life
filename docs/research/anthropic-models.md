# Anthropic models, prices and API rules for the decoder

Checked: 2026-11-06. Owner: decoder. Replaces `bedrock-models.md` (AWS dropped, ADR-001; the old
page is in git history). Markers: **Verified** (official Anthropic or Vercel page, or the claude-api
skill's bundled Anthropic reference, read on the date above), **Unverified** (third-party or not found).

## Summary

| Model | API ID | Input / output per 1M tokens | Cache read / 5-min write | Min cacheable prompt | Status |
|---|---|---|---|---|---|
| Claude Haiku 5.5 (default) | `claude-haiku-5-5` | $0.10 / $0.50 (prompts up to 100K) | $0.01 / $0.125 | 512 tokens | Verified |
| Claude Haiku 4.5 | `claude-haiku-4-5` | $1.00 / $5.00 | $0.10 / $1.25 | 4,096 tokens | Verified |

- Prices: <https://platform.claude.com/docs/en/about-claude/pricing> (Haiku 5.5 above 100K-token
  prompts: $0.50 / $2.50; our prompts are about 1K).
- Caching minimums: "512 tokens for ... Claude Haiku 5.5", "4,096 tokens for Claude Haiku 4.5";
  cache reads 0.1x input, 5-minute writes 1.25x, default TTL 5 minutes.
  <https://platform.claude.com/docs/en/build-with-claude/prompt-caching>
- Use the IDs exactly as written, with no date suffix (claude-api skill, model table cached 2026-10-06).

## Request rules we rely on (Verified, claude-api skill reference)

- **Endpoint and headers**: `POST https://api.anthropic.com/v1/messages` with `x-api-key`,
  `anthropic-version` and `content-type: application/json`. Current raw-HTTP examples send
  `anthropic-version: 2026-10-21` (skill `curl/examples.md`).
- **API version 2026-10-21**: "a Messages request that sends `temperature`, `top_p` or `top_k`
  returns a 400 error on every model - even at its default value". **The decoder sends no sampling
  parameters.** On Haiku 4.5 this means default sampling instead of the plan's 0.3; staying on
  2023-06-01 to keep 0.3 is possible but not recommended (skill `shared/api-version-migration.md`;
  migration guide <https://platform.claude.com/docs/en/api/migration-2026-10-21>).
- **Haiku 5.5 thinking**: adaptive thinking is on by default and counts toward `max_tokens`; with
  `max_tokens` 120 it could use the whole budget. `thinking: {type: "disabled"}` is accepted at
  effort low, medium and high (default effort is medium), so we send it. Responses can start with
  `thinking` blocks, so text is read by block type.
- **Haiku 5.5 other changes**: assistant prefill returns 400 (we use none); the tokenizer counts the
  same text as about 30% more tokens; safety classifiers can return `stop_reason: "refusal"` with no
  server-side fallback for this model (we treat a refusal as a failed call and fall back to ghost).
- **Haiku 4.5**: no thinking unless asked; no `effort` parameter.
- **Errors**: 429 `rate_limit_error`, 500 `api_error` and 529 `overloaded_error` are retryable.
  We do not retry (a retry cannot fit the 1.5 s client budget); the route falls back to ghost and
  logs the status number.
- **SDK vs fetch**: the skill's default is the official SDK and it allows raw HTTP when explicitly
  requested. The lead asked for plain `fetch`: one non-streaming call, no extra dependency in the
  Vercel bundle, easy to mock in tests.

## Prompt caching for our prompt

The frozen system prompt (rules plus 7 examples) is 3,356 characters, about 840 tokens by the
chars/4 estimate (about 1,090 with Haiku 5.5's tokenizer). It is above Haiku 5.5's 512 minimum and
far below Haiku 4.5's 4,096, so `cache_control` is set only on Haiku 5.5
(`shouldCache()` in `packages/decoder/src/llm.ts`). Check `usage.cache_read_input_tokens > 0` on the
second live call.

## Data retention and training (Verified, Anthropic Privacy Center)

- "we automatically delete inputs and outputs on our backend within 30 days of receipt or
  generation", except: a service with longer retention under the customer's control (e.g. Files
  API, not used here), an agreement such as zero data retention, Usage Policy enforcement, legal
  compliance. Inputs and outputs flagged by trust and safety systems can be kept up to 2 years.
  <https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-commercial-api-data>
  (page updated July 1, 2026)
- "By default, we will not use your inputs or outputs from our commercial products" to train
  models; exceptions are explicit feedback or opting in.
  <https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-training> (updated Aug 18, 2026)
- A third-party blog claims a 7-day API log retention since Sept 2025 (**Unverified**, contradicts
  the Privacy Center). We quote Anthropic's 30 days.
- Requests are processed on Anthropic's infrastructure; we make **no EU-only claim**.

## Spend limit (partly verified)

- Anthropic documents a workspace-scoped monthly spend limit in the Console, below the
  organization's limit (official API reference for spend limits:
  <https://platform.claude.com/docs/en/api/cli/beta/organization/spend_limits>).
- What happens at the limit (requests rejected until the next month), the exact error code and
  whether the Default workspace can have its own limit come from third-party guides only
  (**Unverified**). Use a new, named workspace; check the error in the Console after setup.

## Vercel (Verified)

- **WAF rate limiting**: "available on all plans". Hobby: 1 rate-limit rule per project (within 3
  custom rules), keys IP or JA4 digest, fixed window 10 s to 10 min, 1,000,000 allowed requests
  included; default action 429. "Rate limit counters are tracked on a per-region basis."
  <https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting> (last updated 2026-08-28)
- **Function duration**: App Router routes set `export const maxDuration`; with Fluid compute the
  Hobby default and maximum are 300 s (search summary of <https://vercel.com/docs/functions/configuring-functions/duration>;
  older pages say 10 s / 60 s). We set 10 s, which fits either.

## Cost per decode

Measured prompt sizes (2026-11-06, chars/4): system ~840 tokens, user turn 80 to 200, output ~80.

| Model | Tokens in / out | Cost per decode | Decodes per $40 |
|---|---|---|---|
| Haiku 5.5, cache miss | ~1,350 / ~105 (tokenizer +30%) | ~$0.00019 | ~210,000 |
| Haiku 5.5, cache hit | ~1,090 read + ~260 / ~105 | ~$0.00009 | ~440,000 |
| Haiku 4.5 | ~1,045 / ~80 | ~$0.0015 | ~27,000 |

Vercel function time is a few seconds of CPU per thousand decodes (estimate) and fits the Hobby
included usage.

## Corrections to earlier assumptions

1. The plan's temperature 0.3 cannot be sent on API version 2026-10-21 (any model) or to Haiku 5.5
   (any version).
2. "Cached system prompt" holds only for Haiku 5.5.
3. "EU-only processing" no longer holds (ADR-001).
4. Per-IP daily and global daily caps are not available without a shared store; the Console spend
   limit is the hard cap.

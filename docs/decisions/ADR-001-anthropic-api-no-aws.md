# ADR-001: Call the Anthropic API from the Vercel route; no AWS

- Status: accepted
- Date: 2026-11-06
- Decided by: the user (product owner), recorded by the decoder owner
- Supersedes: ADR-000 decisions 2 (Lambda adapter, `packages/infra`) and 3 (production default is Lambda)

## Context
ADR-000 kept the decoder framework-agnostic and made AWS Lambda (eu-central-1, CDK, Bedrock EU
profile, DynamoDB quotas, SSM kill switch, Budgets) the production default. That meant two deploy
targets, an AWS account with Marketplace billing for Claude, and a stack nobody had deployed yet.
The user chose one deploy and one model vendor: **Vercel and Anthropic only, with no third-party
store** (no Upstash, no Redis).

## Decision
1. `POST /api/decode` (Next.js Route Handler on Vercel, Node.js runtime, `maxDuration` 10 s) is the
   production decode endpoint. It wraps `@ninth/decoder`'s `createFetchHandler`.
2. The decoder calls the **Anthropic Messages API** directly with `fetch`
   (`https://api.anthropic.com/v1/messages`, `x-api-key`, `anthropic-version: 2026-10-21`).
   Default model `claude-haiku-5-5`; `DECODE_MODEL=claude-haiku-4-5` selects Haiku 4.5. The final
   choice stays open (plan D5, decided from the eval).
3. `packages/infra` and every AWS dependency are removed. Git history keeps them
   (commit `32fe9ae`).
4. Guards, in the order a request meets them:
   - **Vercel WAF rate-limit rule** (dashboard; all plans; Hobby gets 1 rule per project, keyed by
     IP, fixed window 10 s to 10 min): path `/api/decode`, method POST, 10 requests per 60 s per
     IP, action 429. This replaces the old per-IP limits.
   - **Origin check** in the route (own origin plus `ALLOWED_ORIGINS`), 4 KB body limit, zod schema.
   - **Kill switch**: `LLM_ENABLED` env var (default off). Changing it needs a redeploy (about a
     minute).
   - **Soft limiter**: `MemoryQuotaStore`, per serverless instance and best effort only.
   - **Hard cap**: the **Anthropic Console workspace monthly spend limit**, recommended $40 (the old
     plan's budget). The API key lives in a dedicated workspace, so the limit covers exactly this app.

## Trade-offs accepted
- **No global daily cap and no per-IP daily limit.** The old plan had 300/day per IP and 20,000
  decodes or $8 per day globally, both in DynamoDB. Without a shared store these are not available
  on Hobby. The in-memory limiter enforces them per instance only, which a burst across instances or
  a cold start resets. The spend limit is monthly, so a bad day can use up the month's budget; the
  WAF rule bounds how fast that can happen. At Haiku 5.5 prices (~$0.0002 per decode) $40 is about
  200,000 decodes; at Haiku 4.5 (~$0.0015) about 27,000.
- **The kill switch is slower.** Flipping `LLM_ENABLED` needs a redeploy (about a minute), where the
  SSM flag took effect in 30 s. The spend limit acts without us.
- **No EU-only processing.** Requests go to Anthropic's API, not an EU-pinned Bedrock profile. All
  copy that said "EU" was changed. Anthropic says it deletes API inputs and outputs within 30 days
  unless it must keep them for Usage Policy enforcement or legal reasons, and does not train on API
  data by default (sources in `docs/research/anthropic-models.md`). The app says this in About and
  Settings and does not claim "nothing is kept".
- **WAF counters are per region**, so traffic from several regions can exceed 10/60 s in total.
- **One vendor bill and no AWS account**, which removes Marketplace billing and the budget-filter
  problem from the old plan.

## Consequences
- `.kiro/steering/privacy.md`, `.kiro/specs/decoder-service/*`, `docs/architecture/decoder.md`,
  `docs/architecture/contracts.md` §3 and the implementation plan describe this setup.
- `docs/research/bedrock-models.md` is replaced by `docs/research/anthropic-models.md`.
- Before the endpoint is public: create the workspace and key, set the spend limit, add the WAF rule,
  set the Vercel env vars (runbook in `docs/architecture/decoder.md`).

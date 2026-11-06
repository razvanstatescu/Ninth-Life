---
inclusion: fileMatch
fileMatchPattern: ["packages/decoder/**", "packages/infra/**", "packages/web/app/api/**"]
---

# Privacy rules for the decoder, its adapters and the infrastructure

What people type here is their voice. Treat every request body as private conversation, even though it only holds digits, candidate words and a partner's line. These rules apply to `packages/decoder`, the CDK stack in `packages/infra`, and the Next.js route adapter in `packages/web/app/api/` (see `docs/decisions/ADR-000-nextjs.md`).

## Never

- Log, trace, store or echo a request or response body, the `codes`, `lattice`, `context.partner`, `context.recent` or any candidate text. Not at debug level, not on errors, not in exception messages, not in metrics dimensions.
- Turn on payload capture anywhere: no API Gateway access logs with bodies, no X-Ray or OpenTelemetry attributes with request content, no Bedrock model-invocation logging, no Lambda event dumps.
- Store raw IP addresses. Rate limiting uses a salted hash (salt in SSM, rotated) with a 24-hour TTL in DynamoDB.
- Set cookies, use analytics, fingerprinting or third-party scripts. No consent banner should ever be needed; if a change would need one, stop and ask.
- Send data outside the EU. Lambda, DynamoDB, SSM and Bedrock run in `eu-central-1`; call Bedrock through the **EU geographic inference profile** only (for example `eu.anthropic.claude-haiku-4-5-20251001-v1:0`). Never a global or US profile.
- Commit secrets or personal data. No `.env` files (the `secrets-guard` hook blocks agent writes to `.env*`; use `.env.example` with placeholders). No real names, places or phrases from users or carers in the public repo: personal vocab packs live in the family's own private repository.
- Hotlink third-party resources from the app (fonts, icons, CDNs). Self-host them.

## Always

- Log only: status code, latency, token counts, model ID, `degraded` flag, rejected-candidate count, error class. Nothing that could rebuild the text.
- Validate with zod and enforce size limits before any work: at most 20 codes, each at most 16 digits, partner at most 280 characters, at most 3 recent items, body at most 4 KB (`docs/architecture/contracts.md`).
- Check `Origin` against the allowlist and keep CORS tight.
- Keep the kill switch working: SSM `/ninthlife/llm_enabled`, the daily cap in DynamoDB, the AWS Budgets action. When off, answer `503 {"error":"llm_disabled"}` and the client stays in ghost mode.
- Least privilege: the Lambda role may call `bedrock:InvokeModel` on the two approved profile ARNs and nothing else.
- LLM mode is opt-in in the UI and explains what is sent, to whom (Amazon Bedrock, EU) and that nothing is kept.
- Ghost mode never depends on the network.

If a feature needs any of the "never" items, write it up in `docs/decisions/` first and ask the team.

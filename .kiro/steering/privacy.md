---
inclusion: fileMatch
fileMatchPattern: ["packages/decoder/**", "packages/web/app/api/**"]
---

# Privacy rules for the decoder and its route

What people type here is their voice. Treat every request body as private conversation, even though it only holds digits, candidate words and a partner's line. These rules apply to `packages/decoder` and the Next.js route in `packages/web/app/api/`, which runs on Vercel and calls the Anthropic Messages API (see `docs/decisions/ADR-001-anthropic-api-no-aws.md`).

## Never

- Log, trace, store or echo a request or response body, the `codes`, `lattice`, `context.partner`, `context.recent` or any candidate text. Not at debug level, not on errors, not in exception messages, not in metrics dimensions.
- Turn on payload capture anywhere: no request or response bodies in Vercel logs, log drains or Observability, no OpenTelemetry attributes with request content, no Anthropic tracing destinations carrying content, no event dumps.
- Store raw IP addresses. The route's soft limiter keys on a salted per-day hash (`IP_HASH_SALT`, rotate by changing it) kept in memory only; per-IP rate limiting is the Vercel WAF rule.
- Set cookies, use analytics, fingerprinting or third-party scripts. No consent banner should ever be needed; if a change would need one, stop and ask.
- Send typed text anywhere except Anthropic's Messages API (`api.anthropic.com`), and only when the person has turned model ranking on. Do not claim EU-only processing: requests go to Anthropic's infrastructure.
- Commit secrets or personal data. No `.env` files (the `secrets-guard` hook blocks agent writes to `.env*`; use `.env.example` with placeholders). No real names, places or phrases from users or carers in the public repo: personal vocab packs live in the family's own private repository.
- Hotlink third-party resources from the app (fonts, icons, CDNs). Self-host them.

## Always

- Log only: status code, latency, token counts, model ID, `degraded` flag, rejected-candidate count, error class. Nothing that could rebuild the text.
- Validate with zod and enforce size limits before any work: at most 20 codes, each at most 16 digits, partner at most 280 characters, at most 3 recent items, body at most 4 KB (`docs/architecture/contracts.md`).
- Check `Origin` against the allowlist and keep CORS tight.
- Keep the kill switch working: the `LLM_ENABLED` env var (default off) and the Anthropic Console workspace spend limit (the hard cap). When off, answer `503 {"error":"llm_disabled"}` and the client stays in ghost mode.
- Least privilege: one Anthropic API key from a dedicated workspace, stored only as a Vercel env var, used only by `/api/decode`. Never in the client bundle, never `NEXT_PUBLIC_*`.
- LLM mode is opt-in in the UI and explains what is sent and to whom (Anthropic's Claude API), and what Anthropic says about retention (deletes API inputs and outputs within 30 days unless kept for policy or legal reasons; no training by default). Do not say "nothing is kept".
- Ghost mode never depends on the network.

If a feature needs any of the "never" items, write it up in `docs/decisions/` first and ask the team.

---
inclusion: fileMatch
fileMatchPattern: ["packages/decoder/**", "packages/web/app/api/**", "packages/web/lib/dictation.ts", "packages/web/lib/speech.ts", "packages/web/lib/rankingProvider.ts", "packages/web/lib/storage.ts", "packages/web/lib/conversation.ts", "packages/web/lib/decodeClient.ts", "packages/web/components/PartnerTurn.tsx", "packages/web/components/ConversationSheet.tsx", "packages/web/app/about/**"]
---

# Privacy rules for the decoder, its route and the browser speech features

What people type here is their voice. Treat every request body as private conversation, even though it only holds digits, candidate words, a partner's line and the reply type picked (Agree, Disagree or Ask). These rules apply to `packages/decoder` and the Next.js route in `packages/web/app/api/`, which runs on Vercel and calls the Anthropic Messages API, or MiniMax's Anthropic-compatible API when configured (see `docs/decisions/ADR-001-anthropic-api-no-aws.md` and `docs/decisions/ADR-002-minimax-provider.md`), and to the browser speech features in `packages/web` (voices and Listen, ADR-004).

## Never

- Log, trace, store or echo a request or response body, the `codes`, `lattice`, `context.partner`, `context.recent`, `context.intent` or any candidate text. Not at debug level, not on errors, not in exception messages, not in metrics dimensions.
- Turn on payload capture anywhere: no request or response bodies in Vercel logs, log drains or Observability, no OpenTelemetry attributes with request content, no Anthropic tracing destinations carrying content, no event dumps.
- Store raw IP addresses. The route's soft limiter keys on a salted per-day hash (`IP_HASH_SALT`, rotate by changing it) kept in memory only; per-IP rate limiting is the Vercel WAF rule.
- Set cookies, use analytics, fingerprinting or third-party scripts. No consent banner should ever be needed; if a change would need one, stop and ask.
- Send typed text anywhere except the configured provider's Messages API (Anthropic `api.anthropic.com`, or MiniMax `api.minimax.io` / `MINIMAX_BASE_URL`, ADR-002), and only when the person has turned model ranking on. Do not claim EU-only processing for either provider.
- Commit secrets or personal data. No `.env` files (the `secrets-guard` hook blocks agent writes to `.env*`; use `.env.example` with placeholders). No real names, places or phrases from users or carers in the public repo: personal vocab packs live in the family's own private repository.
- Hotlink third-party resources from the app (fonts, icons, CDNs). Self-host them.

## Always

- Log only: status code, latency, token counts, model ID, `degraded` flag, rejected-candidate count, error class. Nothing that could rebuild the text.
- Validate with zod and enforce size limits before any work: at most 20 codes, each at most 16 digits, partner at most 280 characters, at most 3 recent items, `context.intent` only `agree`, `disagree` or `ask`, body at most 4 KB (`docs/architecture/contracts.md`).
- Check `Origin` against the allowlist and keep CORS tight.
- Keep the kill switch working: the `LLM_ENABLED` env var (default off) and the Anthropic Console workspace spend limit (the hard cap). When off, answer `503 {"error":"llm_disabled"}` and the client stays in ghost mode.
- Least privilege: one provider API key (Anthropic from a dedicated workspace, or MiniMax), stored only as a Vercel env var, used only by `/api/decode`. Never in the client bundle, never `NEXT_PUBLIC_*` (`lib/publicEnv.mjs` only exposes which provider, never a key).
- LLM mode is opt-in in the UI and explains what is sent and to whom (the configured provider, from `lib/rankingProvider.ts`), and what that provider says about retention (Anthropic: deletes API inputs and outputs within 30 days unless kept for policy or legal reasons, no training by default; MiniMax: no fixed deletion period or no-training promise published, data stored in the US). Do not say "nothing is kept".
- Ghost mode never depends on the network.

## Browser speech (voices and Listen)

- Speech output uses the browser's voices; voices marked "on this device" keep the words on the device, online voices send the text to the browser maker. Say so (About page, voice picker).
- Listen (voice to text for They said, ADR-004, web-ui Req 26) uses the browser's own `SpeechRecognition`. It is off until the person allows it after the notice (`DICTATION_NOTICE` in `PartnerTurn.tsx`), the choice is the `dictation` setting, and it is offered only on secure pages. Prefer on-device recognition when `SpeechRecognition.available({processLocally: true})` says so.
- Ninth Life never touches audio itself: no `getUserMedia`, no `MediaRecorder`, no upload, no storage of audio or of the heard text beyond the They said line (which is never stored). Never start listening without a press.

## The conversation thread (web-ui Req 27, ADR-007)

- Memory only (`lib/conversation.ts`): never IndexedDB, localStorage, sessionStorage or cookies; gone on reload. Do not add a stored history without a new ADR.
- `context.recent` (the person's last 3 sentences) is sent only when model ranking and "Include what you said" (`llmRecent`, off by default) are both on. Its copy lives in `lib/rankingProvider.ts`.
- `context.intent` (the reply type, ADR-008) is sent only while model ranking is on and a reply type is pressed; the key is left out otherwise. It is never stored and never logged; `SENT_FOR_RANKING` in `lib/rankingProvider.ts` names it in every "what is sent" sentence.
- Share and Copy hand the text to the app the person picks; nothing is sent by Ninth Life.

If a feature needs any of the "never" items, write it up in `docs/decisions/` first and ask the team.

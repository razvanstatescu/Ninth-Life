# Tasks: decoder-service

Each task names the requirements it satisfies and the tests that cover them.

- [x] 1. Request schema and size limits (DS-5.1, 5.2, 5.3)
  - [x] 1.1 zod schema with boundary tests at 20 codes, 16 digits, 280 chars, 3 recent, 12 per slot, 10 beams (`test/schema.test.ts`)
  - [x] 1.2 `readBody()`: 4,096 bytes ok, 4,097 -> 413, counts bytes not characters (`test/schema.test.ts`)
- [x] 2. Prompt builder (DS-8.1 - 8.5)
  - [x] 2.1 Frozen system prompt with keypad, rules, JSON schema (`test/prompt.test.ts`)
  - [x] 2.2 Seven invented few-shots; each answer validates (`test/prompt.test.ts`)
  - [x] 2.3 User turn: slots, guesses, sanitized partner and recent text (`test/prompt.test.ts`)
- [x] 3. Reply parser with truncated-output salvage (DS-1.4, DS-2.2) (`test/parse.test.ts`)
- [x] 4. LLM client (DS-2.4, DS-7)
  - [x] 4.1 `LlmClient` interface and `FakeLlmClient` (abort-aware)
  - [x] 4.2 `AnthropicLlmClient` over fetch: headers, `anthropic-version: 2026-10-21`, no sampling params, Haiku 5.5 thinking disabled, cache rule by model minimum (`test/llm.test.ts`)
  - [x] 4.3 HTTP status and refusal mapping, abort on the handler deadline (`test/llm.test.ts`)
- [x] 5. Soft limiter: `MemoryQuotaStore`, per instance, 24 h expiry (DS-4.2 - 4.6) (`test/quota.test.ts`)
- [x] 6. Kill switch: `EnvFlags` (`LLM_ENABLED`, default off), `StaticFlags` (DS-3.1) (`test/flags.test.ts`)
- [x] 7. `handleDecode` (DS-1, DS-2, DS-3.1, DS-4)
  - [x] 7.1 Property P1/P2: every returned candidate validates (`test/handler.test.ts`)
  - [x] 7.2 Property P3: logs never contain the request (`test/handler.test.ts`)
  - [x] 7.3 Fallback paths: timeout, error, junk, all rejected (`test/handler.test.ts`)
  - [x] 7.4 429 / 503 paths and fail-closed limiter (`test/handler.test.ts`)
- [x] 8. Fetch adapter and `configFromEnv`: POST only, Origin check, 4 KB, salted per-day IP hash, model selection, key never in warnings (DS-3.2, 3.4, DS-5.4, DS-6.3) (`test/fetch-adapter.test.ts`)
- [x] 9. Next.js route on Vercel: `runtime = 'nodejs'`, `maxDuration = 10`, wraps the adapter (`packages/web/app/api/decode/route.ts`)
- [x] 10. Remove AWS: Bedrock client, Lambda adapter, `build.mjs`, AWS SDK deps, `packages/infra` (ADR-001)
- [ ] 11. Production setup (runbook in `docs/architecture/decoder.md`)
  - [ ] 11.1 Console: dedicated workspace `ninth-life-decode`, monthly spend limit $40, API key (DS-3.3)
  - [ ] 11.2 Vercel env vars: the provider key (`ANTHROPIC_API_KEY` or `MINIMAX_API_KEY`, optional `MINIMAX_BASE_URL`),
        `LLM_ENABLED`, `DECODE_MODEL`, `DECODE_TIMEOUT_MS`, `IP_HASH_SALT`; redeploy (DS-3.1, 3.4, 7.7-7.9)
  - [ ] 11.3 Vercel WAF rule: `POST /api/decode`, 10 / 60 s per IP, 429; check the 11th request gets 429 (DS-4.1)
  - [ ] 11.4 Kill-switch drill: set `LLM_ENABLED=false`, redeploy, confirm 503, turn back on
- [ ] 12. Eval week (plan D5): Haiku 5.5 vs Haiku 4.5 on the held-out set; p50/p95 latency, top-1 accuracy, rejection rate, cost per decode; set `DECODE_MODEL`
  - [x] 12.1 MiniMax-M3 vs MiniMax-M3.1-Flash, 200 items, letter mode, plus M3 in initials mode (`packages/eval/RESULTS.md`); M3 chosen, `DECODE_TIMEOUT_MS=2000` locally (`docs/research/minimax-models.md`)
  - [ ] 12.2 The Haiku runs need an Anthropic key
- [ ] 13. Live checks with a key: Haiku 5.5 accepts `thinking: disabled` on 2026-10-21; `cache_read_input_tokens > 0` on the second call; the spend-limit error falls back to ghost
  - [x] 13.1 MiniMax live check passed on 2026-11-09 (`pnpm -F @ninth/decoder live-check -- --model MiniMax-M3`; thinking off, reply parses and validates)
- [x] 14. Plan F7: `rejectedWords` in the response, zod `DecodeResponseSchema` / `RejectedWordSchema`, web client re-check and proof-panel strike-through (DS-1.7, ADR-decoder-001)
  - [x] 14.1 Property P5 and examples ("wafer" for 92837, cap 5, shape filter, length mismatch, degraded paths) (`test/handler.test.ts`)
  - [x] 14.2 DS-6 privacy property covers a rejected word that reaches the response but not the log
- [x] 15. MiniMax as a second provider (ADR-002; DS-3.2, DS-6.6, DS-7.7-7.10)
  - [x] 15.1 Provider profiles, `messagesUrl`, `requestHeaders`, `apiVersionFor`, `resolveModel`, `defaultModelFor`, `timeoutFromEnv` (`test/minimax.test.ts`, `test/fetch-adapter.test.ts`, `test/llm.test.ts`)
  - [x] 15.2 Live check per provider (`test/live-check.test.ts`); web `lib/publicEnv.mjs` provider and timeout (`packages/web/test/publicEnv.test.ts`); provider-aware privacy copy (`lib/rankingProvider.ts`)
  - [x] 15.3 Prompt v6: conversation first, guesses marked as fallible (`test/prompt.test.ts`, `docs/research/minimax-models.md`)
  - [ ] 15.4 Spend cap for MiniMax (prepaid balance or MiniMax limits) written into the runbook before going public (ADR-002 trade-offs)

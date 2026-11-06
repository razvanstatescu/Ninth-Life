# ADR-000: Next.js for the web app; decoder stays framework-agnostic

- Status: accepted
- Date: 2026-11-06
- Decided by: Razvan (team lead)

## Context
The source plan (`docs/plan/00-source-plan.md` §4.1) recommended Option B, a Vite + React static PWA
with the decoder in AWS Lambda. Option A, Next.js on Vercel, was the fallback. The team's home stack
is Next.js, so the team chose Next.js.

## Decision
1. `packages/web` is a **Next.js 15.1 (App Router, React 19)** app. The communication screen is a
   client component. Offline support comes from a Serwist (`@serwist/next` 9.0) service worker that
   precaches the app shell and `/data/**` lexicons.
2. The decoder is a pure `handleDecode(body, meta, deps)` function in `@ninth/decoder`, with two
   adapters:
   - `packages/web/app/api/decode/route.ts`: a Next.js Route Handler (one deploy on Vercel, used in dev).
   - `packages/decoder/src/adapters/lambda.ts`: AWS Lambda behind API Gateway HTTP API in eu-central-1,
     deployed by `packages/infra` (CDK).
3. **Production default is Lambda.** API Gateway throttling, reserved concurrency 5, the DynamoDB
   daily cap and the Budgets → SSM kill switch protect the free public endpoint through Jan 29, 2027.
   The client reads `NEXT_PUBLIC_DECODE_URL`; if it is unset, the client uses `/api/decode`.

## Consequences
- Ghost mode (offline dictionary decoding) runs entirely in the browser and never depends on either adapter.
- The Vercel route needs its own rate limit if it is ever exposed in production (in-memory limits are not enough on serverless). Until then it is dev-only, guarded by `DECODE_ROUTE_ENABLED`.
- Validation runs in `@ninth/core` on both server and client, whichever adapter served the request.

## Amendment (2026-11-06): security upgrade
Pinned versions moved from Next 15.1.3 / React 19.0.0 to **Next 15.1.12 / React 19.0.9**. The earlier
pair is affected by CVE-2025-66478 / CVE-2025-55182 (critical remote code execution in React Server
Components). Found by the research teammate; see `docs/research/assumptions-register.md`.
`next/font/google` lists Atkinson Hyperlegible Next and Mono only from Next 15.4, so the fonts stay
self-hosted in `packages/web/public/fonts` (OFL), which also keeps them available offline.

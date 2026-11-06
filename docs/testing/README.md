# Testing (knowledge base)

What runs where, and how to run each layer on your machine. Owner: website and quality testing.
Rules the tests enforce come from `.kiro/steering/` (accessibility, product, trademarks, privacy)
and the brand book `design/system/README.md`.

## The layers

| Layer | What it proves | Where | Runs in CI | Local command |
|---|---|---|---|---|
| Rules | No banned trademarks; `.kiro/` tracked and valid | `scripts/tm-lint.mjs`, `scripts/check-kiro-not-ignored.mjs`, `scripts/validate-kiro-config.mjs` | `ci / rules`, every push and PR | `node scripts/tm-lint.mjs` |
| Types | Every package compiles | `tsc --noEmit` per package | `ci / build` | `pnpm -r typecheck` |
| Unit | Pure logic and components behave as specified | `packages/*/test/*.test.ts(x)`, Vitest (jsdom + Testing Library in `packages/web`) | `ci / build` | `pnpm -r test` (or `pnpm -F @ninth/web test --run`) |
| Property | Invariants hold for any input: every candidate `decodeGhost` returns passes `validate()` against the keys pressed, any scan cell is reachable in rows + longest row steps with exactly 2 selects, scanning pauses after the set loops | fast-check inside the Vitest files of `packages/core` (shared generators in `test/arbitraries.ts`), plus some in `decoder` and `eval` | `ci / build` | `pnpm -F @ninth/core test --run` |
| Build | Next.js production build, service worker and precache manifest | `pnpm -F @ninth/web build` | `ci / build` and `ci / e2e` | same |
| Accessibility (axe) | No serious or critical axe violations of the WCAG 2.0/2.1/2.2 A and AA rules on `/`, `/welcome`, `/about` and the open Settings sheet, Night and Day, at 1280 and 390 px | `packages/web/test/e2e/axe.mjs` (`@axe-core/playwright` 4.14.0) | `ci / e2e` | see below |
| Keyboard walkthrough | Keyboard only: type "i need water" with digits, choose a sentence (Alt+2, ArrowUp), Tab to Settings, Enter opens it, focus moves in, Escape closes it, focus returns; focus ring 4 px | `packages/web/test/e2e/keyboard.mjs` | `ci / e2e` | see below |
| Single-switch walkthrough | Space as the only switch: one-switch scanning types "hi" (4 4) in 5 presses; no second ember fill while a key is lit; the accept delay filters presses closer than 150 ms | `packages/web/test/e2e/switch.mjs` | `ci / e2e` | see below |
| Performance | First load bytes, dictionary ready time, parse, trie build, decode latency, heap, offline reload on a Moto G-class profile and on desktop | `scripts/perf-check.mjs`, results in [performance.md](performance.md) | `ci / e2e`, report only (table in the job summary) | see below |
| Eval | Decoding accuracy on the frozen 866-item test set (the only numbers the website may quote) | `packages/eval`, results `packages/eval/RESULTS.md`, method `docs/architecture/data-and-eval.md` | `eval` workflow (weekly and by hand), not on PRs | `pnpm -F @ninth/eval quick` / `eval` |
| Manual | Real screen readers, real switch hardware, iOS Safari and Android Chrome voices | by hand; the `a11y-auditor` Kiro agent writes to `docs/a11y/` | no | `.kiro/agents/a11y-auditor.json` |

What CI does not cover: screen reader output, real switch interfaces, speech on real devices,
and model ranking against the live Anthropic API (the decoder's tests use a fake model).

## Browser checks on your machine

The e2e, axe and perf scripts are plain Node scripts (not `@playwright/test`) that drive Chromium
with Playwright. Playwright is not a project dependency: the dev image has it installed globally,
and CI runs `npm i -g playwright@1.63.0 && playwright install --with-deps chromium`. The scripts
find it either way. `@axe-core/playwright` is a dev dependency of `@ninth/web`; its
`playwright-core` peer is marked optional in the root `package.json` (`pnpm.packageExtensions`) so
pnpm does not install a second, unpinned Playwright next to the global one.

```sh
pnpm -F @ninth/web build
pnpm -F @ninth/web exec next start -p 3202     # leave running in another shell

node packages/web/test/e2e/axe.mjs             # AXE_STRICT=1 also fails on moderate/minor
node packages/web/test/e2e/keyboard.mjs
node packages/web/test/e2e/switch.mjs
node scripts/perf-check.mjs                    # --runs 5, --json out.json, PERF_STRICT=1 to gate
```

All scripts read `BASE_URL` (default `http://localhost:3202`). They need a production build:
`next dev` has no service worker, and its dev overlay adds its own elements to the page.
axe writes its full report to `packages/web/test-results/axe.json` (git-ignored); CI keeps
`packages/web/test-results/` as the `e2e-reports` artifact.

### Writing a new walkthrough

- Put it in `packages/web/test/e2e/<name>.mjs` and reuse `lib.mjs` (`newContext` sets the theme
  before first paint, `openApp` waits for "Offline dictionary ready", `check`/`done` report).
- Select by role, label or `data-key`, not by layout classes: the communication screen layout
  changes often. The keypad keys (`button[data-key]`), the speak bar (`.nl-speakbar__text`,
  `.nl-speakbar__digits`) and the scan classes (`is-scanning`, `is-lit`) are the stable hooks.
- Never press faster than a person could: the app ignores a second switch press within the accept
  delay (150 ms by default) on purpose.
- Add the script to the `e2e` job in `.github/workflows/ci.yml`.

## The website

`/welcome` is the landing page (`packages/web/app/welcome/page.tsx`, components in
`packages/web/components/site/`). The app stays at `/` because it is the PWA start URL. The page
is rendered at build time: its keypad demo is real output of `decodeGhost` on the shipped
dictionary, and its numbers are read from `packages/eval/RESULTS.json`, so it cannot quote a number
the eval did not measure. If the eval changes, rebuild the site; the copy around the numbers says
what was measured (a simulated typist, offline dictionary) and links to the method.

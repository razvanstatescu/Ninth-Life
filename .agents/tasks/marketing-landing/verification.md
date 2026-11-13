# Verification: marketing-site (FEAT-005)

Checkout: `/Users/razvanstatescu/Documents/Work/Ninth-Life`, branch `main`, nothing committed. Date: 2026-11-10.

## Plan step 27: full check against the dev server (http://localhost:3000)

Dev-server check: `curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3000/app` returned `200`.

From `packages/web`:

| Command | Result |
|---|---|
| `BASE_URL=http://localhost:3000 node test/e2e/site.mjs` | pass: 201 ok, 0 FAIL, "site: all checks passed" (OFFLINE=1 runs skipped with the note, dev server) |
| `BASE_URL=http://localhost:3000 node test/e2e/axe.mjs` | pass: 40 ok, 0 FAIL, "axe: all checks passed" |
| `BASE_URL=http://localhost:3000 node test/e2e/keyboard.mjs` | pass: 18 ok, 0 FAIL |
| `BASE_URL=http://localhost:3000 node test/e2e/switch.mjs` | pass: 5 ok, 0 FAIL |
| `BASE_URL=http://localhost:3000 node test/e2e/spell.mjs` | pass: 17 ok, 0 FAIL |
| `BASE_URL=http://localhost:3000 node test/e2e/responsive.mjs` | pass: 181 ok, 0 FAIL |
| `ENGINE=webkit BASE_URL=http://localhost:3000 node test/e2e/responsive.mjs` | pass: 181 ok, 0 FAIL |
| `ENGINE=webkit BASE_URL=http://localhost:3000 node test/e2e/site.mjs` | pass: 189 ok, 0 FAIL (OFFLINE=1 runs skipped with the note) |

`site.mjs` covers phone (320x568 to 412x783, sideways 874x330 and 915x360), tablet (744x1047, 1133x658, 820x1094, 1180x734) and desktop (1280x900, 1440x1000, 1920x1080).

From the repo root:

| Command | Result |
|---|---|
| `pnpm -r typecheck` | pass (exit 0) |
| `pnpm -F @ninth/web test --run` | pass: 30 files, 334 tests |
| `node scripts/tm-lint.mjs <94 files changed or added by this task>` | pass: "tm-lint: clean (92 file(s) scanned)". The list is every modified or untracked path from `git status` except deletions and `marketing/demo-video/` (other work); tm-lint skips 2 paths it does not scan |
| `node scripts/validate-kiro-config.mjs` | pass: "ok (10 hooks)" |
| `node scripts/check-kiro-not-ignored.mjs` | pass (note: 4 untracked files under .kiro/) |

No failures, so nothing was fixed in this step.

## Plan step 28: accessibility audit of / and /app

The a11y-auditor method was carried out with the Playwright MCP (Chromium): keyboard only, 200% and 400% zoom (640x400, 320x200), 320x640, Day theme, reduced motion and motion on. Report: `docs/a11y/2026-11-10-landing-and-app.md`. Result: no blocker, no serious and no moderate finding. Two minor findings were recorded and not fixed: (1) the inline "Open an issue on GitHub" link is 22px tall (WCAG 2.5.8 exempts inline links); (2) a FAQ summary's 4px focus ring is cut at the viewport bottom by up to 4px (2.4.11 passes).

## Plan steps 29-30: production build and Lighthouse

Step 29: I asked through `send_message` (warning). The parent session stopped the dev server: `curl` to :3000 returned `000`, and nothing listened on :3000 or :3202. No build ran while the dev server was running.

| Command | Result |
|---|---|
| `pnpm -F @ninth/web build` | pass (exit 0). `/` 3 kB, First Load JS 117 kB; `/app` 32.3 kB, 146 kB; shared 107 kB. The prebuild regenerated `tokens.css` and copied 6 data files |
| `pnpm -F @ninth/web exec next start -p 3202` (background) | Ready in 237 ms |
| `BASE_URL=http://localhost:3202 OFFLINE=1 node test/e2e/site.mjs` (1st run) | **FAIL, 2 checks**: "offline, /app reaches Offline dictionary ready" (`net::ERR_INTERNET_DISCONNECTED`) and "offline, / shows the landing page" (h1 null). The cache already held `/app`, but the service worker did not control the page yet when the context went offline. Checked by hand with the Playwright MCP: after the worker controls the page, offline `/app` loads |
| fix in `test/e2e/site.mjs` | wait for `navigator.serviceWorker.controller` (60 s) and check it before `setOffline(true)` |
| `BASE_URL=http://localhost:3202 OFFLINE=1 node test/e2e/site.mjs` (2nd run) | pass, "site: all checks passed", including the 3 offline checks |
| `node scripts/perf-check.mjs --runs 3` | pass (exit 0): first load 538 KB vs target < 700 KB, within; desktop parse 17.2 ms vs < 100 ms, within; offline reload worked in 3 of 3 runs (182 ms, 0.0 KB from the network); navigation to dictionary ready 5249 ms (mobile, throttled), 77 ms (desktop); slowest key press 17 ms; precache 29 entries, at most 568 KB; first visit with the worker 636 KB; no dictionary file downloaded twice |
| `node scripts/lighthouse.mjs --write` (1st run) | exit 1: every score 100 and every budget met, but "missed LCP element unknown (should be text)". Lighthouse 13 has no `largest-contentful-paint-element` audit; the element is in `lcp-breakdown-insight` |
| fix in `scripts/lighthouse-lib.mjs` | `lcpElementTag` reads `lcp-breakdown-insight` first and falls back to the old audit; new case in `test/lighthouse-lib.test.ts` (MS-11.2) |
| `pnpm -F @ninth/web test --run` | pass: 30 files, 335 tests |
| `node scripts/lighthouse.mjs --write` (2nd run) | pass (exit 0): "every mobile target and budget met". It did not refuse :3202, which confirms the dev-server detector on a real production server |
| stop `next start` | done; :3202 answers `000`. `pnpm dev` was not restarted |

Lighthouse 13.6.0, Chromium 153, http://localhost:3202/, 3 runs per preset:

| Preset | Performance | Accessibility | Best Practices | SEO | FCP / LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| Mobile median (target 95/100/100/100) | 100 | 100 | 100 | 100 | 1,052 ms, LCP element `p` | 0 ms | 0.000 |
| Desktop median | 100 | 100 | 100 | 100 | 282 ms, LCP element `p` | 0 ms | 0.000 |

Page bytes transferred (mobile, budget): script 116.8 KB (125), stylesheet 8.0 KB (16), document 17.6 KB (32), font 51.1 KB (60), image 4.4 KB (16), manifest 1.1 KB, other 0.5 KB, total 199.4 KB (250). Every budget passed. Service worker: 2 requests, 0.7 KB. Other origins: none.

The block is in `docs/testing/performance.md` between the lighthouse markers. Its commit line says `e8e3331` (HEAD), but the measured code is the uncommitted working tree on top of it.

After the fixes: `node scripts/tm-lint.mjs` on the 9 files this step touched is clean, and `pnpm -r typecheck` passes (exit 0).

## Integration, iteration 1 (no review.md yet)

Cross-FEAT check of FEAT-001 to FEAT-005 together, same uncommitted working tree, 2026-11-10. At first the dev server was down (`curl` to :3000/app returned `000`). I asked the parent session, the orchestrator started `pnpm dev` from the repo root, and the dev-server check then returned `200`.

From the repo root:

| Command | Result |
|---|---|
| `pnpm -r typecheck` | pass: core, decoder, web, eval all "Done" |
| `pnpm -F @ninth/web test --run` | pass: 30 files, 335 tests |
| `node scripts/tm-lint.mjs <104 changed or new paths from git status>` (deletions and `marketing/demo-video/` left out) | pass: "tm-lint: clean (94 file(s) scanned)" |
| `node scripts/validate-kiro-config.mjs` | pass: "ok (10 hooks)" |

From `packages/web`, against `BASE_URL=http://localhost:3000` (dev server):

| Command | Result |
|---|---|
| `node test/e2e/site.mjs` | pass: 201 ok, 0 FAIL |
| `node test/e2e/axe.mjs` | pass: 40 ok, 0 FAIL |
| `node test/e2e/keyboard.mjs` | pass: 18 ok, 0 FAIL |
| `node test/e2e/switch.mjs` | pass: 5 ok, 0 FAIL |
| `node test/e2e/spell.mjs` | pass: 17 ok, 0 FAIL |
| `node test/e2e/responsive.mjs` | pass: 181 ok, 0 FAIL |
| `ENGINE=webkit node test/e2e/responsive.mjs` | pass: 181 ok, 0 FAIL |
| `ENGINE=webkit node test/e2e/site.mjs` | pass: 189 ok, 0 FAIL (OFFLINE=1 runs skipped on the dev server, as before) |

None of these checks showed a seam between the FEATs, so I changed no code or CSS. Lighthouse was not re-measured because nothing on the landing page changed after the FEAT-005 measurement.

## Review fixes, iteration 2 (review.md, verdict CHANGES_REQUESTED)

Same uncommitted working tree, 2026-11-10. The orchestrator answered for the product owner: yes to the Source copy change (finding 6), yes to the Results caveat line (finding 8), and yes to stopping the dev server and measuring Lighthouse again.

What changed, by finding:

| # | Fix |
|---|---|
| 1 | `site.css`: `.site-faq { padding-block: var(--space-1); }`, so closed summaries are 4 + 2 + 4 = 10px apart. `site.mjs` gap loop now covers `.site-faq-list summary`. `design.md` §9 updated. New case in `site-css.test.ts` (MS-10.4) |
| 2 | `scripts/lighthouse.mjs` records `git describe --always --dirty`; the new block says `e8e3331-dirty` |
| 3 | New tokens in `design/system/tokens.json`: `ring-width` 3px, `line-width` 2px, `target-cta` 64px, type `title-sm` 28/34/700. `tokens.css` regenerated. `site.css` uses them (hero line, hero buttons, rings, scan radius `+ var(--scan-width)`, knob offset as a calc, every 2px border). Same pixel values. `design/system/README.md`, steering `design-system.md`, `design.md` §1 and §5 updated |
| 4 | `site-data.test.ts` asserts `getHowData().sentences[0] === 'hi'` (MS-7.4) |
| 5 | `Pictures.tsx` uses `{proof.reject.word}`; `content.md` §3 matches |
| 6 | `content.md` §10, then `Source.tsx`: "After one visit, typing, the dictionary and the proof check run on your device, and speech uses your browser's voices." |
| 7 | `PROVIDER_COPY` gets a `region` field per provider ("Processing is not limited to the EU."); `Privacy.tsx` renders `{provider.region}`, same text. `content.md` §6, `site.test.tsx` (MS-4.6) and `publicEnv.test.ts` (no EU-only claim) updated |
| 8 | `content.md` §7, then `Results.tsx`: "Some test sentences, mostly short stock phrases such as "Thank you.", also appear in the text the dictionary was built from, so these figures are somewhat optimistic." No number (24.4% is not in RESULTS.md) |
| 9 | `site.css`: `html:has(> body .site) { scroll-padding-bottom: var(--space-2); }` (website only). `components.css`: `@media (forced-colors: active) { .nl-btn--primary { border: var(--line-width) solid transparent; } }`. The 22px inline issue link is left as is (inline exemption) |
| 10 | README: Sentry CLI 0.49.0 (FSL-1.1-Apache-2.0) and oxc-parser 0.152.0 (MIT), licenses read from the installed `package.json` files |
| 11 | No change: `marketing/demo-video/` stays out of this commit until it has its own license and music check |
| 12 | No change: commit `pnpm-lock.yaml` with `package.json`; confirm `@opentelemetry/api` on the first Vercel build |

From the repo root:

| Command | Result |
|---|---|
| `node packages/web/scripts/gen-tokens.mjs` | pass, wrote `styles/tokens.css` |
| `pnpm -F @ninth/web test --run` (after the 1-5, 7, 9, 10 fixes, then again after 6 and 8) | pass both times: 30 files, 336 tests |
| `pnpm -r typecheck` | pass: core, decoder, web, eval all "Done" |
| `node scripts/tm-lint.mjs <the 21 files touched in this iteration>` | pass: "tm-lint: clean (20 file(s) scanned)" |
| `node scripts/validate-kiro-config.mjs` | pass: "ok (10 hooks)" |

From `packages/web` against the dev server (`curl` to :3000/app returned `200` first):

| Command | Result |
|---|---|
| `BASE_URL=http://localhost:3000 node test/e2e/site.mjs` | pass: 201 ok, 0 FAIL; the new summary gap check passes at all 14 sizes |
| `... axe.mjs` | pass: 40 ok, 0 FAIL |
| `... keyboard.mjs` | pass: 18 ok, 0 FAIL |
| `... switch.mjs` | pass: 5 ok, 0 FAIL |
| `... spell.mjs` | pass: 17 ok, 0 FAIL |
| `... responsive.mjs` | pass: 181 ok, 0 FAIL |
| `ENGINE=webkit ... responsive.mjs` | pass: 181 ok, 0 FAIL |
| `ENGINE=webkit ... site.mjs` | pass: 189 ok, 0 FAIL |

Production measurement (the `next dev` on :3000, pid 57652 and its `next-server` 57659, was stopped first; :3000 answered `000`):

| Command | Result |
|---|---|
| `pnpm -F @ninth/web build` | pass (exit 0): `/` 3 kB, First Load JS 117 kB; `/app` 32.3 kB, 146 kB; shared 107 kB |
| `pnpm -F @ninth/web exec next start -p 3202` (background) | Ready in 310 ms |
| `BASE_URL=http://localhost:3202 OFFLINE=1 node test/e2e/site.mjs` | pass: 205 ok, 0 FAIL, including the 3 offline checks |
| `node scripts/perf-check.mjs --runs 3` | pass (exit 0): first load 539 KB (< 700 KB); desktop parse 32.7 ms (< 100 ms); offline reload 3 of 3 (421 ms, 0.0 KB from the network); dictionary ready 5415 ms mobile throttled, 139 ms desktop; slowest key press 45 ms; precache 29 entries, at most 568 KB; first visit with the worker 636 KB; no dictionary file downloaded twice |
| `node scripts/lighthouse.mjs --write` | pass (exit 0): "every mobile target and budget met", block written to `docs/testing/performance.md` with commit `e8e3331-dirty` |
| stop `next start` (pid 58659) | done; :3202 answers `000` |

Lighthouse 13.6.0, Chromium 153, http://localhost:3202/, 3 runs per preset:

| Preset | Performance | Accessibility | Best Practices | SEO | FCP / LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| Mobile median (target 95/100/100/100) | 100 | 100 | 100 | 100 | 1,067 ms, LCP element `p` | 20 ms | 0.000 |
| Desktop median | 100 | 100 | 100 | 100 | 283 ms, LCP element `p` | 0 ms | 0.000 |

Page bytes (mobile, budget): script 116.8 KB (125), stylesheet 8.1 KB (16), document 17.7 KB (32), font 51.1 KB (60), image 4.4 KB (16), total 199.7 KB (250). Every budget passed. Other origins: none.

Dev server afterwards: the shell tool refused to start `nohup pnpm dev`, so the orchestrator started `pnpm dev` from the repo root. `curl` to http://localhost:3000/app then returned `200`. :3202 stays stopped.

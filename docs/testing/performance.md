# Device performance

How fast the communication screen loads and responds on a slow phone, measured with
`scripts/perf-check.mjs` (Playwright + Chrome DevTools Protocol). Owners: website and quality
testing (method), app performance (plan F9, the changes in "After F9" below).

## Method

| | Moto G-class phone | Desktop |
|---|---|---|
| Screen | 412 x 915 at 2.625x, touch, mobile user agent | 1280 x 900 |
| CPU | 4x slowdown (`Emulation.setCPUThrottlingRate`) | no throttling |
| Network, first load | Slow 4G, Lighthouse mobile preset: 562.5 ms RTT, 1.44 Mbit/s down, 675 kbit/s up (`Network.emulateNetworkConditions`) | local, no shaping |
| Cache | empty; service worker blocked so the page sees every byte | empty |
| Offline | second context: install the service worker online, wait until the lexicon is precached and the worker is active, go offline, reload at 4x CPU | not run |
| Service worker | the worker's own requests in that second context (Playwright's service-worker network events): bytes that came over the network, and any `/data` file that both the page and the worker took from the network | not run |

Per run the script records first-load bytes (`encodedDataLength`, so compressed as served), the
time from navigation to "Offline dictionary ready" on screen, and the latency of each key press
typing "kitchen" (5 4 8 2 4 3 6) until the speak bar has updated and painted. It then loads
`@ninth/core` from source into the same page (TypeScript transpiled on the fly and served through
`page.route`, so nothing is added to the app) and times `JSON.parse` of the lexicon the app ships
(`en.v2.json` since F9, `en.v1.json` before), `Lexicon.fromJSON`, the same for `en.v1.json` as a
comparison row, `bigramModel`, the first `completions()` call with no warm-up (the trie build
before F9, the completion index after), and
`decodeGhost` of a 7-word sentence ("i need to go to the shop", codes 4 6333 86 46 86 843 7467;
top result is that sentence). Heap is `Runtime.getHeapUsage` after two forced GCs.

Each figure is the median of 3 runs. Run it again with `node scripts/perf-check.mjs` against
`next start` (`BASE_URL`, default port 3202) (see [README.md](README.md)).

## After F9 (2026-11-06): before and after

Same machine, same script, same day: a linux-x64 cloud container (slower than the one used for the
first measurement below: desktop parse 135.6 ms here against 108.6 ms there), headless Chromium from
Playwright 1.63, `next start -p 3302` (gzip). "Before" is commit `b6eb1eb` plus teammates' work in
progress; "after" adds the F9 changes and the teammates' later work (JS grew from 131 to 140 KB with
their spell / my words screens). "4x" is not a real phone: read the times as relative.

| Metric | Before, Moto G-class | After, Moto G-class | Before, desktop | After, desktop | Target |
|---|---|---|---|---|---|
| First load, compressed | 692 KB | **530 KB** | 692 KB | 530 KB | < 700 KB |
| &nbsp;&nbsp;of which dictionary data | 499 KB | 326 KB | | | |
| &nbsp;&nbsp;of which JS | 131 KB | 140 KB | | | |
| &nbsp;&nbsp;of which fonts / HTML, CSS, other | 51 / 12 KB | 51 / 12 KB | | | |
| Navigation to dictionary ready | 8,111 ms | **5,749 ms** | 407 ms | 302 ms | |
| Slowest key press typing "kitchen" | 578 ms (5th press) | **41 ms** (1st press) | | | < 50 ms |
| Key presses, median per press | 69, 27, 22, 28, 578, 49, 19 | 41, 21, 19, 23, 27, 26, 23 | | | |
| `JSON.parse` lexicon | 119.3 ms (v1) | 2.1 ms (v2) | 22.8 ms | 0.4 ms | |
| `Lexicon.fromJSON` | 527.0 ms | 262.0 ms | 112.0 ms | 51.0 ms | |
| Lexicon parse total | 657.9 ms | **263.3 ms** | 135.6 ms | **51.4 ms** | < 100 ms desktop |
| &nbsp;&nbsp;new core on `en.v1.json` | | 437.0 ms | | 81.0 ms | |
| `bigramModel` | 19.3 ms | 16.1 ms | 3.6 ms | 3.0 ms | |
| First `completions()` with no warm-up | 483.4 ms (trie) | 56.4 ms (index) | 85.8 ms | 11.6 ms | the app warms it in idle time |
| `decodeGhost`, 7 words, first / median of 10 | 9.10 / 4.25 ms | 8.90 / 3.85 ms | 2.20 / 0.85 ms | 2.30 / 1.00 ms | |
| JS heap, app ready | 21.7 MB | 13.6 MB | 12.3 MB | 13.1 MB | |
| Extra heap for one lexicon + bigrams + index | 14.7 MB | 7.6 MB | 15.8 MB | 7.6 MB | |
| Offline reload to dictionary ready | 1,041 ms | 576 ms | | | |
| Offline reload, bytes from the network | 0 KB | 0 KB | | | 0 |
| Precache entries / upper bound if nothing came from the HTTP cache | 40 / 1,139 KB | 27 / 538 KB | | | |
| Service worker install, really downloaded | about 1,004 KB ¹ | **76 KB** | | | |
| Dictionary files downloaded twice on the first visit | lexicon, bigrams, pack ¹ | **none** (3 of 3 runs) | | | none |
| First visit with the service worker, page + worker | about 1.6 MB ¹ | 605 KB | | | |

¹ Before, the worker's own downloads were not in the script; they were counted once on the before
build with the same Playwright service-worker events (desktop profile, one run): 1,004 KB, including
`en.v1.json` (395 KB) and the bigrams (101 KB) again, both 512 px icons (109 KB each), the polyfills
chunk (39 KB), the unused pages-router chunks (framework 56 KB, main 35 KB), the latin-ext fonts and
`data/LICENSE`.

Runs after: mobile dictionary ready 5,685 / 5,749 / 5,793 ms; slowest key 51 / 35 / 41 ms (always
the first press); desktop parse 51.4 / 53.9 / 44.6 ms; offline reload worked in 3 of 3 runs.
Runs before: 8,417 / 8,111 / 7,996 ms; 578 / 577 / 743 ms; 135.6 / 142.5 / 120.0 ms.

The first key press is the only one near 50 ms. It is mostly React rendering the first sentence and
proof; when it lands 300 ms or more after "Offline dictionary ready" it takes 30-35 ms (it was 69 ms
before). One run in three was at 51 ms, so treat 50 ms as met at the median, not with margin.

### What changed (plan F9)

| Proposal | Status | Where |
|---|---|---|
| W1 parallel fetch of lexicon, pack, bigrams | done: `Promise.all`, then parse | `packages/web/lib/data.ts` (web-ui Req 23.1) |
| C1 faster `Lexicon.fromJSON` | done: plain a-z/`'` words use a per-letter table (no `normalize`), only out-of-order lists are sorted; same result as before for any file, lying files included | `packages/core/src/lexicon.ts` (core-encoder Req 2.8, 2.9) |
| C3 compact wire format | done: `data/lexicon/en.v2.json`, codes derived on load, 230 KB gzip instead of 402 KB; eval results identical | ADR-data-003, `build_lexicon.py` (core-encoder Req 2.9, 2.11; eval-harness Req 5.9) |
| C2 / W2 no trie build in a key press | done differently: no trie at all. A sorted code index plus a per-prefix cache gives the same completions (one sort, 6-12 ms in Node); the app builds it and warms decoding and each single key in idle time, one step per idle slice | `lexicon.ts` `prepare()`, `data.ts` `warmDictionary` (Req 2.10, web-ui Req 23.3) |
| W3 trim the precache, no double download | done: `/data` precached at `?v=<content hash>` with `revision: null` (Serwist then uses the HTTP cache, which the page just filled); 192/512 px icons, Apple touch icon, latin-ext fonts, data licence and notice, `en.v1.json`, polyfills and pages-router chunks left out | `packages/web/next.config.mjs`, `app/sw.ts` (web-ui Req 23.2, 23.4) |
| W4 Web Worker for parsing | not done: parse is 51 ms on desktop and 263 ms at 4x, once, during loading, never in a key press. Revisit if a real phone shows the loading screen freezing | |

### What it means now

1. **First load is 530 KB with gzip, 170 KB under the budget.** With brotli on Vercel the
   dictionary is about 273 KB instead of 414 KB, so production should be near 480 KB.
2. **The first visit costs about 0.6 MB, not 1.8 MB.** The worker downloads 76 KB of its own (the
   HTML for `/` and `/about`, the two latin fonts and small icons, which carry a content revision and
   are fetched with `cache: 'reload'`); the dictionary is taken from the HTTP cache.
   Since F12 (2026-11-09) the worker also precaches `/welcome`: one more entry, its HTML, 40 KB raw
   and 8 KB gzip (27 to 28 entries, upper bound 537 to 545 KB gzip, measured from `public/sw.js` after
   `pnpm -F @ninth/web build`). Its JS chunk, CSS, fonts and icons were already precached.
   Since ADR-006 (2026-11-10) the precached documents are `/` (the website), `/app` (the app) and
   `/about`; `/welcome` is a redirect and is no longer precached, and an uncached document offline
   falls back to `/app`. The entry count is unchanged; the byte figures above predate the move and are
   measured again after the next production build.
3. **The dictionary is ready about 2.4 s sooner on Slow 4G** (5.7 s): one round trip instead of
   three, and 173 KB less to download.
4. **No key press waits for an index.** The slow 5th press of "kitchen" (578 ms) is now 27 ms. In
   initials mode the first press paid the same build (it reads `completions(key, 12)`); it now reads a
   cache the idle warm-up filled.
5. **Parse is under target with margin**: 51 ms on desktop. The same new core is 81 ms on v1, so the
   loader alone would have met the target; the compact file is what saves the bytes.
6. **Memory halved**: 7.6 MB for the dictionary instead of 14.7 MB (no trie, no parsed v1 object).
7. **Offline still works**: 576 ms to dictionary ready at 4x CPU, 0 bytes from the network.

## First measurement (2026-11-06, before F9)

Kept for reference; the proposals it led to are in the table above.

### Results

Build: commit `1804f77` plus the website, `next start` (gzip). headless Chromium from Playwright 1.63 on a linux-x64
cloud machine. "4x" slows this machine's CPU by 4; it is not a real phone, so read the times as
relative and re-measure on a device before quoting them.

| Metric | Moto G-class (4x CPU, Slow 4G) | Desktop (no throttling) | Target |
|---|---|---|---|
| First load, compressed | **687 KB** | 687 KB | < 700 KB |
| &nbsp;&nbsp;of which dictionary data (lexicon, bigrams, pack) | 498 KB | | |
| &nbsp;&nbsp;of which JS | 127 KB | | |
| &nbsp;&nbsp;of which fonts | 51 KB | | |
| &nbsp;&nbsp;of which HTML, CSS, other | 11 KB | | |
| Navigation to dictionary ready | 7,742 ms | 322 ms | |
| Slowest key press typing "kitchen" (5th press, 54824) | **385 ms** | | < 200 ms (INP "good") |
| Other key presses (median per press) | 48, 21, 16, 16, –, 17, 39 ms | | |
| `JSON.parse` lexicon | 78 ms | 16.5 ms | |
| `Lexicon.fromJSON` | 379 ms | 91.5 ms | |
| Lexicon parse total | 457 ms | **108.6 ms** | < 100 ms on desktop |
| `bigramModel` | 12.6 ms | 2.7 ms | |
| First `completions()` (trie build) | 357 ms | 68.6 ms | |
| `decodeGhost`, 7 words, first call | 9.9 ms | 1.8 ms | |
| `decodeGhost`, 7 words, median of 10 | 3.4 ms | 0.75 ms | |
| JS heap, app ready and typing | 21.6 MB | 12.2 MB (before typing) | |
| Extra heap for one lexicon + bigrams + trie | 14.7 MB | 15.8 MB | |
| Offline reload to dictionary ready | 720 ms | | |
| Offline reload, bytes from the network | 0 KB | | 0 |
| Service worker precache on install (40 entries) | up to 1,134 KB more | | |

Runs: mobile dictionary ready 7,742 / 7,944 / 7,673 ms; slow key 385 / 403 / 345 ms; desktop
parse 113 / 106 / 109 ms. Offline reload worked in 3 of 3 runs.

Cross-check, same day, 1 run on the working tree with the web owner's new phone layout (not yet
committed): first load 692 KB, dictionary ready 7,787 ms, slowest key press 352 ms, desktop parse
110 ms, offline reload 741 ms. Same picture; the layout added about 5 KB of JS, leaving 8 KB of
headroom under the 700 KB budget with gzip.

### What this meant

1. **First load is inside the 700 KB budget, but only just (687 KB with gzip).** On Vercel the
   lexicon and bigrams go out with brotli (328 + 86 KB per `docs/architecture/data-and-eval.md`
   instead of 394 + 102 KB gzip), so production should be about 600 KB. Any growth in the lexicon,
   the JS or the fonts will cross the line.
2. **The first visit then downloads up to another 1.1 MB.** The service worker precaches every
   public file with a `__WB_REVISION__` query, so the lexicon (394 KB) and bigrams (101 KB) can be
   fetched a second time, plus two 512 px PNG icons (109 KB each), the latin-ext fonts, the
   polyfills chunk and `data/LICENSE`. On a metered phone plan that is the real first-visit cost:
   about 1.8 MB.
3. **The dictionary is ready about 7.7 s after navigation on Slow 4G.** Most of it is transfer, but
   `loadDictionary` fetches the lexicon, then the vocab pack, then the bigrams one after another, so
   each pays a full 562 ms round trip, and parsing (about 460 ms at 4x) runs on the main thread.
   Keys show and work during loading; sentences appear once it is ready.
4. **One key press stalls for about 385 ms.** The digit trie is built lazily on the first
   `completions()` call, which the app makes the first time a word has no exact reading (here the
   5th key of "kitchen"). That press feels stuck on a slow phone; every other press is under 50 ms.
5. **Lexicon parse is about 9% over the desktop target (108.6 ms vs 100 ms).** `Lexicon.fromJSON`
   (91.5 ms) dominates `JSON.parse` (16.5 ms) because it normalizes and re-encodes all 58,906 words.
6. **Decoding itself is fast:** 3.4 ms for a 7-word sentence at 4x CPU. Not a concern.
7. **Memory is fine:** about 15 MB for the dictionary, trie and bigrams.
8. **Offline works:** after one online visit, an offline reload has the dictionary ready in about
   720 ms at 4x CPU with no network bytes.

### Proposals (status in "What changed" above)

For the web owner (`packages/web`):

- **W1. Fetch the three data files in parallel** in `lib/data.ts` (`Promise.all` for lexicon, pack
  and bigrams, then parse). Saves about 2 round trips (roughly 1.1 s on Slow 4G).
- **W2. Warm the trie when idle.** After the dictionary is ready, call `lexicon.completions('2', 1)`
  inside `requestIdleCallback` (fall back to `setTimeout`), so the 357 ms build never lands inside
  a key press. One line, no core change.
- **W3. Trim the precache.** Precache the PNG icons lazily (runtime cache) or drop `icon-512.png`
  in favour of the SVG plus the maskable PNG, leave out `data/LICENSE` and the `polyfills` chunk
  (only for browsers without modules), and give `/data/*.json` content-hashed names so the precache
  can reuse the copy the page already fetched instead of downloading it again.
- **W4. Optional:** parse the lexicon in a Web Worker and only post back the `byCode` table. Needs a
  core API to rebuild a `Lexicon` from that table (see C2), so it waits for core.

For the core owner (`packages/core`):

- **C1. Faster `Lexicon.fromJSON` for trusted files.** The shipped file is already normalized and
  filed under the right code. A fast path that checks the code of each word with a cheap
  per-letter table (or trusts files whose header carries a verified checksum) and skips
  `normalize()` could bring desktop parse under 100 ms. `validate()` still guards every spoken word,
  so safety does not depend on this step.
- **C2. Build the trie eagerly and cheaply.** Either build it at the end of `fromJSON` from the
  already rank-sorted lists (one pass, no global sort), or precompute the top-5 completions per
  prefix at data build time and ship them (one list per trie node; measure the size first).
- **C3. Compact wire format** (already proposed in `docs/architecture/data-and-eval.md`):
  `codes: { "4663": "good:61 home:58 ..." }` cuts both bytes and parse time. Contract change.

Re-run `node scripts/perf-check.mjs` after any change to loading, the data files or the service worker, and update the before/after table.

## Landing page (Lighthouse)

Lighthouse 13.6.0 (a root dev dependency, not shipped, not in CI) on `/` of a production build,
driven by `scripts/lighthouse.mjs` (marketing-site MS-11). Per preset it runs 3 times, each in a new
Chromium from Playwright with a fresh profile (so every run is a first visit and the service worker
installs as it would for a visitor), and reports the medians. Mobile is Lighthouse's default
(simulated throttling: Slow 4G, 4x CPU) with the targets Performance 95 or more and Accessibility,
Best Practices and SEO 100; desktop uses Lighthouse's desktop config and has no target. The run with
the median Performance score supplies the metrics, the LCP element (must be text), CLS (at most
0.02) and the byte budgets: the page's own requests (`network-requests` items with
`sessionTargetType` `page`) at most 125 KB of script, 16 KB of CSS, 32 KB for the document, 60 KB of
fonts, 16 KB of images and 250 KB in total; the service worker's requests on their own line with no
budget; no request to another origin. Raw reports go to `packages/web/test-results/lighthouse/`
(git-ignored).

How to run it. The build overwrites the dev server's files (`.kiro/steering/tech.md` rule 1), so stop
`pnpm dev` first:

```sh
# 1. stop the dev server on :3000
pnpm -F @ninth/web build
pnpm -F @ninth/web exec next start -p 3202     # leave running in another shell
node scripts/lighthouse.mjs --write            # --runs 1-9, --preset mobile|desktop|both, --url
# 2. stop next start, then start pnpm dev again
```

The script refuses a development server (exit 2) and never builds anything itself. It exits 1 when a
mobile target or budget is missed. `--write` replaces the block between the markers below.

<!-- lighthouse:start -->
Measured 2026-11-12 on http://localhost:3202/, commit `e8e3331-dirty`, Lighthouse 13.6.0, Chromium 153.0.8010.12. Median of 3 runs per preset, a fresh browser profile for each run.

### Mobile (simulated throttling: Slow 4G, 4x CPU)

| | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Run 1 | 100 | 100 | 100 | 100 |
| Run 2 | 100 | 100 | 100 | 100 |
| Run 3 | 100 | 100 | 100 | 100 |
| **Median** | **100** | **100** | **100** | **100** |
| Target | 95 or more | 100 | 100 | 100 |

Run with the median Performance score: FCP 1,055 ms, LCP 1,055 ms (element: `p`), TBT 2 ms, CLS 0.000, Speed Index 1,055 ms.

| Page requests, transferred | Bytes | Budget | Result |
|---|---|---|---|
| Script | 117.7 KB | 125.0 KB | pass |
| Stylesheet | 10.8 KB | 16.0 KB | pass |
| Document | 22.7 KB | 32.0 KB | pass |
| Font | 51.1 KB | 60.0 KB | pass |
| Image | 4.4 KB | 16.0 KB | pass |
| Manifest | 1.1 KB | none |  |
| Other | 0.5 KB | none |  |
| Total | 208.3 KB | 250.0 KB | pass |

Service worker: 2 requests, 0.7 KB (reported, no budget).
Other origins: none.

### Desktop (no target)

| | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Run 1 | 100 | 100 | 100 | 100 |
| Run 2 | 100 | 100 | 100 | 100 |
| Run 3 | 100 | 100 | 100 | 100 |
| **Median** | **100** | **100** | **100** | **100** |

Run with the median Performance score: FCP 283 ms, LCP 283 ms (element: `p`), TBT 0 ms, CLS 0.000, Speed Index 283 ms.

| Page requests, transferred | Bytes | Budget | Result |
|---|---|---|---|
| Script | 117.7 KB | none |  |
| Stylesheet | 10.8 KB | none |  |
| Document | 22.7 KB | none |  |
| Font | 51.1 KB | none |  |
| Image | 4.4 KB | none |  |
| Manifest | 1.1 KB | none |  |
| Other | 0.5 KB | none |  |
| Total | 208.3 KB | none |  |

Service worker: 2 requests, 0.7 KB (reported, no budget).
Other origins: none.

Result: every mobile target and budget met.
<!-- lighthouse:end -->

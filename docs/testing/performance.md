# Device performance

How fast the communication screen loads and responds on a slow phone, measured with
`scripts/perf-check.mjs` (Playwright + Chrome DevTools Protocol). Owner: website and quality
testing. Core changes below are **proposals** for the core and web owners; this page changes no
code.

## Method

| | Moto G-class phone | Desktop |
|---|---|---|
| Screen | 412 x 915 at 2.625x, touch, mobile user agent | 1280 x 900 |
| CPU | 4x slowdown (`Emulation.setCPUThrottlingRate`) | no throttling |
| Network, first load | Slow 4G, Lighthouse mobile preset: 562.5 ms RTT, 1.44 Mbit/s down, 675 kbit/s up (`Network.emulateNetworkConditions`) | local, no shaping |
| Cache | empty; service worker blocked so the page sees every byte | empty |
| Offline | second context: install the service worker online, wait until the lexicon is precached, go offline, reload at 4x CPU | not run |

Per run the script records first-load bytes (`encodedDataLength`, so compressed as served), the
time from navigation to "Offline dictionary ready" on screen, and the latency of each key press
typing "kitchen" (5 4 8 2 4 3 6) until the speak bar has updated and painted. It then loads
`@ninth/core` from source into the same page (TypeScript transpiled on the fly and served through
`page.route`, so nothing is added to the app) and times `JSON.parse` of the lexicon,
`Lexicon.fromJSON`, `bigramModel`, the first `completions()` call (which builds the digit trie), and
`decodeGhost` of a 7-word sentence ("i need to go to the shop", codes 4 6333 86 46 86 843 7467;
top result is that sentence). Heap is `Runtime.getHeapUsage` after two forced GCs.

Each figure is the median of 3 runs. Run it again with `node scripts/perf-check.mjs` against
`next start -p 3202` (see [README.md](README.md)).

## Results (2026-11-06)

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

## What this means

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

## Proposals (not implemented)

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

Re-run `node scripts/perf-check.mjs` after any of these and update the table above.

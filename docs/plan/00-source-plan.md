# Ninth Life: Build-Ready Implementation Plan for Kiroween 2026 (Resurrection)

Go. Ninth Life is buildable in 4 weeks by 3 people, fits the Resurrection theme, and has no direct competitor in the 2026 field yet: the only matching entry found is Dot-Dash, a one-switch Morse AAC app, and the Devpost gallery is still unpublished.\[1\] The plan changes in four places after checking the official sources: hooks must use the new v1 PascalCase trigger names, the EU guidance (MDCG 2019-11 rev.1) explicitly classifies an AAC "symbols to speech" app as Class I medical device software, so the product has to be positioned as a general-purpose text-entry and speech tool with no medical claims, Kiro CLI headless CI needs a paid Kiro plan for the API key, and personal names from caregivers must never land in the public repo.

## TL;DR

- **Build it, web-first, with one AWS Lambda decode endpoint.** A static PWA (Vite + React on Vercel) with an offline dictionary decoder ("ghost mode") that always works, plus an opt-in Bedrock decoder (Claude Haiku in the EU geography, about $0.0016 per decode at Haiku 4.5 EU rates). A deterministic validator makes any LLM output that does not match the typed digits impossible to speak. Hard budget cap and kill switch keep the endpoint live and free through Jan 29, 2027.
- **The Kiro story is the scoring engine.** 5 specs with EARS requirements and fast-check properties, 6 v1 hooks (PostFileSave, PreTaskExec, PostTaskExec, Stop, UserPromptSubmit, PreToolUse), 6 steering files, 3 custom agents, MCP (Context7, Playwright, AWS knowledge), a small custom power, headless Kiro CLI on PRs, and a separate Kiro Crew app ("Phrase Keeper") for the $1,000 bonus. Evidence goes into KIRO_LOG.md every day.
- **Top risks:** medical-device positioning (fix by intended-purpose wording), LLM latency over 1.5 s (fix by lattice-constrained prompts), CC BY-SA ShareAlike on wordfreq-derived lexicons (fix by licensing the data folder CC BY-SA 4.0 separately), Web Speech voice variance (fix by voice picker), and running out of Kiro credits (request credits today; request deadline is Dec 1, 12:00 PT).

## Key Findings

1. **Rules verified (kiroween.devpost.com/rules).** Submission period Oct 30, 2026 9:00 PT to Dec 4, 2026 2:00 PT. Judging Dec 16, 2026 to Jan 29, 2027. Winners around Feb 3, 2027. 9,315 registered participants at time of check. Stage Two: 5 equally weighted criteria, 10 points each. Judging "may utilize expert panels, peer review, automated AI-driven analysis", so the README and write-up must be machine-readable and explicit.\[2\]
2. **New detail that matters:** a "Best Ghost of Kiroween Past" bonus ($2,000) exists for entrants who registered for Kiroween 2025.\[2\] If any team member registered in 2025, claim it.
3. **Credits:** 4,000 per entrant via the Credit Request Form linked in the rules (needs Kiro user ID or AWS account ID). Request by Dec 1, 2026 12:00 PT, redeem by Dec 4, redeemed credits expire Dec 31, 2026. Allow 48 business hours.\[2\] Request today.
4. **Kiro hooks changed format.** IDE 1.0 uses `.kiro/hooks/*.json` with `"version": "v1"` and PascalCase triggers: SessionStart, Stop, UserPromptSubmit, PreTaskExec, PostTaskExec, PreToolUse, PostToolUse, PostFileCreate, PostFileSave, PostFileDelete. A command exiting with code 2 blocks PreToolUse, UserPromptSubmit and PreTaskExec. File triggers fire on files "created/saved/deleted by the agent".\[3\]
5. **Kiro models (kiro.dev/docs/models):** Auto 1.0x, Claude Sonnet 5.5 1.3x, Claude Haiku 4.5 0.4x, Claude Haiku 5.5 0.06x up to 100K tokens (experimental, US and EU geographies, eu-central-1 Frankfurt).\[4\]\[5\]\[6\] Romania is served by the EU profile. Romania is not on the rules' excluded-country list.\[2\]
6. **EU regulatory finding:** MDCG 2019-11 rev.1 (June 2025), Annex IV, lists "MDSW app intended to assist persons with a communication disorder (e.g. cerebral palsy, autism (ASD), selective mutism, MS, MND, Down's syndrome, aphasia, etc.) talk by converting a set of selected symbols into spoken language" as Class I under Rule 11c. Qualification turns on the manufacturer's stated intended purpose.\[7\] US: 21 CFR 890.3710 "powered communication system" is Class II, 510(k)-exempt, and is defined by being "intended for medical purposes".\[8\] Both point the same way: no medical intended-purpose claims.
7. **Prior research supports the idea but only for specific claims.** SpeakFaster (Cai et al., Nature Communications 2024): two ALS eye-gaze users reached text-entry rates 29 to 60% above baselines; 19 non-AAC pilot participants showed motor savings up to 50 percentage points with no significant WPM change.\[9\] Cai et al. (NAACL 2022): a 64B LLM expanded over 70% of abbreviations up to length 10, KSR up to 77%, and one turn of context more than doubled accuracy.\[10\] Adhikary and Vertanen (arXiv 2501.10582, 2025): best LLM gave a 5.5% absolute keystroke-savings gain over an AAC n-gram.\[11\]
8. **9-key ambiguity is low per word.** MacKay's count on /usr/dict/words: 45,373 words map to 41,439 codes, 3,934 clashes (under 10% of types).\[12\] MacKenzie reports a KSPC of 1.0072 for frequency-ordered 9-key disambiguation.\[13\] Silfverberg, MacKenzie and Korhonen (CHI 2000) found that over the 9,025 most common words in the British National Corpus the user must press NEXT after about 3% of words, and they call 5% "a reasonable approximation". Ambiguity concentrates in common short words (of/me, in/go, if/he, home/good/gone), which is exactly where conversation context helps.\[14\]

## 1. Executive Summary

**Decision: GO.** Resurrection category, web-first PWA, English first, Romanian and Spanish only as cheap keymap plus lexicon add-ons.

**Why it can win:** a real problem (AAC speed is "a long-acknowledged challenge" and direct-access output rates "have changed little", per "What I Think about When I Type about Talking: Reflections on Text-Entry Acceleration Interfaces", Communications of the ACM vol. 68, issue 5), a clear resurrection (9-key disambiguation was created as an accessible input method before it became a phone feature), a novel safety mechanism (the validator that proves the LLM did not put words in the user's mouth), and a Kiro story with PBT traced to requirements.

**Top 5 risks**

| # | Risk | Mitigation |
|---|---|---|
| 1 | Medical-device classification in EU (MDCG Class I example for AAC apps)\[7\] | Intended purpose: "general-purpose text entry and text-to-speech tool". No diagnosis, therapy, or efficacy claims. Disclaimer in app, README, video |
| 2 | LLM p95 latency over 1.5 s | Lattice-constrained prompt, JSON output under 120 tokens, dictionary results first, 1.5 s timeout to ghost mode |
| 3 | Public endpoint cost through Jan 29, 2027 | API Gateway throttling, Lambda reserved concurrency 5, daily cap in DynamoDB, AWS Budgets alarm to kill switch |
| 4 | Data licensing (CC BY-SA on wordfreq data; NC datasets) | Code MIT, `data/` folder CC BY-SA 4.0 with NOTICE; NC datasets never committed, fetched by script for eval only |
| 5 | Kiro credits run out or CI needs paid plan | Request credits today; Auto or Haiku for routine tasks; one Pro seat for headless CI API key |

## 2. Competitive Landscape

Items marked (u) were not re-verified in this session.

| Product / project | Type | What it does | What we borrow | How Ninth Life differs |
|---|---|---|---|---|
| Cboard | Open source web AAC (code GPLv3; Mulberry symbols CC BY-SA 4.0; ARASAAC symbols CC BY-NC-SA 4.0) | Symbol boards, browser Speech Synthesis API, thousands of symbols, 44 languages | Web Speech approach, offline-first, free | Text-first, 8-key input, LLM decoding with proof. No code copied (GPL-3.0 would force our license) |
| FreeSpeech AAC | Open source, MIT, Svelte | AAC boards, cloud voices, GPT-3 for phrase/conjugation\[15\] | LLM-assisted phrasing | Deterministic validator; offline mode; no account |
| Spoken (Spoken AAC) | Commercial app, launched 2019 | LLM predictive text, ElevenLabs voices, handwriting input\[16\] | Context-aware prediction | Switch scanning, ambiguous keypad, no store\[16\] |
| Predictable (Therapy Box) | Commercial iPad, USD 159.99 | Text-based AAC, word prediction, switch and head tracking | Phrase bank, access methods | Free, browser, LLM sentence decoding\[17\] |
| Proloquo4Text + Keeble (AssistiveWare) | Commercial bundle, USD 129.99 | Text AAC with word and sentence prediction in 18 languages; accessible keyboard with Switch Control layouts | Dwell, select-on-release, speak-as-you-type | Ambiguous keypad reduces targets; free\[18\] |
| Proloquo2Go, TouchChat, LAMP WFL, TD Snap, Grid 3, CoughDrop (u) | Commercial symbol and core-word AAC | Core vocabulary grids, motor planning, board sharing | Core-word quick board, caregiver collaboration | Text tool for literate users. Complement, not replacement |
| SmartPredict (RERC on AAC, Penn State) | Research dual-app | Partner app suggests words in real time | Partner context as input | Context comes from typed partner turn, not a second device\[19\] |
| SpeakFaster (Google) | Research | LLM abbreviation expansion from word initials\[20\] | Context-conditioned expansion, KSR metric | Input is digits; validator enforces exact encoding |
| Dasher, Apple Switch Control/Live Speech, Android Switch Access (u) | Research tool / OS features | LM-driven gesture entry; OS-level scanning and type-to-speak | Scanning conventions | Scanning tuned to a 12-key grid on any browser |
| Dot-Dash (Kiroween 2026 entry, GitHub) | Hackathon | One-switch Morse typing that speaks, in browser\[1\] | None | Morse needs code learning; 9-key needs none and adds LLM context |

**What users value (from the research literature; a direct Reddit and forum survey was not completed, see Open Questions):** speed, low motor effort ("the less I type, the better", Valencia et al., CHI 2023),\[21\] control over the exact message (SmartPredict's goal: "complete control over the message"), offline reliability, cost (text-based AAC apps cost USD 130 to 160), privacy, switch access.\[17\]\[18\]\[19\]

**What a free web tool can add:** zero install, zero cost, works on school and hospital Chromebooks, a fast first-message path for newly non-speaking literate adults (ALS/MND), and a test bed for constrained LLM decoding.

**Claims we must NOT make:** treats, assists recovery, or is clinically validated; any speed gain beyond what our eval harness measures; SpeakFaster numbers presented as ours; "replaces your AAC device". Required wording: "Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to diagnose, treat or replace clinical AAC assessment."

**Honest limitations:** requires literacy and spelling, so it does not serve pre-literate or many aphasic users; English-first; voices depend on the device; LLM mode sends text to a cloud model.

## 3. Data Plan

### 3.1 Dataset table

| Dataset | License (verified unless marked) | Size (est.) | Source | How used | OK in OSI repo? |
|---|---|---|---|---|---|
| wordfreq 3.1.1 (en, ro, es) | Code Apache-2.0; data CC BY-SA 4.0\[22\] | Top 50k en words, about 1 MB raw TSV | pypi.org/project/wordfreq | Unigram frequencies | Yes, if `data/` is CC BY-SA 4.0 with NOTICE. Upstream issue #120 on derived lists is open, so assume ShareAlike applies\[23\] |
| AACText "Imagination of Crowds" (Vertanen and Kristensson, EMNLP 2011) | CC BY 4.0, except lm_test_switch.txt and lm_test_comm.txt | About 6,000 AAC-like communications, train/dev/test\[24\] | aactext.org/imagine | Held-out eval (test), few-shot (train), bigram counts | Yes, with attribution. Exclude the two non-CC files |
| Turk dialogues (Vertanen, ASSETS 2017) | CC BY 4.0 | Two-sided invented dialogues\[25\] | aactext.org/turk | Context-conditioned eval | Yes |
| Comm2 AAC-like test set (Vertanen) | Check per file | 1,506 communications\[26\] | keithv.com | Secondary eval | Verify first |
| Multilingual AAC datasets (Vertanen, Zenodo) | CC BY 4.0 for 3 sets; DailyDialog part CC BY-NC-SA 4.0 | 33 languages, machine-translated\[27\] | zenodo.org/records/23565608 | Romanian/Spanish eval if covered | CC BY parts yes; NC no |
| DailyDialog | CC BY-NC-SA 4.0 | 13k dialogues (u) | Original authors | Optional eval, downloaded by script | No. Never commit |
| OpenSubtitles lists, COCA, SUBTLEX, Cornell, PersonaChat | Unknown or restrictive (Adhikary et al. list OpenSubtitles as "License unknown")\[28\] | n/a | n/a | Skip | No |
| Google Books Ngram | Free use with acknowledgement (per wordfreq notice)\[29\] | Very large | books.google.com/ngrams | Stretch bigram backfill | Yes, too heavy for 4 weeks |
| SCOWL, CMUdict, Norvig count_1w (u) | Mixed permissive | Small | Various | SCOWL for casing only | Verify each |
| Universal Core vocabulary (UNC CLDS, Project Core) | Conflict: UNC page says CC BY 4.0; project-core footer says CC BY-SA 4.0 | 36 words\[30\]\[31\] | med.unc.edu/healthsciences/clds | Quick-access core board, words only | Yes, treated as CC BY-SA 4.0. Do not use PCS, SymbolStix or Widgit PDFs |
| Symbols: ARASAAC (CC BY-NC-SA, u), OpenMoji (CC BY-SA 4.0, u) | Mixed | n/a | n/a | Skip in v1; OpenMoji only if needed | ARASAAC no (NC) |

### 3.2 Lexicon build (1 day)

1. `packages/eval/scripts/build_lexicon.py`: wordfreq `top_n_list('en', 60000)` with `zipf_frequency`, keep alphabetic words plus internal apostrophes, drop under Zipf 2.0.
2. Normalize (NFKD, strip marks, lowercase, fold curly apostrophes), encode, group by code, sort by frequency.
3. Merge `packs/core-en.json` (Universal Core 36 words plus about 200 phrases from AACText train) with a boost.
4. Emit `data/lexicon/en.v1.json` as `{ "4663": ["good","home","gone","hood","hoof"], ... }` plus `data/lexicon/en.bigram.v1.json` (top 200k bigrams from AACText and Turk train splits, Kneser-Ney smoothed, 1-byte quantized log-probs).
5. Write `data/NOTICE.md` (wordfreq and its upstream sources, Vertanen datasets, UNC CLDS) and `data/LICENSE` (CC BY-SA 4.0).

**Size budget (estimates, confirm in week 1):** lexicon about 550 KB JSON, about 180 KB brotli; bigrams about 1.5 MB raw, about 450 KB brotli; first load under 700 KB compressed; parse under 100 ms. Workbox precache with content-hashed filenames, versioned by `lexiconVersion`. Romanian and Spanish packs lazy-loaded.

### 3.3 Ambiguity and press counts

| Statistic | Value | Source / status |
|---|---|---|
| Word types sharing a code | 3,934 of 45,373 (8.7%) | MacKay, /usr/dict/words (verified)\[12\] |
| NEXT presses needed | About 3% of words in a 9,025-word BNC sample; the authors use 5% as "a reasonable approximation" | Silfverberg, MacKenzie and Korhonen, CHI 2000 (verified) |
| KSPC, frequency-ordered 9-key | 1.0072 | MacKenzie (verified)\[13\] |
| Typical collisions | 63 of/me, 46 in/go, 43 he/if, 4663 good/home/gone, 5299 lazy/jazz | Silfverberg et al. (CHI 2000) report a real phone decoding 5299 as "jazz" instead of "lazy"; recompute the others |
| Presses, 7-word sentence, letter mode | About 7 x (4.5 + 1) = 38 | Estimate |
| Presses, 7-word sentence, initials mode | 7 + 1 = 8 | Estimate |
| Mean scan steps per selection, 4x3 keypad | (4+1)/2 + (3+1)/2 = 4.5 | Computed |
| Mean scan steps per selection, 6x6 letter grid | (6+1)/2 + (6+1)/2 = 7.0 | Computed |

Interpretation: for a single-switch user, 9-key cuts mean scan steps per letter by about 36% (4.5 vs 7.0) before candidate selection cost. That motor argument does not need the LLM. The LLM makes the remaining ambiguity, mostly short function words, nearly free.

**Ambiguity in the brief to settle on day 1:** "one key per word" can mean one press per letter (letter mode) or one press per word on the first letter's key (initials mode, SpeakFaster-style). Ship letter mode as default and initials mode ("Phantom mode") as a stretch, because initials mode depends almost entirely on the LLM. The validator handles both: full code in letter mode, first-letter code in initials mode.

### 3.4 Evaluation methodology

- **Test set:** AACText test split plus 300 Turk dialogue pairs (partner turn + reply), frozen in `packages/eval/fixtures/test.v1.jsonl` with SHA-256 in `eval.lock`. Dev split for prompt tuning only.
- **Simulated user:** encodes the gold sentence, submits, picks gold if in top-k, else falls back to per-word "next" cycling. Counts every press and selection.
- **Metrics:** word accuracy, sentence top-1 and top-5 exact match (case- and punctuation-insensitive), KSR = 1 - (presses + selections) / characters including spaces, scan steps per character, invalid-candidate rate before and after validator, latency p50/p95, cost per 1,000 decodes.
- **Baselines:** B0 dictionary frequency order (classic 9-key); B1 bigram beam (ghost mode); B2 LLM unconstrained, no validator; B3 LLM + validator; B4 lattice-constrained LLM + validator (shipping design).
- **Targets (to beat, not claims):** B1 word accuracy 92%+; B4 sentence top-1 80%+, top-5 95%+; B4 invalid spoken output 0% by construction; p50 under 900 ms, p95 under 1.5 s; under $2 per 1,000 decodes.

**Results table template (`packages/eval/RESULTS.md`, regenerated by CI):**

| Config | Word acc | Sent top-1 | Sent top-5 | KSR | Scan steps/char | Invalid pre-validator | p50 ms | p95 ms | $/1k |
|---|---|---|---|---|---|---|---|---|---|
| B0 dict | | | | | | n/a | | | 0 |
| B1 ghost | | | | | | n/a | | | 0 |
| B2 LLM raw | | | | | | | | | |
| B3 LLM+val | | | | | | | | | |
| B4 lattice+val | | | | | | | | | |

## 4. Architecture

### 4.1 Options considered

| Option | Description | Pros | Cons | Verdict |
|---|---|---|---|---|
| A | Next.js on Vercel, decode in a Vercel Function calling Bedrock | Team's home stack; one deploy | Rate limiting needs extra KV; weaker AWS story | Fallback |
| B | Vite + React static PWA on Vercel; decode in AWS Lambda (eu-central-1) behind API Gateway HTTP API, CDK-deployed | Native throttling, reserved concurrency, Budgets kill switch, sponsor-aligned, EU residency | Two deploy targets; CORS | **Recommended** |
| C | In-browser LLM (WebLLM / transformers.js on WebGPU) | Zero cost, offline, private | 300 MB to 1 GB+ download, uneven WebGPU, slow on low-end devices | Stretch only, behind a flag, after Nov 26 |

### 4.2 Repository layout (main repo `ninth-life`, MIT; `data/` CC BY-SA 4.0)

```
ninth-life/
  .kiro/
    specs/{core-encoder,decoder-service,access-modes,web-ui,eval-harness}/{requirements.md,design.md,tasks.md}
    steering/{product.md,accessibility.md,privacy.md,voice.md,data-licenses.md,trademarks.md}
    hooks/{core-tests.json}
    agents/{a11y-auditor.json,license-checker.json,pr-reviewer.json}
    settings/mcp.json
    powers/ninth-life-eval/POWER.md
    prompts/pr-review.md
  packages/
    core/      # keymap, normalize, encode, validator, trie, beam, scanning state machine; fast-check
    web/       # Vite + React PWA, Workbox, IndexedDB (idb), Web Speech
    decoder/   # Lambda handler (Node 22), prompt builder, Bedrock client
    infra/     # AWS CDK: HTTP API, Lambda, DynamoDB quotas, Budgets, SSM kill switch
    eval/      # harness, fixtures, scripts/build_lexicon.py, RESULTS.md
  data/        # lexicons, packs, LICENSE, NOTICE.md
  docs/        # KIRO_LOG.md, KIRO_WRITEUP.md, DEVPOST.md, VIDEO_SCRIPT.md, PRIVACY.md
  .github/workflows/{ci.yml,kiro-review.yml,eval.yml}
  LICENSE, README.md, PRIOR_WORK.md
```

Separate repo: `ninth-life-phrase-keeper` (Kiro Crew app, created after Oct 30 on the same GitHub account).

### 4.3 API contract

`POST /v1/decode` (API Gateway HTTP API, eu-central-1)

Request:
```json
{
  "v": 1, "lang": "en", "mode": "letter",
  "codes": ["4", "6253", "9283737"],
  "lattice": [["i","g","h"],["need","mead"],["water"]],
  "context": { "partner": "Can I get you anything?", "recent": ["I am cold"] },
  "k": 5
}
```
Limits: at most 20 codes, each at most 16 digits, partner at most 280 chars, at most 3 recent items, body at most 4 KB.

Response:
```json
{
  "v": 1,
  "candidates": [{ "text": "I need water", "words": ["i","need","water"], "valid": true, "oov": [] }],
  "rejected": 2, "model": "haiku", "ms": 640, "degraded": false
}
```
Errors: `429 {"error":"rate_limited","retryAfter":30}`, `503 {"error":"llm_disabled"}`. Client treats any non-200 or more than 1,500 ms as "stay in ghost mode". Server and client both run the validator; the proof panel uses the client result.

### 4.4 Data models (IndexedDB via `idb`)

```ts
type Phrase = { id: string; text: string; lang: string; uses: number; lastUsed: number; pinned: boolean };
type Settings = { mode: 'letter'|'initials'; access: 'keyboard'|'touch'|'scan1'|'scan2';
  scanMs: number; scanLoops: number; acceptDelayMs: number; voiceURI?: string; rate: number;
  llm: boolean; contrast: 'default'|'high'; targetSize: 'l'|'xl'; lang: 'en'|'ro'|'es' };
type VocabPack = { id: string; lang: string; version: number; words: { w: string; boost: number }[]; phrases: string[] };
```
Nothing is stored unless the user taps "Save phrase". History is opt-in, local only, with "Clear all".

### 4.5 Key algorithms (`packages/core`)

**Keymap and normalization**
```ts
const KEYMAP: Record<string,string> = { a:'2',b:'2',c:'2', d:'3',e:'3',f:'3', g:'4',h:'4',i:'4',
  j:'5',k:'5',l:'5', m:'6',n:'6',o:'6', p:'7',q:'7',r:'7',s:'7', t:'8',u:'8',v:'8', w:'9',x:'9',y:'9',z:'9' };
// Romanian: ă â → a, î → i, ș ş → s, ț ţ → t. Spanish: ñ → n, á é í ó ú ü → base letter.
function normalize(w: string): string {
  return w.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[\u2018\u2019\u02BC]/g, "'");
}
function encodeWord(w: string): string | null {
  let out = '';
  for (const ch of normalize(w)) {
    if (ch === "'") continue;              // apostrophes are free: "isn't" = 4768
    const d = KEYMAP[ch]; if (!d) return null;  // digits and symbols are not encodable
    out += d;
  }
  return out.length ? out : null;
}
```

**Validator**
```ts
function validate(cand: string[], codes: string[], mode: 'letter'|'initials'): boolean {
  if (cand.length !== codes.length) return false;
  return cand.every((w, i) => {
    const c = encodeWord(w); if (!c) return false;
    return mode === 'letter' ? c === codes[i] : c[0] === codes[i];
  });
}
```
Capitalization and punctuation are added after validation by a deterministic formatter (sentence case, "i" to "I", "." or "?" from the punctuation key). The LLM never adds words.

**Lookup and trie:** exact lookup is a map `code → words[]` (O(1)). Prefix completion uses a digit trie with the top 5 completions precomputed per node.

**Beam over lattice (ghost mode)**
```ts
function beam(lattice: string[][], B = 32) {
  let beams = [{ words: [] as string[], score: 0 }];
  for (const slot of lattice) {
    const next = [];
    for (const b of beams) for (const w of slot.slice(0, 12))
      next.push({ words: [...b.words, w], score: b.score + logPBigram(b.words.at(-1) ?? '<s>', w) });
    beams = next.sort((x, y) => y.score - x.score).slice(0, B);
  }
  return beams;
}
```

**LLM decode (lattice-constrained, then validated)**
1. Client sends the lattice (top 12 per slot) and top 10 ghost beams.
2. Cached system prompt: "choose exactly one word per slot; prefer listed words; propose an unlisted word only for a name or rare word whose letters map to the digits"; output schema `{"c":[["w1","w2"],...]}`; 6 few-shot examples from AACText train.
3. Model: Claude Haiku 4.5 via `eu.anthropic.claude-haiku-4-5-20251001-v1:0` (EU geo profile) as baseline;\[32\] A/B Haiku 5.5 and Nova Micro in eval week (verify Bedrock availability in eu-central-1). `max_tokens` 120, temperature 0.3.
4. Server validates, dedupes, merges with ghost beams, returns top 5. Unlisted words that pass encoding show amber in the proof panel ("matches your keys, not in dictionary").
5. Cache: client LRU on `hash(codes + partner turn)`; no server cache.

**Scanning state machine (1 or 2 switches)**
- Grid: row 0 candidates (up to 5), rows 1 to 4 keypad (1 to 9, *, 0, #), row 5 actions (speak, delete, next, save, mode).
- Auto-scan: highlight advances every `scanMs` (default 1,200 ms, range 400 to 5,000); first press selects row, second selects cell; `scanLoops` (default 3) then pause; `acceptDelayMs` (default 150 ms) debounces tremor.
- Two-switch step scan: switch A advances, switch B selects.
- Property-tested bound: in an R x C grid, any cell is reachable in at most R + C highlight steps and exactly 2 selections from idle.
- Inputs: Space/Enter (common switch-interface mappings), click, whole-screen touch.

### 4.6 Web platform details

- **Speech:** voices load asynchronously (listen for `voiceschanged`); prefer `localService === true` voices and say so in the privacy notice, since some browser voices are network voices; chunk long utterances (u: Chromium cutoffs); iOS Safari needs a user gesture before the first `speak()`; voice picker, rate, pitch, "test voice"; big-text "show mode" if no voice.
- **PWA:** Workbox precache of shell and lexicons; LLM calls network-only; offline banner switches to ghost mode.
- **WCAG 2.2 AA:** target size 2.5.8 (24 px minimum, 72 px default keys); focus visible 2.4.7 and not obscured 2.4.11; adjustable timing 2.2.1 for scanning; contrast 4.5:1 text, 3:1 UI; reduced motion; live region for candidates. Axe in Playwright on every PR.
- **Keyboard-only:** numpad and top-row digits; Enter speaks; Backspace deletes; arrows cycle candidates; 0 space; 1 punctuation. **Touch-only:** 3x4 keypad, no swipes, long-press off by default.

### 4.7 Security, privacy, cost control

- No accounts, no cookies, no analytics in v1, so no consent banner should be needed (verify with a short ePrivacy read). Optional cookieless page counter only.
- Lambda logs metrics only (latency, tokens, status); request bodies never logged; no payload tracing.
- API Gateway stage throttle 5 rps, burst 10; per-IP limits 30/min and 300/day in DynamoDB (salted IP hash, 24 h TTL).
- Global daily cap 20,000 decodes or $8, then 503 and ghost mode.
- Kill switch: SSM `/ninthlife/llm_enabled`; AWS Budgets action at $40 cumulative triggers SNS → Lambda that sets it false.
- CORS allowlist, Origin check, zod schema and size validation; Lambda role with `bedrock:InvokeModel` on two profile ARNs only.

## 5. Kiro Plan

### 5.1 `.kiro/` contents (commit all; never gitignored)

**Specs (5)** in `.kiro/specs/<name>/` with `requirements.md` (EARS), `design.md`, `tasks.md`. Per kiro.dev/docs/specs/correctness, PBT is IDE-only: Kiro "extracts properties from your EARS-formatted requirements" in the design phase, and "hovering over a property reveals its connection to the original requirement and linked task". PBTs are optional by default; turn them on per spec.\[33\]\[34\]

| Spec | Example EARS requirement | Example property (fast-check) |
|---|---|---|
| core-encoder | WHEN a word contains only letters a to z after normalization, THE encoder SHALL return one digit per letter using the standard keypad mapping | For any [a-z]{1,20}, `encodeWord(w).length === w.length` and every digit is 2..9 |
| core-encoder | WHEN a word contains diacritics or curly apostrophes, THE encoder SHALL return the same code as its normalized form | For any w and decoration d, `encodeWord(d(w)) === encodeWord(w)` |
| decoder-service | THE validator SHALL reject any candidate whose word count or per-word code differs from the input codes | Soundness: `validate(x,c)` implies `x.map(encodeWord)` equals c. Completeness: for any lattice sentence s, `validate(s, encode(s))` |
| decoder-service | IF the LLM call fails or exceeds 1,500 ms, THEN THE client SHALL display ghost-mode candidates and SHALL NOT block speech | For any latency/failure sequence, state after timeout has at least one ghost candidate |
| access-modes | WHILE row/column scanning is active, THE system SHALL make every cell reachable within R + C highlight steps and 2 selections | For any R,C in 1..8 and target, simulated steps at most R + C |
| web-ui | WHEN the device is offline, THE app SHALL decode with the local lexicon and SHALL show an offline indicator | Playwright with network off (example-based) |
| eval-harness | THE harness SHALL produce identical metrics for identical inputs and seed | For any seed, two runs give byte-identical RESULTS.json |

**tasks.md excerpt (core-encoder)**
```
- [ ] 1. Keymap and normalize() (Req 1.1, 1.2)
- [ ] 2. encodeWord() returns null on non-encodable characters (Req 1.3)
  - [ ] 2.1 Property: length preservation (Req 1.1)
  - [ ] 2.2 Property: normalization invariance (Req 1.2)
- [ ] 3. Lexicon loader, code → words map in frequency order (Req 2.1)
- [ ] 4. Digit trie with top-5 completions per node (Req 2.2)
```

**Steering** (front matter must be the first content in the file):\[35\]

| File | Inclusion | Outline |
|---|---|---|
| product.md | `inclusion: always` | Users, non-goals, intended-purpose sentence, banned claims |
| accessibility.md | `inclusion: fileMatch`, `fileMatchPattern: "packages/web/**/*.tsx"` | WCAG rules above, 72 px targets, scanning rules |
| privacy.md | `inclusion: fileMatch`, `fileMatchPattern: ["packages/decoder/**", "packages/infra/**"]` | Never log bodies, no cookies, salted IP hashes, EU region only |
| voice.md | `inclusion: auto`, `name: voice`, `description: Web Speech API, voices, TTS` | voiceschanged, localService, chunking, iOS gesture |
| data-licenses.md | `inclusion: auto`, `name: data-licenses`, `description: datasets, lexicon, attribution, NOTICE` | Dataset table, NC never committed |
| trademarks.md | `inclusion: always` | Never write "T9", "Nokia", "SwiftKey", "Gboard" in UI, copy, assets or video; say "9-key predictive text" |

**Hooks (v1 schema), `.kiro/hooks/core-tests.json`:**
```json
{
  "version": "v1",
  "hooks": [
    { "name": "core-pbt-on-save", "trigger": "PostFileSave", "matcher": "packages/core/src/.*\\.ts$",
      "action": { "type": "command", "command": "pnpm -F @ninth/core test --run" }, "timeout": 120 },
    { "name": "trademark-guard", "trigger": "PostFileSave", "matcher": "packages/web/.*\\.(tsx|ts|md|json)$",
      "action": { "type": "command", "command": "node scripts/tm-lint.mjs {{filePath}}" } },
    { "name": "task-needs-requirement", "trigger": "PreTaskExec",
      "action": { "type": "agent", "prompt": "Name the requirement IDs this task satisfies and the property tests that cover them." } },
    { "name": "log-task", "trigger": "PostTaskExec",
      "action": { "type": "command", "command": "node scripts/kiro-log.mjs task" } },
    { "name": "claims-guard", "trigger": "UserPromptSubmit",
      "action": { "type": "agent", "prompt": "If this request adds user-facing copy, check it against product.md banned claims." } },
    { "name": "secrets-guard", "trigger": "PreToolUse", "matcher": "fs_write|str_replace",
      "action": { "type": "command", "command": "node scripts/block-env-writes.mjs" } },
    { "name": "typecheck-on-stop", "trigger": "Stop",
      "action": { "type": "command", "command": "pnpm -r typecheck" } }
  ]
}
```
`block-env-writes.mjs` exits with code 2 to block writes to `.env*`.\[3\] How the event payload reaches a command (stdin or env) was not confirmed; check the Hooks page first. Hooks do not run in Kiro Web, and file triggers fire only on agent edits, so CI repeats every check.

**MCP (`.kiro/settings/mcp.json`)**
```json
{
  "mcpServers": {
    "context7": { "command": "npx", "args": ["-y", "@upstash/context7-mcp"] },
    "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@latest"] },
    "aws-knowledge": { "url": "https://knowledge-mcp.global.api.aws" },
    "github": { "url": "https://api.githubcopilot.com/mcp/", "headers": { "Authorization": "Bearer ${GITHUB_PAT}" } }
  }
}
```
Package names and URLs are from memory; verify in Kiro's MCP panel on day 1. Context7 for current Workbox, fast-check and CDK docs; Playwright MCP for agent-driven a11y walkthroughs and write-up screenshots; AWS knowledge for Bedrock model IDs and quotas; GitHub MCP for Phrase Keeper PRs. No official axe MCP found; use `@axe-core/playwright`.

**Custom agents (`.kiro/agents/`):** `a11y-auditor` (accessibility.md + Playwright MCP; audits a route against WCAG 2.2 AA), `license-checker` (every file under `data/` has a NOTICE entry), `pr-reviewer` (read-only; used headless in CI). Hooks inside agent configs use PascalCase triggers per the configuration reference.\[36\]

**Powers:** from kiro.dev/powers install "Build AWS infrastructure with CDK and CloudFormation", "Work with AWS", and "AWS Cost Optimization". No official Vercel power was in the catalog. Build one custom power, `ninth-life-eval` (POWER.md teaching the agent to run the harness and compare baselines), with the Kiro Team "power-builder" power.\[37\]\[38\]

### 5.2 Kiro CLI headless in GitHub Actions

Headless auth is `KIRO_API_KEY` only; the key needs a Pro, Pro+ or Power subscription.\[39\] Run only on labeled PRs.
```yaml
name: kiro-review
on: { pull_request: { types: [labeled, synchronize] } }
concurrency: { group: kiro-review-${{ github.event.pull_request.number }}, cancel-in-progress: true }
jobs:
  review:
    if: contains(github.event.pull_request.labels.*.name, 'kiro-review')
    runs-on: ubuntu-latest
    permissions: { contents: read, pull-requests: write }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile && pnpm -F @ninth/eval quick > eval.md
      - run: curl -fsSL https://cli.kiro.dev/install | bash
      - env: { KIRO_API_KEY: "${{ secrets.KIRO_API_KEY }}", KIRO_LOG_NO_COLOR: "1" }
        run: |
          kiro-cli chat --no-interactive --agent pr-reviewer --trust-tools=read,grep \
            --require-mcp-startup "$(cat .kiro/prompts/pr-review.md) $(cat eval.md)" > review.md
      - run: gh pr comment ${{ github.event.pull_request.number }} --body-file review.md
        env: { GH_TOKEN: "${{ github.token }}" }
```
The community `kirodotdev-labs/kiro-action` wraps the same flow.\[39\]

### 5.3 Kiro Crew app: "Phrase Keeper" (separate repo)

- **What an App is (kiro.dev/docs/crew/apps):** a package with an `app.json` manifest contributing agents, skills, MCP servers, cron jobs, dashboard UI pages or backend processes. Apps live in separate git repos; Crew clones, runs `npm install && npm run build`, and installs to `~/.kiro/crew/apps/{name}/`. UI uses `@kirocrew/app-sdk`, provided by the host, not npm-installed. Third-party apps need `"apps_allow_third_party": true` in `~/.kiro/crew/config.json`. Gateway on port 5476.\[40\]\[41\]\[42\]
- **Install:** Crew runs on macOS, Linux and Windows (the brief's "macOS/Linux" is out of date);\[43\] source installs need Python 3.12+ and Node.js 22.12+; desktop packages bundle Kiro CLI.\[44\]\[45\]\[46\]
- **Features:** (1) dashboard form where a caregiver adds names, places, phrases; (2) `phrase-keeper` agent encodes each word and lists exact code neighbors in the base lexicon (for example "Ana" = 262, which shares no code with "and" = 263) and suggests boosts; (3) `vocab-pack-pr` skill opens a PR to the family's own private `my-vocab-pack` repo via GitHub MCP or `gh`; (4) weekly cron "unused phrases" report; (5) Ninth Life imports the pack by file or raw URL.
- **Privacy rule:** personal names are personal data; the public main repo only gets generic packs.
- **Rules:** new during the Submission Period, public GitHub URL, same GitHub account as the main entry, judged only among the top 50 eligible submissions, by the Kiro team on usefulness and technical innovation.\[2\]

### 5.4 Credit budget (12,000 total; estimates)

| Use | Model | Est. credits |
|---|---|---|
| 5 specs: requirements, design, analysis | Sonnet 5.5 (1.3x) | 1,200 |
| About 60 spec tasks | Auto (1.0x) | 4,200 |
| PBT generation and failure triage | Auto | 900 |
| Agent-type hooks | Haiku 4.5 or Auto | 400 |
| Headless CI reviews (about 40) | Haiku 5.5 (0.06x) | 200 |
| Crew app | Auto | 900 |
| Docs, write-up, debugging | Auto | 1,800 |
| Reserve | | 2,400 |

Sonnet 5.5 only for specs and hard bugs; Auto for implementation; trial Haiku 5.5 (experimental) for CI and hooks. Check usage every 3 days; above 500 credits/day per person, switch to Haiku 4.5. Command hooks cost no model credits; agent hooks do.\[47\] Kiro Web needs Pro or higher; use it for one documented comparison session only.

### 5.5 Write-up mapping and evidence capture

| Rules prompt | Artifact | Evidence |
|---|---|---|
| IDE vs CLI vs Web vs Crew | IDE for specs/PBT; CLI headless in CI; one Web session; Crew for Phrase Keeper | Dated KIRO_LOG.md entries, CI links, screenshots |
| Custom agents | a11y-auditor, license-checker, pr-reviewer | Agent JSON + one finding each |
| Agent hooks | 7 hooks above | task-log lines; screenshot of a blocked .env write |
| Spec-driven vs vibe | Scanning v0 vibe-coded, then rebuilt from spec | Bug count and time comparison |
| Steering | 6 files, fileMatch on a11y | Component diff with and without accessibility.md |
| MCP | Context7, Playwright, AWS knowledge, GitHub | Transcript excerpts |
| PBT | Encoder, validator, scanning bound, eval determinism | Every shrunk counterexample logged (expect apostrophe and diacritic cases) |
| Powers | CDK, Cost Optimization, custom ninth-life-eval | Install screenshot, POWER.md |

`docs/KIRO_LOG.md` row: date, who, surface, feature, prompt summary, outcome, credits, link. At least 3 entries per person per day.

## 6. Schedule (Nov 6 to Dec 3)

Roles: **A (lead)** core, decoder, infra, Kiro config. **B** web UI, access modes, design, video. **C** data, eval, Crew app, docs, outreach.

| Block | A | B | C | Gate / decision |
|---|---|---|---|---|
| Nov 6 to 8 | Repo, `.kiro/` skeleton, steering, hooks; core-encoder spec + PBT | Theme (spooky but calm, high contrast), keypad prototype | Credit requests (all 3), Bedrock model access, lexicon v1, licenses | Encoder PBT green. Confirm letter mode default |
| Nov 9 to 11 | Lexicon loader, trie, beam | Keypad, candidates, proof panel v0, keyboard + touch | Eval B0/B1 on AACText test | M1 Nov 11: ghost mode in browser |
| Nov 12 to 14 | decoder-service spec; Lambda + CDK, throttling, kill switch | access-modes spec; scanning + PBT | RESULTS v1, NOTICE; outreach sent | M2 Nov 14: deployed PWA, offline works |
| Nov 15 to 17 | Prompt v1, lattice constraint, server validator | Web Speech, voice picker, settings | B2/B3/B4 evals, latency harness | Pick Haiku 4.5 vs 5.5 vs Nova Micro |
| Nov 18 to 20 | Caching, error paths | WCAG pass with a11y-auditor + axe in CI | Crew spec + skeleton | M3 Nov 20: LLM mode with proof panel |
| Nov 21 to 23 | Headless CI, custom power | Polish, XL targets, onboarding | Phrase Keeper PR flow; user sessions | Cut line 1: drop ro/es, drop initials mode |
| Nov 24 to 26 | Bug bash, budget alarm test | Storyboard, shot capture | Feedback fixes; write-up draft | M4 Nov 26 freeze. Cut line 2: drop WebGPU, drop Crew app if broken |
| Nov 27 to 29 | Session fixes | Video v1 (under 2:55) | Blog draft, Devpost text | Full eval rerun, RESULTS.md frozen |
| Nov 30 to Dec 1 | Kill-switch drill | Video final, public on YouTube | Social post (#KiroweenHackathon26 first), blog live | Dec 1 12:00 PT credit deadline (done long before) |
| Dec 2 | Tag `v1.0.0`, license visible in About | Screenshots | Devpost draft, all bonus fields | Dry-run checklist |
| Dec 3 | Submit | Submit | Submit | 24 h buffer |

## 7. User Validation Plan

- **Goal:** 2 remote sessions (30 min) with an SLP or AAC user by Nov 26.
- **Channels:** ALS/MND associations and AAC clinics in Romania and the UK, SLP departments in Bucharest and Cluj, AAC researchers (Vertanen's group at Michigan Tech), r/slp and r/AAC feedback posts within subreddit rules, personal networks.
- **Protocol:** SLP walkthrough first; AAC user only with their usual AAC as backup and a support person present. Tasks: 3 scripted phrases, 2 free phrases, switch-scanning trial. Record task success, time, presses, 5-question rating.
- **Ethics:** written consent, no face or voice recording without separate consent, no health data, stop anytime, quotes only with approval. Not a clinical study; never reported as efficacy evidence.

## 8. Demo Video and Write-ups

**Storyboard (target 2:50; no third-party logos or copyrighted music; original or CC0 audio; full-screen browser):**

| Time | Shot | Content |
|---|---|---|
| 0:00 to 0:15 | In-house drawing of a 12-key keypad | "In 1998 this keypad was built so people who could not speak could type." |
| 0:15 to 0:35 | Problem | AAC typing is slow; one switch means scanning every letter |
| 0:35 to 1:05 | Ghost mode, offline | Digits typed, words appear instantly, spoken |
| 1:05 to 1:40 | LLM mode + proof panel | Partner question; ambiguous digits decode to a sentence; green proof; one red rejected candidate |
| 1:40 to 2:05 | Single-switch scanning | One button, adjustable speed, sentence spoken |
| 2:05 to 2:35 | Kiro | Spec → PBT counterexample → hook blocking a secret write → CI comment → Crew PR |
| 2:35 to 2:50 | Close | Free, offline, private; disclaimer; URL |

**Devpost outline:** problem; what it does; resurrection story; proof panel; access modes; privacy; eval results from RESULTS.md only; built with; lessons; disclaimer.

**Kiro write-up outline:** one section per rules prompt in rules order (surfaces, custom agents, hooks, spec vs vibe, steering, MCP, PBT, powers).\[2\] Each: what, why, one concrete example with screenshot or log, measured effect.

## 9. Rules-Compliance Checklist

| Requirement | How the plan satisfies it |
|---|---|
| New project, Oct 30 to Dec 4, 2026; disclose pre-existing code\[2\] | Repos created after Oct 30; PRIOR_WORK.md says none |
| Team at most 3, age of majority, eligible country\[2\] | 3 adults in Romania; Romania not excluded |
| Built with Kiro; insufficient use can disqualify\[2\] | Specs, hooks, steering, agents, MCP, powers, CLI, Crew committed |
| Category + bonuses declared | Resurrection; Kiro Crew App, Blog, Social Blitz, Ghost of Kiroween Past if eligible; Best Demo is automatic |
| Public GitHub, OSI license visible in About\[2\] | MIT LICENSE at root; data LICENSE in `data/` |
| `/.kiro` at root, not gitignored\[2\] | CI fails if `.kiro` appears in .gitignore |
| Free functional app until Judging ends (Jan 29, 2027)\[2\] | Static site; ghost mode cannot be disabled by cost |
| Video under 3 minutes, public YouTube, shows working app on target device, no third-party trademarks or copyrighted music\[2\] | Storyboard; laptop and tablet browser; tm-lint on script |
| Text description, Kiro write-up | docs/DEVPOST.md, docs/KIRO_WRITEUP.md |
| Third-party integrations authorized\[2\] | Bedrock under AWS terms; dataset licenses in NOTICE |
| No financial or preferential support from Sponsor\[2\] | No AWS funding or contracts; Bedrock paid from own account |
| English | All materials in English |
| Crew app bonus | Separate new public repo, same GitHub account, feature write-up |
| Social Blitz | Post starts with #KiroweenHackathon26, human-written, in submission period\[2\] |
| Bonus Blog | Third-party platform post stating it is written for Kiroween 2026\[2\] |
| Student / Startup prizes | Only if all 3 are students / only with a real startup profile |
| Testing clause | No login; judges may use text and video only,\[2\] so the video shows everything |

## 10. Budget and Cost Model

| Item | Assumption | Cost |
|---|---|---|
| Bedrock Haiku 4.5, EU geo profile | $1.10 / $5.50 per 1M in/out (global $1.00 / $5.00 plus the 10% geo-profile premium, per CloudForecast and Requesty; not from AWS's own price page); 700 in + 150 out tokens | About $0.0016 per decode, $1.60 per 1,000 |
| Bedrock Haiku 5.5 (if available) | $0.10 / $0.50 per 1M on the global profile for prompts up to 100K tokens, about $0.11 / $0.55 with the EU geo premium (CloudForecast, Oct 2026) | About $0.00016 per decode |
| Traffic through Jan 29 | 20,000 decodes | About $32 at Haiku 4.5 EU |
| Hard cap | Budgets action at $40 | Kill switch to ghost mode |
| Lambda, API Gateway, DynamoDB | Low volume | Under $5 (estimate) |
| Vercel | Static hosting | $0 to $20 |
| Kiro | 3 x 4,000 credits + 1 Pro seat for CI ($20/month) | $20 to $40 |

Expected cash cost: under $120.

## 11. Risks, Mitigations, Fallbacks

| Risk | Fallback |
|---|---|
| MDR/FDA positioning challenged | Intended-purpose sentence everywhere; no clinical words in UI; disclaimer |
| LLM down or over budget | Ghost mode is the product; LLM is an enhancer |
| Haiku not enabled in account/region | Request access day 1; fall back to Nova Micro |
| Validator too strict for names | Amber state; user adds word to local pack |
| LLM shifts meaning or tone | Proof panel plus confirm before speak; never auto-speak LLM output |
| Thin bigrams hurt ghost mode | Unigram backoff; LLM fills gap |
| No ro-RO voice on some OSes | Show mode; document voice availability |
| Credits exhausted | Haiku defaults, 2,400 reserve, add-on for one person |
| Crew app blocks main work | Hard stop Nov 26; it only counts if main entry is top 50 |
| Trademark slip | trademarks.md, tm-lint hook, manual video review |
| No user validation in time | Present SLP review only and say no AAC users tested it |

## 12. Verified vs Estimated

**Verified (official or primary sources):** rules text, dates, criteria, prizes including Ghost of Kiroween Past, credit dates; hook v1 schema and triggers; steering inclusion modes; spec files and PBT behavior; Crew app model, SDK, install requirements; headless flags and API-key requirement; Kiro multipliers and EU region; powers catalog; MDCG 2019-11 rev.1 AAC example; 21 CFR 890.3710; SpeakFaster and NAACL 2022 figures; AACText, Turk and wordfreq licenses; Cboard GPL-3.0; Predictable and Proloquo4Text prices; MacKay, MacKenzie, Silfverberg statistics; Devpost gallery unpublished with 0 visible entries;\[48\] Dot-Dash on GitHub.

**Estimated or secondary:** lexicon sizes and load times; credit burn; Haiku 5.5 Bedrock price; model availability for our account; latency and eval targets; MCP URLs; Vercel limits; pricing of the symbol-AAC apps.

**Open questions**
1. Did any team member register for Kiroween 2025?
2. Community survey (r/AAC, r/ALS, r/slp, forums) not done; run it in the first block.
3. Does Vertanen's multilingual set include Romanian, and which ro-RO voices exist per OS?
4. Universal Core license: CC BY 4.0 or CC BY-SA 4.0 (sources conflict)?\[30\]\[31\] Plan assumes BY-SA.
5. Does a free hackathon release count as "making available on the market" under the MDR? Plan avoids medical claims either way.
6. How are hook payloads passed to command actions?
7. The earlier "morse-aac-decoder" entry was not re-found; only Dot-Dash was.

## Sources

1. [GitHub - Hussnain-Butt/dot-dash: One-switch Morse code typing that speaks for people who can't speak or move much. Runs in the browser. Kiroween 2026 entry. · GitHub](https://github.com/Hussnain-Butt/dot-dash)
2. [Kiroween 2026](https://kiroween.devpost.com/rules)
3. [Hooks - What's new in 1.0 - IDE 1.x - Docs - Kiro](https://kiro.dev/docs/ide/whats-new-v1/hooks/)
4. [Available models - Models - Docs - Kiro](https://kiro.dev/docs/models/available-models/)
5. [Models - Docs - Kiro](https://kiro.dev/docs/models/)
6. [Kiro Pricing (September 2026): Plans, Credits, Overage, and Enterprise](https://www.morphllm.com/kiro-pricing)
7. <https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en>
8. [21 CFR § 890.3710 - Powered communication system.](https://www.law.cornell.edu/cfr/text/21/890.3710)
9. [Using large language models to accelerate communication for eye gaze typing users with ALS](https://www.nature.com/articles/s41467-024-53873-3)
10. [Context-Aware Abbreviation Expansion Using Large ...](https://aclanthology.org/2022.naacl-main.91.pdf)
11. [Adapting Large Language Models for Character-based Augmentative and Alternative Communication](https://bytez.com/docs/arxiv/2501.10582/paper)
12. [Some notes on iTap / T9 / "predictive text"](https://www.inference.org.uk/itprnn/itap/)
13. [Keypress - an overview](https://www.sciencedirect.com/topics/computer-science/keypress)
14. [Disambiguating system for disambiguating ambiguous input sequences by displaying objects associated with the generated input sequences in the order of decreasing frequency of use](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5953541)
15. [github.com](https://github.com/Merkie/freespeech)
16. [Spoken (app)](<https://en.wikipedia.org/wiki/Spoken_(app)>)
17. [apps.apple.com](https://apps.apple.com/py/app/predictable/id404445007?l=en-GB)
18. [apps.apple.com](https://apps.apple.com/mn/app-bundle/accessible-text-based-aac/id949114853)
19. [smartpredict aac app that integrates partner knowledge into word prediction](https://rerc-aac.psu.edu/smartpredict-aac-app-that-integrates-partner-knowledge-into-word-prediction)
20. [Using large language models to accelerate communication for eye gaze typing users with ALS](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11530652/)
21. [Parameter Efficient Tuning Allows Scalable Personalization of LLMs for Text Entry: A Case Study on Abbreviation Expansion](https://arxiv.org/pdf/2312.14327)
22. [wordfreq · PyPI](https://pypi.org/project/wordfreq/)
23. [docs(M3JDK21): gate wordfreq derived payload on rights review by hsoliwal · Pull Request #1571 · hsoliwal/M3jdk21 · GitHub](https://github.com/hsoliwal/M3jdk21/pull/1571)
24. [A Crowdsourced Corpus of AAC-like Communications](https://www.aactext.org/imagine/)
25. [Turk dialogues: Dialogues invented by Amazon Mechnical Turk workers](https://www.aactext.org/turk/)
26. [A Collection of Conversational AAC-like Communications Keith Vertanen](https://www.keithv.com/pub/comm2/vertanen-comm2.pdf)
27. [Multilingual Datasets for Augmentative and Alternative Communication (AAC)](https://zenodo.org/records/23565608)
28. [Adapting Large Language Models for Character-based Augmentative and Alternative Communication](https://arxiv.org/pdf/2501.10582)
29. [wordfreq package - github.com/invpt/wordfreq - Go Packages](https://pkg.go.dev/github.com/invpt/wordfreq)
30. [Universal Core vocabulary](https://www.med.unc.edu/healthsciences/clds/universal-core-vocabulary/)
31. [Universal Core Vocabulary](https://core.projectvc.org/communication-systems/)
32. [Claude Haiku 4.5 (EU) on Amazon Bedrock · 200K context · \$1.10/1M input](https://whichllm.io/models/amazon-bedrock-eu-anthropic-claude-haiku-4-5-20251001-v1:0)
33. [Kiro Review 2026: Specs, Tests, Pricing and Safety](https://axonbuild.com/blog/kiro-ide-review/)
34. [Correctness - Specs - Features - Docs - Kiro](https://kiro.dev/docs/specs/correctness/)
35. [Steering - Features - Docs - Kiro](https://kiro.dev/docs/steering/)
36. [Configuration reference - Custom agents - Features - Docs - Kiro](https://kiro.dev/docs/custom-agents/configuration-reference/)
37. [Powers - Kiro](https://kiro.dev/powers/)
38. [Kiro Powers Library](https://www.promptz.dev/library/kiro-powers)
39. [GitHub - kirodotdev-labs/kiro-action: GitHub Action for Kiro · GitHub](https://github.com/kirodotdev-labs/kiro-action)
40. [Apps - Crew - Docs - Kiro](https://kiro.dev/docs/crew/apps/)
41. [Build your first app - Apps - Crew - Docs - Kiro](https://kiro.dev/docs/crew/apps/build-first-app/)
42. [How I Built a Kiro Crew App in 5 Minutes - Full Tutorial With Code - DEV Community](https://dev.to/aws-builders/how-i-built-a-kiro-crew-app-in-5-minutes-full-tutorial-with-code-3el0)
43. [Introducing Kiro Crew - Kiro](https://kiro.dev/blog/introducing-kiro-crew/)
44. [Installation - Crew - Docs - Kiro](https://kiro.dev/docs/crew/installation/)
45. [GitHub - kirodotdev/KiroCrew: A persistent workspace for development work that self-improves and continues beyond one session. · GitHub](https://github.com/kirodotdev/kirocrew)
46. [Kiro Crew: What It Is, Install, Docker, and 0.9 Features (2026)](https://kirotutorial.com/kiro-crew/)
47. [Kiro Hooks: Automate Actions on Save, Tasks, and Tools](https://kirotutorial.com/concepts/hooks/)
48. [Kiroween 2026: Build something wicked and git commit to the darkness. - Devpost](https://kiroween.devpost.com/project-gallery)

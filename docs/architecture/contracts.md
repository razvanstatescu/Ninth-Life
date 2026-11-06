# Shared contracts

These are the interfaces between packages. Every package codes against this page. Change it only
with a note in `docs/decisions/` and tell every owner.

## 1. `@ninth/core` public API (`packages/core/src/index.ts`)

Clarifications and additive extensions (sentence splitting on punctuation, extra apostrophe folds,
`beam(…, prev)`, extra exports, edge-case behaviour): see
[ADR-core-001](../decisions/ADR-core-001-contract-clarifications.md). Language-model options and the
default one-letter penalty: [ADR-core-002](../decisions/ADR-core-002-one-letter-penalty.md).

Pure TypeScript, no DOM, no Node-only APIs. Runs in the browser, in the Vercel Node.js route (Node 22) and in the eval
harness.

```ts
export type Mode = 'letter' | 'initials';
export type Digit = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9';

// --- keymap.ts -------------------------------------------------------
export const KEYMAP: Readonly<Record<string, Digit>>;          // 'a' -> '2' ... 'z' -> '9'
export const KEY_LETTERS: Readonly<Record<Digit, string>>;      // '2' -> 'abc' ... '9' -> 'wxyz'
export function normalize(word: string): string;                // NFKD, strip marks, lowercase, fold ’ ʼ ‘ to '
export function encodeWord(word: string): string | null;        // "isn't" -> "4768"; null if any non a-z letter (after normalize, apostrophes skipped)
export function encodeSentence(text: string): string[];         // split on whitespace, encode each word; throws on unencodable
export function tokenize(text: string): string[];               // words only (punctuation stripped), lowercase normalized

// --- validator.ts ----------------------------------------------------
export function validate(cand: string[], codes: string[], mode?: Mode): boolean; // default 'letter'
export type ProofState = 'match' | 'new' | 'reject';
export interface WordProof { word: string; code: string | null; expected: string; state: ProofState }
export function proof(cand: string[], codes: string[], lexicon: Lexicon, mode?: Mode): WordProof[];
//   match  = encodes to expected code AND lexicon.has(word)
//   new    = encodes to expected code, not in lexicon (names, rare words)
//   reject = does not encode to expected code (never spoken)

// --- lexicon.ts ------------------------------------------------------
export interface LexiconFile {            // data/lexicon/<lang>.v1.json
  v: 1; lang: string; source: string; license: string;
  codes: Record<string, [word: string, zipfX10: number][]>; // words sorted by frequency desc
}
export class Lexicon {
  static fromJSON(file: LexiconFile): Lexicon;
  readonly lang: string;
  lookup(code: string): string[];                 // exact code, frequency order, [] if none
  has(word: string): boolean;                     // normalized
  zipf(word: string): number | undefined;         // e.g. 6.2
  completions(prefix: string, k?: number): string[]; // digit-trie prefix completion, default k=5
  addWords(words: { w: string; boost?: number }[]): void; // user vocab packs; boost in zipf units
  readonly size: number;
}

// --- lm.ts -----------------------------------------------------------
export interface BigramFile {             // data/lexicon/<lang>.bigram.v1.json
  v: 1; lang: string; source: string; license: string;
  bos: '<s>';
  logp: Record<string, Record<string, number>>; // log10 P(w | prev), 2 decimals; prev may be '<s>'
  backoff: Record<string, number>;              // log10 backoff weight for prev
}
export interface LanguageModel { logP(prev: string, word: string): number } // log10
export const DEFAULT_LETTER_PENALTY = -3;                                  // ADR-core-002
export const SPOKEN_LETTERS: readonly string[];                            // ['a', 'i']
export interface LmOptions { letterPenalty?: number; spokenLetters?: readonly string[] } // default -3, ['a','i']; 0 = off
export function unigramModel(lex: Lexicon, opts?: LmOptions): LanguageModel;                // log10 p = zipf - 9, floor -9; + letterPenalty for a one-letter word not in spokenLetters
export function bigramModel(file: BigramFile, lex: Lexicon, opts?: LmOptions): LanguageModel; // KN-style backoff to unigram; same penalty on both branches

// --- decode.ts (ghost mode) -----------------------------------------
export interface Candidate { words: string[]; score: number; source: 'dict' | 'ghost' | 'llm' }
export function lattice(codes: string[], lex: Lexicon, perSlot?: number, mode?: Mode): string[][]; // default 12; unknown code -> []
export function beam(lat: string[][], lm: LanguageModel, B?: number): Candidate[];       // default B = 32
export function decodeGhost(codes: string[], opts: { lexicon: Lexicon; lm: LanguageModel; k?: number; mode?: Mode; context?: string[] }): Candidate[]; // top k (default 5), every result passes validate()

// --- format.ts -------------------------------------------------------
export function formatSentence(words: string[], punct?: '.' | '?' | '!' | ','): string; // sentence case, i -> I, i'm -> I'm

// --- scan.ts (access modes) ------------------------------------------
export interface ScanConfig { rows: number[]; loops: number }  // rows[i] = number of cells in row i
export type ScanPhase = 'idle' | 'rows' | 'cells' | 'paused';
export interface ScanState { phase: ScanPhase; row: number; cell: number; loopsLeft: number; steps: number }
export type ScanEvent = { type: 'tick' } | { type: 'select' } | { type: 'advance' } | { type: 'reset' };
export function initialScan(cfg: ScanConfig): ScanState;
export function scanReducer(cfg: ScanConfig, s: ScanState, e: ScanEvent): { state: ScanState; chosen?: { row: number; cell: number } };
//   1-switch auto scan: 'tick' advances highlight, 'select' picks row then cell.
//   2-switch step scan: 'advance' moves highlight, 'select' picks.
//   After `loops` full passes without a select, phase -> 'paused' (no more ticks until 'select').
//   Property: any cell reachable in <= rows.length + max(row length) highlight steps and exactly 2 selects.
```

## 2. Data files (`data/`, CC BY-SA 4.0)

| File | Shape | Notes |
|---|---|---|
| `data/lexicon/en.v1.json` | `LexiconFile` | wordfreq 3.1.1 `top_n_list('en', 60000)`, Zipf >= 2.0, a-z plus internal apostrophe; acronyms and words in no SCOWL list down-weighted 1.0 Zipf (ADR-data-002) |
| `data/lexicon/en.bigram.v1.json` | `BigramFile` | AACText + Turk **train** splits only (test stays held out) |
| `data/packs/core-en.json` | `VocabPack` | Universal Core 36 words + common AAC phrases, generic only, no personal names |
| `data/NOTICE.md`, `data/LICENSE` | | attribution, CC BY-SA 4.0 |

The web app (Next.js) loads these from `/data/...` (copied into `packages/web/public/data/` by
`packages/web/scripts/copy-data.mjs`, run on `predev` / `prebuild`). Never import them into the JS bundle.

## 3. Decode HTTP API (`packages/decoder`)

The decoder is framework-agnostic; production is one Next.js Route Handler on Vercel that calls the
Anthropic Messages API directly (see `docs/decisions/ADR-001-anthropic-api-no-aws.md`, which
supersedes the Lambda parts of ADR-000):

```ts
// packages/decoder/src/handler.ts
export interface DecodeDeps {
  llm: LlmClient;                       // AnthropicLlmClient in prod, FakeLlmClient in tests/dev
  quota: QuotaStore;                    // MemoryQuotaStore: best-effort, per serverless instance
  flags: { llmEnabled(): Promise<boolean> }; // EnvFlags: LLM_ENABLED env var (default off)
  now(): number;
  options?: { timeoutMs?: number; maxTokens?: number; log?: MetricsLogger }; // optional
}
export async function handleDecode(body: unknown, meta: { ipHash: string; origin?: string }, deps: DecodeDeps):
  Promise<{ status: number; json: unknown; headers?: Record<string, string> }>;

// packages/decoder/src/adapters/fetch.ts (Web-standard Request -> Response)
export function configFromEnv(env?: Record<string, string | undefined>): FetchHandlerConfig & { warnings: string[] };
export function createFetchHandler(cfg: FetchHandlerConfig): (req: Request) => Promise<Response>;
// packages/web/app/api/decode/route.ts: POST = createFetchHandler(configFromEnv(process.env))
```

`POST /api/decode` takes the body in `docs/plan/00-source-plan.md` §4.3, plus an optional
`beams: string[][]` (the client's top ghost sentences, at most 10; returned when the model fails).
Each response candidate also carries `source: 'llm' | 'ghost'`.

The 200 response (`DecodeResponse`, zod `DecodeResponseSchema` in `packages/decoder/src/schema.ts`):

```ts
{ v: 1;
  candidates: { text: string; words: string[]; valid: true; oov: string[]; source: 'llm' | 'ghost' }[]; // <= k
  rejected: number;                                                     // model candidates dropped
  rejectedWords: { slot: number; word: string; expectedCode: string }[]; // additive, ADR-decoder-001
  model: string; ms: number; degraded: boolean }
```

`rejectedWords`: at most 5, model order, one per (slot, word); each `word` is normalized,
`^[a-z]+(?:'[a-z]+)*$`, at most 16 characters, does not match `expectedCode` (= `codes[slot]`) and is
in no returned candidate. Shown struck through in the proof panel, never spoken, never logged. Limits: at most 20 codes, each at
most 16 digits, partner at most 280 chars, at most 3 recent items, body at most 4 KB. The server and
client both run `validate()`. The server stops waiting for the model at 1,200 ms; the client times
out at 1,500 ms and stays in ghost mode. `NEXT_PUBLIC_DECODE_URL` can point the client elsewhere,
but is normally unset (same-origin `/api/decode`).

## 4. Settings and storage (`packages/web`)

```ts
type Settings = { mode: 'letter'|'initials'; access: 'keyboard'|'touch'|'scan1'|'scan2';
  scanMs: number; scanLoops: number; acceptDelayMs: number; voiceURI?: string; rate: number; pitch: number;
  llm: boolean; theme: 'night'|'day'|'system'; targetSize: 'l'|'xl'; lang: 'en' };
type Phrase = { id: string; text: string; lang: string; uses: number; lastUsed: number; pinned: boolean };
type VocabPack = { id: string; lang: string; version: number; words: { w: string; boost: number }[]; phrases: string[] };
```
IndexedDB via `idb`. Nothing is stored unless the person taps "Save phrase". History is opt-in.

## 5. Keypad key roles (fixed, from the design system)

| Key | Role |
|---|---|
| 1 | Punctuation (cycles . ? ! ,) |
| 2–9 | Letters |
| * | Back (delete last digit; on empty word, delete last word) |
| 0 | Space (commit current word) |
| # | Next (cycle the current word to its next reading) |

Physical keyboard: digits on top row and numpad; Enter = Speak; Backspace = Back; Space = 0;
ArrowUp/ArrowDown = move candidate selection; keys 1–5 with Alt choose candidate rank (plain digits
are keypad input).

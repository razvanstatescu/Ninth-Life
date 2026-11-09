/**
 * Offensive-readings report for decision D7 (plan 01, docs/architecture/data-and-eval.md §6).
 *
 *   pnpm -F @ninth/eval report:offensive    writes reports/offensive-readings.md
 *
 * Counts how often a word from a public blocklist shows up among the top-5 ghost-mode (B1)
 * sentences on the frozen test set, and where such words sit in the lexicon. It measures the
 * lexicon as built; since D7 (ADR-data-004) the build drops the words marked as slurs.
 *
 * Blocklist: LDNOOBW "List of Dirty, Naughty, Obscene, and Otherwise Bad Words", English list,
 * CC BY 4.0, fetched by `pnpm data:fetch` into .cache/ldnoobw/ (pinned by SHA-256, never committed).
 * The report never spells a listed word: each one is shown as its first letter plus dots, with the
 * first 8 hex digits of SHA-256(word) so a teammate can check a word they have in mind.
 *
 * `SLUR_SHA256` marks the listed words that are identity slurs (race or ethnicity, sexual
 * orientation or gender identity, disability) rather than general profanity or sexual terms;
 * D7 is about slurs, and profanity in general stays. Hashes only, read from
 * scripts/slurs.sha256.json, the same file build_lexicon.py drops them with.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { bigramModel, decodeGhost, encodeWord, Lexicon, normalize, type BigramFile, type LexiconFile, type LexiconFileV2 } from '@ninth/core';
import { EVAL_DIR, loadBigramFile, loadFixture, loadLexiconFile, sha256 } from './fixture';
import type { TestItem } from './types';

export const BLOCKLIST = {
  path: join(EVAL_DIR, '.cache', 'ldnoobw', 'en.txt'),
  name: 'LDNOOBW "List of Dirty, Naughty, Obscene, and Otherwise Bad Words" (English)',
  url: 'https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words',
  license: 'CC BY 4.0',
  sha256: 'af851ecef1d5f212caba17339b12ac39cc2fef7d78c74876f67237644fcee8bd',
};

/** The identity-slur hash list (decision D7, ADR-data-004): SHA-256 of the word and its keypad code. */
export interface SlurList {
  about: string;
  words: { sha256: string; code: string }[];
}
export const SLUR_LIST_PATH = join(EVAL_DIR, 'scripts', 'slurs.sha256.json');
export const SLUR_LIST = JSON.parse(readFileSync(SLUR_LIST_PATH, 'utf8')) as SlurList;

/**
 * Identity slurs among the blocklisted words that occur in the wordfreq lexicon (SHA-256 of the
 * word), as judged by the decoding-quality owner on 2026-11-06 (race or ethnicity, sexual
 * orientation or gender identity, disability; plural and spelling variants included). The lexicon
 * build drops them (`build_lexicon.py --slurs drop`, the default).
 */
export const SLUR_SHA256 = new Set<string>(SLUR_LIST.words.map((x) => x.sha256));

/** True when the word, or its stem before an apostrophe ("x's"), is on the slur list. */
export const isListedSlur = (w: string): boolean => SLUR_SHA256.has(sha256(w)) || SLUR_SHA256.has(sha256(w.split("'")[0]!));

export interface Hit {
  id: string;
  mask: string;
  slur: boolean;
  code: string;
  rankInCode: number;
  readingsInCode: number;
  /** The code's first reading, masked like `mask` when it is itself on the blocklist. */
  firstReading: string;
  zipf: number;
  /** Test items whose top 5 contains the word although the gold sentence does not. */
  itemsTop5: number;
  itemsTop1: number;
  /** Times it occurs in a top-5 sentence (one item can show it in several). */
  occurrences: number;
}

export const mask = (w: string): string => w[0] + '·'.repeat(Math.max(0, w.length - 1));

export function blocklistWords(text: string): string[] {
  const out = new Set<string>();
  for (const line of text.split('\n')) {
    const w = normalize(line.trim());
    if (w && /^[a-z]+(?:'[a-z]+)*$/.test(w)) out.add(w); // single words only; phrases cannot be one reading
  }
  return [...out].sort();
}

export function analyse(items: TestItem[], lexFile: LexiconFile | LexiconFileV2, bigram: BigramFile, words: string[], k = 5) {
  const lex = Lexicon.fromJSON(lexFile);
  const lm = bigramModel(bigram, lex);
  const listed = new Set(words.filter((w) => lex.has(w)));
  const hits = new Map<string, Hit>();
  for (const w of listed) {
    const code = encodeWord(w)!;
    const readings = lex.lookup(code);
    const id = sha256(w);
    hits.set(w, {
      id: id.slice(0, 8),
      mask: mask(w),
      slur: SLUR_SHA256.has(id),
      code,
      rankInCode: readings.indexOf(w) + 1,
      readingsInCode: readings.length,
      firstReading: listed.has(readings[0]!) ? mask(readings[0]!) : readings[0]!,
      zipf: lex.zipf(w)!,
      itemsTop5: 0,
      itemsTop1: 0,
      occurrences: 0,
    });
  }
  let itemsAny = 0;
  let itemsSlur = 0;
  let itemsTop1 = 0;
  for (const it of items) {
    const gold = new Set(it.words);
    const cands = decodeGhost(it.codes, { lexicon: lex, lm, k });
    const seen = new Set<string>();
    cands.forEach((c, rank) => {
      for (const w of c.words) {
        const h = hits.get(w);
        if (!h || gold.has(w)) continue;
        h.occurrences++;
        if (rank === 0 && !seen.has(`top1:${w}`)) {
          h.itemsTop1++;
          seen.add(`top1:${w}`);
        }
        seen.add(w);
      }
    });
    const shown = [...seen].filter((s) => !s.startsWith('top1:'));
    for (const w of shown) hits.get(w)!.itemsTop5++;
    if (shown.length > 0) itemsAny++;
    if (shown.some((w) => hits.get(w)!.slur)) itemsSlur++;
    if ([...seen].some((s) => s.startsWith('top1:'))) itemsTop1++;
  }
  return { listedTotal: words.length, inLexicon: listed.size, hits: [...hits.values()], itemsAny, itemsSlur, itemsTop1, items: items.length };
}

const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;

/** The `slurs` block that build_lexicon.py writes to build-stats/lexicon.json. */
export interface SlurFilterStats {
  mode: string;
  listed: number;
  affected: number;
}

export function reportMarkdown(
  r: ReturnType<typeof analyse>,
  meta: { fixtureSha: string; lexSha: string; bigramSha: string; slurFilter?: SlurFilterStats | null },
): string {
  const shown = r.hits.filter((h) => h.itemsTop5 > 0).sort((a, b) => b.itemsTop5 - a.itemsTop5 || a.id.localeCompare(b.id));
  const firsts = r.hits.filter((h) => h.rankInCode === 1);
  const slurs = r.hits.filter((h) => h.slur);
  const f = meta.slurFilter;
  const row = (h: Hit) =>
    `| \`${h.mask}\` | \`${h.id}\` | ${h.slur ? 'slur' : 'other'} | ${h.code} | ${h.rankInCode} of ${h.readingsInCode} | ${h.rankInCode === 1 ? '(itself)' : `"${h.firstReading}"`} | ${h.zipf.toFixed(1)} | ${h.itemsTop5} | ${h.itemsTop1} |`;
  const head = '| Word | SHA-256 (8) | Kind | Code | Rank in code | First reading | Zipf | Items in top 5 | Items at top 1 |\n|---|---|---|---|---|---|---|---|---|';
  const filterLine = f
    ? `Slur filter (decision D7, ADR-data-004): \`build_lexicon.py --slurs ${f.mode}\`, ${f.affected} of the ${f.listed} words on \`scripts/slurs.sha256.json\` ${f.mode === 'drop' ? 'dropped from' : f.mode === 'down' ? 'sunk to the floor of' : 'kept in'} the lexicon (\`build-stats/lexicon.json\`).`
    : 'Slur filter: no record in `build-stats/lexicon.json` (lexicon built without `--slurs`).';
  return `# Offensive readings on the test set (decision D7)

Generated by \`pnpm -F @ninth/eval report:offensive\` (\`src/offensive.ts\`). Do not edit by hand.
It measures the lexicon as built. ${filterLine}

- Blocklist: ${BLOCKLIST.name}, ${BLOCKLIST.license}, <${BLOCKLIST.url}>, \`en\` file SHA-256
  \`${BLOCKLIST.sha256.slice(0, 16)}…\`. Fetched by \`pnpm data:fetch\` into \`.cache/\` and never
  committed. It mixes identity slurs with general profanity and sexual terms, so each hit below is
  marked **slur** (race or ethnicity, sexual orientation or gender identity, disability) or
  **other**. D7 is about slurs; profanity in general stays.
- Words are never spelled here: first letter plus dots, and the first 8 hex digits of
  SHA-256(word) so you can check a word you have in mind (\`printf %s word | sha256sum\`).
- Decoder: B1 ghost (shipping offline mode, bigram LM with the one-letter penalty), k = 5, letter
  mode, full frozen test set (\`fixtures/test.v1.jsonl\`, ${r.items} items, \`${meta.fixtureSha.slice(0, 16)}…\`).
  Lexicon \`${meta.lexSha.slice(0, 16)}…\`, bigrams \`${meta.bigramSha.slice(0, 16)}…\`.
- "Items in top 5" counts test items whose five suggested sentences contain the word while the
  person's real sentence does not.

## Summary

| Measure | Value |
|---|---|
| Single-word entries on the blocklist | ${r.listedTotal} |
| ... that are in the lexicon (typeable, can be suggested) | ${r.inLexicon} (${slurs.length} slurs, ${r.inLexicon - slurs.length} other) |
| ... that are the first reading of their code | ${firsts.length} (${firsts.filter((h) => h.slur).length} slurs) |
| Test items with any blocklisted word in the top 5 | ${r.itemsAny} of ${r.items} (${pct(r.itemsAny, r.items)}) |
| Test items with a **slur** in the top 5 | ${r.itemsSlur} of ${r.items} (${pct(r.itemsSlur, r.items)}) |
| Test items with a blocklisted word in the top-1 sentence | ${r.itemsTop1} |
| Identity slurs on the build's drop list (\`scripts/slurs.sha256.json\`) | ${SLUR_SHA256.size} |

## Words that appeared in a top-5 suggestion

${shown.length === 0 ? 'None.' : `${head}\n${shown.map(row).join('\n')}`}

## Slurs in the lexicon

${slurs.length === 0 ? 'None.' : `${head}\n${[...slurs].sort((a, b) => a.code.localeCompare(b.code) || a.id.localeCompare(b.id)).map(row).join('\n')}`}

"Rank in code" is the position under the word's keys, which is what Next (#) cycles through, so a
word at rank 2 is one press of # away from the first reading.

## Reading the numbers

- A word that is the only reading of its code (rank "1 of 1") appears only when someone types
  exactly its keys, so it is never an accident. ${slurs.filter((h) => h.readingsInCode === 1).length} of the ${slurs.length} slurs in the lexicon are like that.
- The other ${slurs.filter((h) => h.readingsInCode > 1).length} share a code with ordinary words. They are the ones that can show up by
  accident: as a lower-ranked sentence in the top 5 (${r.itemsSlur} test items here, ${pct(r.itemsSlur, r.items)}), or one or
  more presses of Next (#) away from the word the person wanted.
- ${r.itemsTop1 === 0 ? 'No blocklisted word reached a top-1 sentence on the test set.' : `A blocklisted word reached the top-1 sentence for ${r.itemsTop1} test items.`} The test sentences are polite
  conversation, so real use (other topics, rarer first readings) may expose more.
- The words marked **slur** are listed by hash in \`scripts/slurs.sha256.json\`; the lexicon build
  drops them (ADR-data-004) and \`test/data.test.ts\` checks the committed lexicon by hash, as for
  trademarks. A dropped word can still be typed on purpose: spell mode offers every letter on the
  keys pressed, and "Add to my words" puts the word back in the person's own dictionary. General
  profanity (marked **other**) stays.
`;
}

export function main(): number {
  if (!existsSync(BLOCKLIST.path)) {
    process.stderr.write(`missing ${relative(process.cwd(), BLOCKLIST.path)}: run \`pnpm -F @ninth/eval data:fetch\` first\n`);
    return 1;
  }
  const buf = readFileSync(BLOCKLIST.path);
  if (sha256(buf) !== BLOCKLIST.sha256) {
    process.stderr.write('blocklist SHA-256 differs from the pin in src/offensive.ts and scripts/fetch_datasets.py\n');
    return 1;
  }
  const { items, sha256: fixtureSha } = loadFixture();
  const lexicon = loadLexiconFile();
  const bigram = loadBigramFile();
  const r = analyse(items, lexicon.data, bigram.data, blocklistWords(buf.toString('utf8')));
  const out = join(EVAL_DIR, 'reports', 'offensive-readings.md');
  const statsPath = join(EVAL_DIR, 'build-stats', 'lexicon.json');
  const slurFilter = existsSync(statsPath) ? ((JSON.parse(readFileSync(statsPath, 'utf8')) as { slurs?: SlurFilterStats }).slurs ?? null) : null;
  writeFileSync(out, reportMarkdown(r, { fixtureSha, lexSha: lexicon.sha256, bigramSha: bigram.sha256, slurFilter }));
  if (process.argv.includes('--list')) {
    // Local triage only (stdout, never written to the repo): spelled words with their hashes.
    for (const h of r.hits.sort((a, b) => a.code.localeCompare(b.code))) {
      const w = blocklistWords(buf.toString('utf8')).find((x) => sha256(x).startsWith(h.id))!;
      process.stdout.write(`${sha256(w)} ${w} code=${h.code} rank=${h.rankInCode} top5=${h.itemsTop5}\n`);
    }
  }
  process.stderr.write(`wrote ${relative(process.cwd(), out)}\n`);
  return 0;
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) process.exit(main());

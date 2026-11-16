/** Markdown rendering of results (plan section 3.4 RESULTS template). */
import { LLM_CONFIGS } from './decoders';
import type { ConfigResult, Metrics, Results, Timing } from './types';

const isLlm = (id: string) => (LLM_CONFIGS as readonly string[]).includes(id);

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const f2 = (x: number) => x.toFixed(2);

function row(label: string, m: Metrics | undefined, t: Timing[string] | undefined, isLlm: boolean): string {
  if (!m) return `| ${label} | not run | | | | | | | | |`;
  const inv = m.invalidPreValidator === null ? 'n/a' : pct(m.invalidPreValidator);
  const usd = m.usdPer1k === null ? (isLlm ? 'n/a' : '0') : `$${f2(m.usdPer1k)}`;
  const p50 = t ? f2(t.p50) : '';
  const p95 = t ? f2(t.p95) : '';
  return `| ${label} | ${pct(m.wordAcc)} | ${pct(m.top1)} | ${pct(m.top5)} | ${pct(m.ksr)} | ${f2(m.scanStepsPerChar)} | ${inv} | ${p50} | ${p95} | ${usd} |`;
}

export function table(results: Results, timing: Timing): string {
  const head =
    '| Config | Word acc | Sent top-1 | Sent top-5 | KSR | Scan steps/char | Invalid pre-validator | p50 ms | p95 ms | $/1k |\n' +
    '|---|---|---|---|---|---|---|---|---|---|';
  const lines = results.configs.map((c: ConfigResult) =>
    row(c.label, c.status === 'ok' ? c.metrics : undefined, timing[c.id], isLlm(c.id)),
  );
  return [head, ...lines].join('\n');
}

export function sourceTable(results: Results): string {
  const out = ['| Config | Source | Items | Words | Word acc | Sent top-1 | Sent top-5 | KSR | Scan steps/char | Unreachable |', '|---|---|---|---|---|---|---|---|---|---|'];
  for (const c of results.configs) {
    if (c.status !== 'ok' || !c.bySource) continue;
    for (const [src, m] of Object.entries(c.bySource)) {
      out.push(
        `| ${c.label} | ${src} | ${m.items} | ${m.words} | ${pct(m.wordAcc)} | ${pct(m.top1)} | ${pct(m.top5)} | ${pct(m.ksr)} | ${f2(m.scanStepsPerChar)} | ${m.unreachable} |`,
      );
    }
  }
  return out.join('\n');
}

/** Initials-mode table (spec Req 9.2): one press per word, so presses/char is the headline. */
export function initialsTable(configs: readonly ConfigResult[], timing: Timing): string {
  const out = [
    '| Config | Word acc | Sent top-1 | Sent top-5 | Presses/char | KSR | Words retyped in letter mode | Unreachable items | Scan steps/char | p50 ms | p95 ms |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const c of configs) {
    const m = c.metrics;
    if (c.status !== 'ok' || !m) continue;
    const t = timing[c.id];
    out.push(
      `| ${c.label} | ${pct(m.wordAcc)} | ${pct(m.top1)} | ${pct(m.top5)} | ${f2(m.pressesPerChar)} | ${pct(m.ksr)} | ${m.retypedWords ?? 0} of ${m.words} | ${m.unreachable} | ${f2(m.scanStepsPerChar)} | ${t ? f2(t.p50) : ''} | ${t ? f2(t.p95) : ''} |`,
    );
  }
  return out.join('\n');
}

function initialsSection(results: Results, timing: Timing): string {
  const ini = results.initials;
  if (!ini) return '';
  const src = ['| Config | Source | Items | Word acc | Sent top-1 | Sent top-5 | Presses/char |', '|---|---|---|---|---|---|---|'];
  for (const c of ini.configs) {
    for (const [name, m] of Object.entries(c.bySource ?? {})) src.push(`| ${c.label} | ${name} | ${m.items} | ${pct(m.wordAcc)} | ${pct(m.top1)} | ${pct(m.top5)} | ${f2(m.pressesPerChar)} |`);
  }
  return `
## Initials mode, offline (plan section 3.3 "Phantom mode")

Same items, one press per word on the key of its first letter, 0 between words. The decoder sees
only those digits (\`lattice(codes, lex, 12, 'initials')\`). If the gold sentence is not in the top
5, the simulated user presses # through the slot's 12 readings, as the app does, and retypes in
letter mode any word that is not among them (its full code plus # presses, on top of the initial).
Letter-mode B1 needs ${f2(results.configs.find((c) => c.id === 'B1')?.metrics?.pressesPerChar ?? NaN)} presses per character on the same items.

The ${ini.coverage.perSlot}-word initials lattice holds ${pct(ini.coverage.wordsInLattice / (ini.coverage.words || 1))} of the gold words and every word of
${pct(ini.coverage.itemsInLattice / (ini.coverage.items || 1))} of the gold sentences (${ini.coverage.itemsInLattice} of ${ini.coverage.items}): that is the
ceiling for any ranker, B4 included, that keeps to listed words.

${initialsTable(ini.configs, timing)}

${src.join('\n')}
`;
}

/** B1 against B1c (Finish the word, web-ui Req 31): presses, words taken, scan steps on both grids. */
function completionSection(results: Results): string {
  const b1 = results.configs.find((c) => c.id === 'B1' && c.status === 'ok');
  const b1c = results.configs.find((c) => c.id === 'B1c' && c.status === 'ok');
  if (!b1c?.metrics) return '';
  const line = (c: ConfigResult, src?: string) => {
    const m = src ? c.bySource?.[src] : c.metrics;
    if (!m) return '';
    const app = m.scanStepsPerCharApp === undefined ? 'n/a' : f2(m.scanStepsPerCharApp);
    const done = m.completedWords === undefined ? '0' : pct(m.completedWords);
    return `| ${c.label} | ${src ?? 'all'} | ${m.items} | ${f2(m.pressesPerChar)} | ${pct(m.ksr)} | ${done} | ${pct(m.top1)} | ${f2(m.scanStepsPerChar)} | ${app} |`;
  };
  const rows: string[] = [];
  for (const src of [undefined, 'aac', 'turk']) for (const c of [b1, b1c]) if (c) rows.push(line(c, src));
  return `
## Finish the word (B1c)

B1c is B1 with Finish the word (web-ui Req 31): after each key the simulated user looks at the up to 3
words the app offers (core \`rankCompletions\`, ranked by the word pair before, limited to words the
word-pair model knows) and takes the gold word at the first chance that saves a press. Taking a word is
one press and closes it. Taken words stay fixed, the sentence is decoded with them, and the usual
corrections follow. It is an ideal user who never misses an offer, so real people will save less; fewer
presses is not the same as less time (reading the offers costs attention).

Scan steps/char is on the harness grid (sentences and the offered words in row 0, then the keypad);
"app grid" is the app's own order (keypad rows, then the 3 words, then 5 sentences), with the word row
counted as always there.

| Config | Source | Items | Presses/char | KSR | Words taken | Sent top-1 | Scan steps/char | Scan steps/char (app grid) |
|---|---|---|---|---|---|---|---|---|
${rows.filter(Boolean).join('\n')}
`;
}

export function resultsMarkdown(results: Results, timing: Timing, env: { node: string; platform: string }, initialsTiming: Timing = {}): string {
  const s = results.subset;
  return `# Ninth Life eval results

Generated by \`pnpm -F @ninth/eval eval\` (harness \`${results.harness}\`). Do not edit by hand.
Every number below was measured by the harness on the frozen test set; configs that were not
run say so. Method: \`docs/architecture/data-and-eval.md\` and \`.kiro/specs/eval-harness/\`.

- Test set: \`${results.fixture.path}\`, ${results.fixture.rows} items, SHA-256 \`${results.fixture.sha256.slice(0, 16)}…\` (see \`eval.lock\`)
- Run: ${s.quick ? `quick subset of ${s.items}` : `full set, ${s.items} items`}, seed ${s.seed}, k = ${results.k}, mode = ${results.mode}
- Lexicon: ${results.lexicon.words} words (\`data/lexicon/en.v1.json\`, SHA-256 \`${results.lexicon.sha256.slice(0, 16)}…\`); bigrams \`data/lexicon/en.bigram.v1.json\` (\`${results.bigram.sha256.slice(0, 16)}…\`)
- Language model: one-letter words other than "a" and "i" get a log10 penalty of ${results.lm.letterPenalty} (ADR-core-002)
- Latency: wall-clock per decode call on ${env.platform}, Node ${env.node}; not part of \`RESULTS.json\` (it varies run to run)

## Summary

${table(results, timing)}

KSR = 1 − (key presses + selections) / characters (letters, apostrophes and spaces). In letter
mode every letter is still one press, so KSR near 0 is the expected ceiling for B0/B1; negative
values are the cost of corrections. Scan steps/char counts single-switch auto-scan highlight
steps on the 6-row grid (candidates, 4 keypad rows, actions), driven through
\`@ninth/core\` \`scanReducer\`.

B2 to B4 call the Anthropic API, so the offline run never runs them. \`pnpm -F @ninth/eval llm\`
runs them (see \`docs/architecture/data-and-eval.md\` section 4) and writes one "Model ranking"
section per model and mode below, each with its date, item count and the B0/B1 rows for the same
items.

## By source

${sourceTable(results)}

"Unreachable" = items with a word that is not in the lexicon, so neither decoding nor cycling can
produce it (names, rare spellings).
${completionSection(results)}${initialsSection(results, initialsTiming)}`;
}

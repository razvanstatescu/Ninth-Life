/**
 * RESULTS.md sections and RESULTS.llm.json for model runs (spec Req 8.6).
 *
 * Each (model, mode) pair owns one section of RESULTS.md between
 * `<!-- llm-run:<model>:<mode> -->` and `<!-- /llm-run:<model>:<mode> -->`. A run replaces its own
 * section and keeps the others; the offline `pnpm eval` keeps every section when it rewrites the
 * rest of the file. RESULTS.llm.json holds the same numbers without dates or timings (Req 6.2).
 */
import type { ConfigResult, Metrics, Timing } from '../types';

export interface LlmRunResults {
  harness: string;
  model: string;
  label: string;
  anthropicVersion: string;
  mode: 'letter' | 'initials';
  k: number;
  fixture: { path: string; sha256: string };
  subset: { items: number; limit: number | null; seed: number };
  configs: ConfigResult[];
  /** 'oracle': reply type read off the gold sentence (ADR-008); an upper bound, its own section. */
  intent?: 'oracle';
}

export interface LlmResultsFile {
  harness: string;
  runs: Record<string, LlmRunResults>;
}

export interface SectionContext {
  /** UTC date of the run, YYYY-MM-DD. */
  date: string;
  dryRun: boolean;
  concurrency: number;
  command: string;
  network: { sent: number; hits: number; retries: number; spentUsd: number };
}

const OPEN = (id: string) => `<!-- llm-run:${id} -->`;
const CLOSE = (id: string) => `<!-- /llm-run:${id} -->`;
const ANY_SECTION = /<!-- llm-run:([^ ]+) -->[\s\S]*?<!-- \/llm-run:\1 -->\n?/g;

export const runId = (model: string, mode: string, intent?: 'oracle') => `${model}:${mode}${intent ? `:intent-${intent}` : ''}`;

/** All model-run sections in a RESULTS.md, in file order, each ending with a newline. */
export function llmSections(md: string): string[] {
  return [...md.matchAll(ANY_SECTION)].map((m) => (m[0].endsWith('\n') ? m[0] : m[0] + '\n'));
}

/** Replace the section with this id, or append it; every other byte of `md` is kept. */
export function upsertSection(md: string, id: string, section: string): string {
  const block = section.endsWith('\n') ? section : section + '\n';
  const start = md.indexOf(OPEN(id));
  if (start >= 0) {
    const endTag = CLOSE(id);
    const end = md.indexOf(endTag, start);
    if (end < 0) throw new Error(`RESULTS.md: section ${id} has no closing marker`);
    let after = end + endTag.length;
    if (md[after] === '\n') after++;
    return md.slice(0, start) + block + md.slice(after);
  }
  const base = md.length === 0 || md.endsWith('\n\n') ? md : md.endsWith('\n') ? md + '\n' : md + '\n\n';
  return base + block;
}

/** Keep the model-run sections of `oldMd` after a regenerated offline report. */
export function withLlmSections(newMd: string, oldMd: string): string {
  return llmSections(oldMd).reduce((md, s) => {
    const id = /<!-- llm-run:([^ ]+) -->/.exec(s)![1]!;
    return upsertSection(md, id, s);
  }, newMd);
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const f2 = (x: number) => x.toFixed(2);
const per = (total: number, calls: number) => (calls > 0 ? Math.round(total / calls).toLocaleString('en-US') : '');
const money = (x: number) => (x < 0.01 ? `$${x.toFixed(4)}` : `$${x.toFixed(2)}`);

function row(c: ConfigResult, t: Timing[string] | undefined, mode: string): string {
  const m = c.metrics as Metrics;
  const l = c.llm;
  const inv = m.invalidPreValidator === null ? 'n/a' : pct(m.invalidPreValidator);
  const usdPer1k = m.usdPer1k === null ? '0' : `$${m.usdPer1k.toFixed(3)}`;
  const lat = t && l ? [f2(t.p50), f2(t.p95), pct(t.overDeadline ?? 0)] : t ? [f2(t.p50), f2(t.p95), 'n/a'] : ['', '', ''];
  const tokens = l ? [String(l.calls), per(l.inputTokens + l.cacheReadTokens + l.cacheWriteTokens, l.calls), per(l.outputTokens, l.calls), per(l.cacheReadTokens, l.calls)] : ['', '', '', ''];
  const modeCols = mode === 'initials' ? [f2(m.pressesPerChar)] : [];
  return `| ${c.label} | ${pct(m.wordAcc)} | ${pct(m.top1)} | ${pct(m.top5)} | ${pct(m.ksr)} | ${modeCols.map((x) => x + ' | ').join('')}${inv} | ${lat.join(' | ')} | ${tokens.join(' | ')} | ${usdPer1k} |`;
}

export function renderSection(run: LlmRunResults, timing: Timing, ctx: SectionContext): string {
  const id = runId(run.model, run.mode, run.intent);
  const s = run.subset;
  const subset = s.limit === null ? `full set, ${s.items} items` : `seeded sample of ${s.items} items (\`--limit ${s.limit}\`, seed ${s.seed})`;
  const title = ctx.dryRun
    ? `## DRY RUN, fake Messages API (not a measurement): ${run.model}, ${run.mode} mode, ${s.items} items, ${ctx.date}`
    : `## Model ranking: ${run.model}, ${run.mode} mode, ${s.items} items, ${ctx.date}`;
  const intentNote = run.intent
    ? [`- Reply type: read off the gold sentence ("?" ask, no/not/never first disagree, yes/ok first agree), only on items with a partner line. **An upper bound, not a measurement of real use.** B1i is B1 re-ranked for the reply type; B4 sends it as \`context.intent\` with re-ranked beams.`]
    : [];
  const initials = run.mode === 'initials';
  const head =
    `| Config | Word acc | Sent top-1 | Sent top-5 | KSR | ${initials ? 'Presses/char | ' : ''}Invalid pre-validator | p50 ms | p95 ms | Calls > 1.2 s | Calls | In tok/call | Out tok/call | Cache-read tok/call | $/1k |\n` +
    `|---|---|---|---|---|${initials ? '---|' : ''}---|---|---|---|---|---|---|---|---|`;
  const rows = run.configs.filter((c) => c.status === 'ok').map((c) => row(c, timing[c.id], run.mode));
  const src = ['| Config | Source | Items | Word acc | Sent top-1 | Sent top-5 |', '|---|---|---|---|---|---|'];
  for (const c of run.configs) {
    for (const [name, m] of Object.entries(c.bySource ?? {})) src.push(`| ${c.label} | ${name} | ${m.items} | ${pct(m.wordAcc)} | ${pct(m.top1)} | ${pct(m.top5)} |`);
  }
  const notes = run.configs
    .filter((c) => c.llm)
    .map((c) => {
      const l = c.llm!;
      const parts = [`${l.calls} calls`, `${money(l.usd)}`, `${l.refusals} refusals`, `${l.unparseable} unparseable replies`];
      if (c.id === 'B4') parts.push(`${l.degraded} answered from ghost beams only`, `${l.skipped} not sent (a slot with no lexicon word, as in the app)`);
      return `- ${c.label}: ${parts.join(', ')}`;
    });
  const n = ctx.network;
  return [
    OPEN(id),
    title,
    '',
    `Written by \`${ctx.command}\`; the next run of this model and mode replaces this section.` +
      (ctx.dryRun ? ' **Dry run: every reply came from the in-process fake API; the numbers only show that the path works.**' : ''),
    '',
    `- Model: \`${run.model}\` (\`${run.label}\`), ${run.model.startsWith('MiniMax') ? 'MiniMax Anthropic-compatible API' : 'Anthropic Messages API'}, \`anthropic-version: ${run.anthropicVersion}\``,
    `- Run: ${ctx.date} (UTC), ${subset}, k = ${run.k}, mode = ${run.mode}, concurrency ${ctx.concurrency}`,
    `- This run: ${n.sent} requests sent, ${n.hits} replies from the response cache, ${n.retries} retries, ${money(n.spentUsd)} spent`,
    ...intentNote,
    `- B0 and B1 rows are the offline baselines on the same items. Tokens and cost come from each reply's \`usage\` at \`packages/decoder/src/models.ts\` list prices; "In tok/call" counts uncached, cache-read and cache-write input. Latency is the recorded time of each successful API call (a cached reply keeps its original time); "Calls > 1.2 s" would have fallen back to ghost beams at the route's deadline.`,
    '',
    head,
    ...rows,
    '',
    ...src,
    '',
    ...notes,
    CLOSE(id),
    '',
  ].join('\n');
}

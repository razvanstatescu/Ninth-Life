/**
 * Scene 14 (third cut, 2026-11-19) quotes real lines from the repository: its .kiro/ folder and the GitHub workflow that
 * runs the Kiro CLI. Every line here is a whole line copied exactly from its file (leading spaces included), with its
 * line number. Lines are only ever CUT (left out), never edited. Check them against the files with:
 *
 *   npx tsx src/components/close/verify-kiro.ts
 *
 * Truth (decision D15, docs/KIRO_LOG.md): the chapter says "Made for Kiroween 2026", never "Built with Kiro". It shows
 * what the specs, steering, hooks, agents and the CLI workflow are in this repository. The kiro-review workflow is set
 * up but has not run yet (the owner's choice, 2026-11-19: show the setup, the narrator says "can review"), so no review
 * text is shown: only the comment's real header and footer lines from the workflow.
 */

export type SourceLine = {
  n: number;
  /** The whole line, exactly as in the file (checked). */
  text: string;
  /**
   * Third cut, second pass: when a line is too long for a clean card, the pieces of it that are shown, in order, joined
   * by " … " (and with "…" where the line goes on). Each piece is checked to appear in the line, in this order.
   */
  show?: string[];
};
export type KiroLang = 'ears' | 'md' | 'json' | 'yaml';
export type KiroCard = { title: string; path: string; lang: KiroLang; lines: SourceLine[] };

/** What a card shows for a line: the whole line, or its pieces with the cuts marked "…". */
export const shownText = (l: SourceLine) => {
  if (!l.show?.length) return l.text;
  const body = l.text.trimStart();
  const first = l.show[0]!;
  const last = l.show[l.show.length - 1]!;
  const lead = body.startsWith(first) ? '' : '… ';
  const tail = body.endsWith(last) ? '' : ' …';
  return l.text.slice(0, l.text.length - body.length) + lead + l.show.join(' … ') + tail;
};

/**
 * Second pass (owner's review 2026-11-19: "messy, text getting out of boxes"): every quoted line now fits one line of a
 * card at 36 px or more; cards size to their content. Short lines were chosen; two long lines show only the part that
 * matters, with the cuts marked and checked.
 */
export const KIRO = {
  spec: {
    title: 'Spec',
    path: '.kiro/specs/web-ui/requirements.md',
    lang: 'ears',
    lines: [{ n: 30, text: '1.3 WHEN 0 is pressed, THE app SHALL commit the current word.' }],
  },
  task: {
    title: 'Task',
    path: '.kiro/specs/web-ui/tasks.md',
    lang: 'md',
    lines: [
      {
        n: 11,
        text: '- [x] 5. `lib/composer.ts` reducer for 2-9, 0, *, #, 1, select, clear, spoken (Req 1.2-1.6, 1.9, 2.3)',
        show: ['- [x] 5. `lib/composer.ts` reducer', '(Req 1.2-1.6, 1.9, 2.3)'],
      },
    ],
  },
  product: {
    title: 'Steering',
    path: '.kiro/steering/product.md',
    lang: 'md',
    lines: [{ n: 45, text: '- No accounts, no cookies, no analytics, no ads, no paid tier.' }],
  },
  privacy: {
    title: 'Steering',
    path: '.kiro/steering/privacy.md',
    lang: 'md',
    lines: [{ n: 28, text: '- Ghost mode never depends on the network.' }],
  },
  hookPbt: {
    title: 'Hook',
    path: '.kiro/hooks/core-pbt-on-save.json',
    lang: 'json',
    lines: [
      { n: 5, text: '      "name": "core-pbt-on-save",' },
      { n: 7, text: '      "trigger": "PostFileSave",' },
    ],
  },
  hookTm: {
    title: 'Hook',
    path: '.kiro/hooks/trademark-guard.json',
    lang: 'json',
    lines: [
      { n: 5, text: '      "name": "trademark-guard",' },
      { n: 7, text: '      "trigger": "PostFileSave",' },
    ],
  },
  cli: {
    title: 'GitHub Actions',
    path: '.github/workflows/kiro-review.yml',
    lang: 'yaml',
    lines: [
      {
        n: 92,
        text: '          kiro-cli chat --v3 --no-interactive --agent pr-reviewer "${MODEL_ARGS[@]}" \\',
        show: ['kiro-cli chat --v3 --no-interactive --agent pr-reviewer'],
      },
    ],
  },
  agent: {
    title: 'Agent',
    path: '.kiro/agents/pr-reviewer.json',
    lang: 'json',
    lines: [
      { n: 5, text: '  "tools": ["read"],' },
      { n: 6, text: '  "excludedTools": ["write", "shell", "web"],' },
    ],
  },
} satisfies Record<string, KiroCard>;

/**
 * The workflow's own step names (kiro-review.yml lines 61, 66, 104) and its trigger (line 13), for the pipeline; and
 * the comment it posts: the header and footer it echoes (lines 111 and 115), as GitHub renders them. Checked too.
 */
export const PIPELINE = {
  trigger: { n: 13, text: '    types: [labeled, synchronize, reopened]' },
  steps: [
    { n: 61, text: '      - name: Install Kiro CLI' },
    { n: 66, text: '      - name: Kiro review (CLI V3, headless, read-only agent)' },
    { n: 104, text: '      - name: Post the review on the PR' },
  ],
  commentHeader: { n: 111, text: '            echo "## Kiro review (headless, agent \\`pr-reviewer\\`)"' },
  commentFooter: { n: 115, text: '            echo "<sub>Kiro CLI V3, \\`--no-interactive\\`, read-only tools. [Run log](${RUN_URL}). Remove the \\`kiro-review\\` label to stop automatic reviews.</sub>"' },
};
export const WORKFLOW_PATH = '.github/workflows/kiro-review.yml';

/** What the comment shows, rendered from the two echo lines above (Markdown header; the footer's first sentence). */
export const COMMENT = { header: 'Kiro review (headless, agent pr-reviewer)', footer: 'Kiro CLI V3, --no-interactive, read-only tools.' };

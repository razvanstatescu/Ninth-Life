/**
 * Scene 14 shows real text from the repository's .kiro/ folder: one excerpt per card. Every line here is a
 * whole line copied exactly from its file (leading spaces included), with its line number. Lines are only
 * ever CUT (left out), never edited. Check them against the files with:
 *
 *   npx tsx src/components/close/verify-kiro.ts
 *
 * Why these: docs/KIRO_LOG.md (rows of 2026-11-10) shows Kiro used with specs, steering, hooks and a
 * workflow. The cards show what those are in this repository; nothing says Kiro wrote these lines (the
 * history rule in .kiro/steering/product.md, "How we work": the files were first written outside Kiro).
 */

export type SourceLine = { n: number; text: string };
export type KiroLang = 'ears' | 'md' | 'json';
export type KiroCard = { title: string; path: string; lang: KiroLang; lines: SourceLine[] };

export const KIRO_CARDS: KiroCard[] = [
  {
    title: 'Spec',
    path: '.kiro/specs/web-ui/requirements.md',
    lang: 'ears',
    lines: [{ n: 29, text: "1.2 WHEN a key 2-9 is pressed, THE app SHALL append its digit to the current word's code." }],
  },
  {
    title: 'Steering',
    path: '.kiro/steering/privacy.md',
    lang: 'md',
    lines: [{ n: 28, text: '- Ghost mode never depends on the network.' }],
  },
  {
    title: 'Hook',
    path: '.kiro/hooks/trademark-guard.json',
    lang: 'json',
    lines: [
      { n: 5, text: '      "name": "trademark-guard",' },
      { n: 7, text: '      "trigger": "PostFileSave",' },
    ],
  },
  {
    title: 'Workflow',
    path: '.kiro/workflows/ship-feature.workflow.json',
    lang: 'json',
    lines: [
      { n: 2, text: '  "name": "ship-feature",' },
      { n: 10, text: '      "id": "plan",' },
      { n: 33, text: '          "id": "implement",' },
      { n: 40, text: '          "id": "verify",' },
    ],
  },
];

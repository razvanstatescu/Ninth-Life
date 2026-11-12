/**
 * Step classes for the website's played drawings (marketing-site design "Round 2" R2.2; design.md 3.2).
 * A drawing's animated parts carry one role class and step classes; the base styles show the finished
 * state and site.css plays the sequence once (A7, MS-8.11). The classes come only from these typed
 * helpers, so a drawing cannot ask for a step with no CSS rule.
 */

export type KStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type UStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type PlayClass = 'frame' | 'quick' | 'sweep' | 'type';
/** A step range [k, u] for parts that show from k until u. */
export type Span = readonly [KStep, UStep];

/** The class list of an animated part, for example role('in', 3) === 'site-in site-k3'. */
export function role(r: 'in' | 'rise' | 'mark', k: KStep): string;
export function role(r: 'out', u: UStep): string;
export function role(r: 'during', k: KStep, u: UStep): string;
/** role('ring', 1, 2) === 'site-ring site-k1 site-u2'; role('ring', 2, 3, 'late') adds 'site-late'. */
export function role(r: 'ring', k: KStep, u: UStep, late?: 'late'): string;
export function role(r: 'in' | 'rise' | 'mark' | 'out' | 'during' | 'ring', a: number, b?: number, late?: 'late'): string {
  if (r === 'out') return `site-out site-u${a}`;
  if (r === 'during' || r === 'ring') return `site-${r} site-k${a} site-u${b}${late ? ' site-late' : ''}`;
  return `site-${r} site-k${a}`;
}

/** The class of a drawing root, for example play('quick') === 'site-play--quick'. */
export function play(p: PlayClass): string {
  return `site-play--${p}`;
}

/** Duration of each role's change in ms: motion-state for fades, motion-jump for rings and marks. */
const STATE_MS = 200;
const JUMP_MS = 120;

/**
 * The last change of a part in ms after the trigger, for a given step length and lead (the MS-8.11
 * totals test): the lead plus its last step times the step length plus the change's duration. A late
 * ring (a repeated press) fades in motion-jump after its step, which never ends after its own u.
 */
export function lastChangeMs(classes: string, stepMs: number, leadMs: number): number {
  const names = classes.split(/\s+/);
  const step = (prefix: 'k' | 'u') => {
    const hit = names.find((n) => new RegExp(`^site-${prefix}\\d+$`).test(n));
    return hit ? Number(hit.slice(`site-${prefix}`.length)) : null;
  };
  const k = step('k');
  const u = step('u');
  const jump = names.includes('site-ring') || names.includes('site-mark');
  const late = names.includes('site-late') ? JUMP_MS : 0;
  const ends = [
    k === null ? 0 : leadMs + k * stepMs + late + (jump ? JUMP_MS : STATE_MS),
    u === null ? 0 : leadMs + u * stepMs + (jump ? JUMP_MS : STATE_MS),
  ];
  return Math.max(...ends);
}

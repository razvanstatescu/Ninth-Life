# Landing page, round 2: motion and box visuals (design)

Status: **final, revision 3** (2026-11-11). The product owner accepted every recommendation (1-16), the ADR-006
amendment and the MS-10.8 exception; decisions V1-V17 in `decisions.md` in this folder. Revision 2 fixed the 19
findings of the first design review (decisions V18-V24). Revision 3 fixes the 14 findings of the second review
(`design-review.md`, revision 2; decisions V25-V31). None of them changes a product call; responses in §10 and §11.
Branch `main`, built on the uncommitted round-1 landing page as it is in the working tree. Nothing here is built yet.

Inputs: the request of 2026-11-11 (How it works scroll animation, the proof figure, a micro animated visual in all
4 "Made for both sides" boxes, all 5 "Works the way you type" boxes and all 4 "Offline unless you choose" boxes);
research `docs/research/marketing-site/motion-v2.md` and `box-visuals.md`; spec `.kiro/specs/marketing-site/`;
ADR-006 (amended 2026-11-11); D1-D15; the design system; steering; the code in `packages/web/app/page.tsx` and
`components/site/`.

Decoder facts used below, checked 2026-11-11 with `decodeGhost` and `Lexicon.completions` on
`data/lexicon/en.v1.json` and `en.bigram.v1.json`: `4` → i, h, g; `46` → i'm, in, go; `466` → hmm, ion, inn;
`4663` → good, home, gone (also hood); `4 6333 92837` → i need water; "mihai" is not in the dictionary and encodes
to 64424. The drawings take these values from `site-data.ts` at build time, never typed by hand.

## 1. Overview

Round 1 drew with scroll-linked frames (A5). Measured on the dev server (motion-v2 §2, box-visuals §2): the How
frames all pass within 70-90px of scroll on desktop and before the step text is on screen on phones; the proof
figure reaches its finished frame only when it is about to leave the screen; box drawings freeze on middle frames;
9 of 13 boxes have no drawing and cards stretch to the tallest one.

This round retires A5 and adds two bounded kinds of website motion (ADR-006 amendment of 2026-11-11), both driven
by IntersectionObservers in `SiteMotion` and CSS animations of `opacity` and `transform`:

- **A7, played sequences.** A drawing marked `data-play` plays its sequence once per page view when it reaches the
  play line (30% above the bottom of the viewport) and rests on its finished state, which is also what the base
  styles show. A drawing reaches the play line when its whole box is between the top of the viewport and the line,
  or, if it is too tall for that, when its top reaches the top of the viewport (3.3, V25).
- **A8, How step sync (desktop).** The step card under the middle line of the viewport is the active step; the
  sticky How picture plays that step's sequence the first time it becomes active and shows each step's finished
  state on later visits. A picture already in view at load with no step active yet starts the story when step 1
  becomes active (V26).

Every one of the 13 boxes gets a drawing built from our own components in a fixed-height stage. The How picture
becomes one small app screen that the three steps act on; the proof figure becomes one stable layout in which
letters turn into key digits in place. No new client component, no library, no image, no request. Reduced motion,
no JavaScript or no IntersectionObserver: every drawing shows its finished state and `document.getAnimations()` is
empty.

## 2. Technology stack (unchanged, locked)

Next.js 15.1.12 App Router, React 19, TypeScript 5.6, Vitest 2.1 with Testing Library, Playwright 1.63 scripts,
Lighthouse 13.6.0 (dev only). Drawings are server components (HTML plus inline SVG from `Icon.tsx`). CSS in
`components/site/site.css`; motion logic in `SiteMotion.tsx` and pure helpers in `motion.ts`. Only `KeypadDemo` and
`SiteMotion` are client components (MS-11.3). CSS animations only: no Web Animations API calls, no scroll
listeners, no `requestAnimationFrame`, no timers for drawings, no `animation-timeline`.

## 3. Motion model

### 3.1 New tokens (`design/system/tokens.json`, then `pnpm -F @ninth/web tokens`)

| Token | Value | Usage (as written into tokens.json) |
|---|---|---|
| `motion-state` | `200ms` | Website: one state change inside a drawing (a fade, with at most `motion-nudge` of rise). |
| `motion-nudge` | `8px` | Website: the most an arriving part of a drawing moves. |
| `motion-play-lead` | `300ms` | Website: wait between a drawing reaching the play line and its first change. |
| `motion-frame` | `600ms` | Website: time between steps of a played box drawing. |
| `motion-frame-quick` | `400ms` | Website: time between steps of the switch and ranking drawings (the app's fastest scan step). |
| `motion-sweep` | `240ms` | Website: time between steps of the proof check and the How sentence rows. |

Existing tokens used: `motion-jump` 120 ms (rings and marks), `motion-demo-step` 520 ms (How typing, as the hero
demo), `motion-ease-out`, `motion-ease-linear`, `motion-stagger`.

### 3.2 Roles: how a drawing describes its sequence

A drawing's animated parts carry one role class and step classes. The base styles (outside every media query)
show the finished state; motion only adds the before-play state and the animations.

| Role | Meaning | Base (finished) | Before play (motion on) | Play |
|---|---|---|---|---|
| `.site-in` | appears at step k | `opacity: 1` | `opacity: 0` | `site-in` (0 → 1), `motion-state`, `motion-ease-out`, delay t(k) |
| `.site-rise` | appears at step k, rising | `opacity: 1` | `opacity: 0; transform: translateY(var(--motion-nudge))` | `site-rise` (from that to none), `motion-state`, delay t(k) |
| `.site-out` | goes at step u | `opacity: 0` | `opacity: 1` | `site-out` (1 → 0), `motion-state`, delay t(u) |
| `.site-during` | shows from k until u | `opacity: 0` | `opacity: 0` | `site-out` at t(u), then `site-in` at t(k) (in that order in the list) |
| `.site-ring` | a pressed ring, scan ring or column box from k until u | `opacity: 0` | `opacity: 0` | as `.site-during`, over `motion-jump` with `motion-ease-linear`; with `.site-late` its `site-in` starts `motion-jump` after t(k) |
| `.site-mark` | a ring, check or box that jumps on at k and stays | `opacity: 1` | `opacity: 0` | `site-in` over `motion-jump`, `motion-ease-linear`, delay t(k) |

**Drawing play rules use fill mode `backwards` only, never `forwards` or `both`.** "Drawing play rules" are the
rules whose selector contains `[data-play]`, `[data-how-play]` or `.site-how__picture [data-s`; the round-1 rules
A1 (moon glow), A2 (ninth-key ring) and A4 (reveals) keep their `both` fills unchanged. During its delay an animation holds its first
keyframe; after it ends it no longer applies, and the base style (the finished state) takes over. For
`.site-during` and `.site-ring` the list order `site-out t(u), site-in t(k)` makes the later `site-in` win while it
holds 0 before t(k); between the end of `site-in` and t(u) the `site-out` delay holds 1; after `site-out` the base
0 applies. So a finished drawing keeps no animation objects: `getAnimations()` on it is empty, which is what
`site.mjs` checks.

**Ring handovers and repeated presses (V29).** When one ring goes at step n and the next comes at step n, the first
fades out over `motion-jump` while the second fades in over the same 120 ms. That handover counts as one ring for
MS-7.3 (the hero demo hands its ring over the same way). When the same key is pressed twice in a row (the two 6s
of 4663), the second press is its own ring with `.site-late`: the first ring fades out, then the second fades in,
so the key visibly dips between the two presses and each press shows once (V35). `.site-ring` declares
`--late: calc(var(--motion-jump) * 0)` and `.site-late` sets `--late: var(--motion-jump)` (no `0ms` literal, which
the MS-8.2 test bans); the ring's `site-in` delay is `calc(t(k) + var(--late))`. Nothing repeats: it is two
presses, each shown once.

Step classes: `.site-k0` to `.site-k12` set `--k`, `.site-u0` to `.site-u13` set `--u` (27 one-line rules). In
TSX they come only from the typed helpers in `components/site/pictures/roles.ts`, so a drawing cannot ask for a
class with no rule:

```ts
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
/** The class of a drawing root, for example play('quick') === 'site-play--quick'. */
export function play(p: PlayClass): string;
/** The last change of a part in ms for a given step length, used by the MS-8.11 totals test. */
export function lastChangeMs(classes: string, stepMs: number, leadMs: number): number;
```

Sequences that step through a list use typed tables, never arithmetic on step numbers, so no cast is needed
(`4 + c` would be `number`). The tables are tuples, indexed by literal unions or mapped with their index, because
`noUncheckedIndexedAccess` is on and indexing a plain array with a `number` gives `T | undefined` (V34):

```ts
type ProofColumn = 0 | 1 | 2 | 3 | 4;   // site-data.ts; ProofExample.reject.diffAt
type Row = 0 | 1 | 2;
// pictures/HowScreen.tsx
const TYPING: readonly [Span, Span, Span] = [[0, 1], [1, 2], [2, 3]];  // mapped with its index into how.typing[0..2]; typing[3] is role('in', 3)
// Pictures.tsx (ProofCheck)
const SWEEP: readonly [Span, Span, Span, Span, Span] = [[4, 5], [5, 6], [6, 7], [7, 8], [8, 9]];
// boxes: SWEEP.map((span, c) => <span key={c} className={`site-proof__box ${role('ring', ...span)}`} />)
const DIGIT_LINE: readonly [KStep, KStep, KStep] = [1, 2, 3];          // word rows' digit lines, DIGIT_LINE[row]
const CHIP: readonly [KStep, KStep, KStep] = [9, 10, 11];              // word rows' real chips, CHIP[row]
// rows: ([0, 1, 2] as const).map((row: Row) => …); the dropped word's box and x: role('mark', SWEEP[diffAt][0])
```

A unit test (`MS-8.11 every step class used on the page has a CSS rule`) collects every `site-k*` and `site-u*`
class in the rendered page and finds a rule for each in `site.css`.

A drawing root sets its step length with one class:

| Class | `--play-step` |
|---|---|
| `.site-play--frame` | `var(--motion-frame)` |
| `.site-play--quick` | `var(--motion-frame-quick)` |
| `.site-play--sweep` | `var(--motion-sweep)` |
| `.site-play--type` | `var(--motion-demo-step)` |

```css
--play-lead: calc(var(--motion-play-lead) + var(--play-i, 0) * var(--motion-frame) + var(--play-after, calc(var(--motion-jump) * 0)));
t(k) = calc(var(--play-lead) + var(--k) * var(--play-step))
```

(Iteration 2, review N7, V39: the column step was `motion-state`, 200 ms, which let the single rings of Saved
phrases and Spell and My words show together for 400 ms. It is now `motion-frame`, 600 ms, so a neighbour's
one-step ring has handed over (V29) before the next starts. Touch also waits `--play-after: calc(4 *
var(--motion-frame-quick))` for the Keyboard drawing's four rings, which now play at the quick step. In every row
of two cards no two ember rings show together, and every drawing still ends by 4 s; `site.test.tsx` computes
both. Two rows can still overlap if a fast scroll brings both to the play line at once; accepted.)

`--play-lead` is declared on `:is([data-play], .site-how__picture)`. The lead no longer uses `--reveal-i` (the
reveal stagger counts cards in DOM order, so it gave the How stages 300, 500 and 700 ms in one column and the two
cards of a 2 × 2 grid's second row the same lead). Instead `--play-i` is the card's **column in its row**, set by
layout CSS on the cards (V28); it is 0 everywhere else (one-column layouts, the How stages and picture, the proof
figure), so those leads are 300 ms. The `--play-i` rules sit inside the motion block, in the same media queries as
the grid layouts they follow:

| Layout | `--play-i` 1 | `--play-i` 2 |
|---|---|---|
| `.site-grid--boxes` from 648px (Conversation, Privacy) | `> :nth-child(2n)` | none |
| Access from 648px, every width (row 1: Keyboard, Touch; row 2: Switch, Your view; row 3: Phones across both columns) | `> :nth-child(4)` (Touch, `> :nth-child(2)`, has `--play-i` 0 and `--play-after` 1,600 ms instead) | none |

Each drawing triggers on its own geometry, so two drawings in one row trigger together and then start 600 ms apart
(Touch 1,600 ms); the largest lead is 1,900 ms (Touch, which ends at 3.22 s). Parts that replace each other share one grid cell (`.site-cell { display: grid }
.site-cell > * { grid-area: 1 / 1 }`), sized by the largest part, so no change moves anything. Rings, marks and the
column boxes are absolutely positioned overlays. Roles may nest (a `.site-out` wrapper around a `.site-in` part);
opacities multiply, which the How well uses (4.1).

All motion rules sit inside `@media (prefers-reduced-motion: no-preference)` and under
`[data-site-motion="on"]`:

```css
[data-site-motion="on"] [data-play]:not([data-played]) :is(.site-in, .site-mark) { opacity: 0; }
[data-site-motion="on"] [data-play]:not([data-played]) .site-rise { opacity: 0; transform: translateY(var(--motion-nudge)); }
[data-site-motion="on"] [data-play]:not([data-played]) .site-out { opacity: 1; }
[data-site-motion="on"] [data-play][data-played="1"] .site-in {
  animation: site-in var(--motion-state) var(--motion-ease-out) calc(var(--play-lead) + var(--k) * var(--play-step)) backwards;
}
/* site-rise, site-out, site-during, site-ring and site-mark likewise; three @keyframes: site-in, site-out, site-rise */
[data-site-motion="on"] [data-play][data-played="1"] .site-ring {
  animation:
    site-out var(--motion-jump) var(--motion-ease-linear) calc(var(--play-lead) + var(--u) * var(--play-step)) backwards,
    site-in var(--motion-jump) var(--motion-ease-linear) calc(var(--play-lead) + var(--k) * var(--play-step) + var(--late)) backwards;
}
.site-ring { --late: calc(var(--motion-jump) * 0); }   /* inside the motion block, like the step classes */
.site-ring.site-late { --late: var(--motion-jump); }
```

`data-played="instant"` matches no play rule and no before-play rule, so it is the finished state.

**Total length.** Last change = `--play-lead` (at most 300 + 2 × 200 = 700 ms) + largest step × step length +
the last change's duration. Every drawing is at most 4,000 ms (table in 4.4; a unit test computes it).

### 3.3 Triggers in `SiteMotion` (A7, A8)

`SiteMotion` keeps its reveal observer and arrival timer and gains, inside the same `move()` / `still()` pair:

Which elements are `data-play` roots: every box drawing, the proof figure, and the three per-step How stages
(shown under 1024px). The desktop How picture (`.site-how__picture`) is **not** a `data-play` root: only the A8
context rules on `.site-how` drive it (4.1).

The pure helpers in `motion.ts`:

```ts
interface Boxed { getBoundingClientRect(): { top: number }; getClientRects(): { length: number } }
/** instant: has a box and its top is above the bottom of the viewport (in view or scrolled past).
 *  later: everything else, including elements with no box (display: none), which stay observed. */
export function splitInitialPlay<E extends Boxed>(elements: readonly E[], viewportHeight: number): { instant: E[]; later: E[] };
/** True when a drawing has reached the play line (V32). A drawing that fits above the line (height at most
 *  0.7 * viewportHeight) plays only with its whole box on screen and either its bottom at or above the line or its
 *  top in the top band (the top 30% of the viewport); a taller one plays with its whole box on screen, or with its
 *  top between one band above the top of the viewport and the top, and its bottom at or below the line. 1px is
 *  allowed for sub-pixel rounding. Never with its bottom at or above 0 or its top at or below the bottom of the
 *  viewport. */
export function shouldPlay(rect: { top: number; bottom: number }, viewportHeight: number): boolean;
/** The number of tops at or above the middle line (0-3). */
export function activeStep(tops: readonly number[], middle: number): 0 | 1 | 2 | 3;
/** How the desktop How picture starts when motion starts:
 *  'live'     the picture has a box and its top is at or below the bottom of the viewport;
 *  'deferred' the picture has a box, its top is above the bottom of the viewport, and step is 0;
 *  'finished' no box (under 1024px), or step is 1 or more. */
export function howStart(picture: Boxed, viewportHeight: number, step: 0 | 1 | 2 | 3): 'live' | 'deferred' | 'finished';
```

```ts
export function shouldPlay(r: { top: number; bottom: number }, vh: number): boolean {
  if (r.bottom <= 0 || r.top >= vh) return false;
  const line = vh * PLAY_LINE;                                         // PLAY_LINE = 0.7
  const band = vh - line;                                              // the top band, 30% of the viewport
  const inView = r.top >= -1 && r.bottom <= vh + 1;                    // the whole box on screen
  if (r.bottom - r.top <= line) return inView && (r.bottom <= line + 1 || r.top <= band + 1); // fits above the line
  return inView || (r.top <= 1 && r.top >= -band - 1 && r.bottom >= line - 1); // too tall: in view, or covering the play area
}
```

**Play range (review B2 and N1, iteration 2).** Two bounds were added, each with unit cases in
`site-motion.test.tsx` and a `site.mjs` flick pass:

- *Fits above the line* (most box drawings): it plays with its whole box on screen and its top anywhere from the
  top of the viewport down to `max(line - height, band)`. Before, the window was `line - height` alone, which for
  the 376px switch drawing is 8px at 375 × 549 and 23px at 320 × 568, so a flick crossed it between two callbacks
  and the drawing stayed in its before-play state on screen. The window is now at least 30% of the viewport (165px
  and 170px there). Drawings up to 40% of the viewport tall play exactly as before; taller ones (up to 70%) may play
  when their top enters the top band, a little before their bottom reaches the line. A fourth observer, the **top
  band** (`rootMargin: '0px 0px -70% 0px', threshold: 0`), calls back as a drawing's top enters the band.
- *Too tall* (the proof figure on phones, How step 1 on short phones): covering the play area now also needs its top
  at most one band (30% of the viewport) above the top. Before, any negative top passed, so a jump that landed
  mid-figure (an anchor or scroll restoration: the 680px proof figure at 320 × 568 with its top at about −283px)
  started the sequence with its first frames above the viewport.
- *Top line, leaving downwards*: the substitution of the box at the crossing (top 0) now applies only when the
  real top is at most one band below the top of the viewport (one scroll step). Before, a jump that carried the
  drawing from the top line to below the fold (an upward header link; the page has no smooth scroll) still passed,
  and the drawing played where nobody saw it.

The callbacks still come at the right moments (third review, finding 1; V32): a short drawing going down plays at
play-area ratio 1; a short drawing going up plays when its top re-enters (ratio 1 again); a tall drawing going down
plays when it reaches the top line; a tall drawing going up plays when it leaves the top line with its top just
inside (`inView`); a drawing a fast scroll carried partly past is not played half-hidden and plays whole when the
visitor scrolls back.

- **Play observers (V25).** "Reaches the play line" means `shouldPlay` (the glossary and MS-8.11 say the same).
  An IntersectionObserver only calls back when a box crosses one of its thresholds, so one observer cannot see
  both moments; two observers watch every `later` drawing and both call the same handler:
  - **Play area**: `IntersectionObserver({ rootMargin: '0px 0px -30% 0px', threshold: [0, 1] })`. Its root is the
    top 70% of the viewport; ratio 1 means the whole box is inside it, which is the moment a drawing of up to 70% of
    the viewport height reaches the line (most drawings: 160-416px).
  - **Top line**: `IntersectionObserver({ rootMargin: '0px 0px -100% 0px', threshold: 0 })`. Its root is the
    zero-height line at the top of the viewport (the same technique as the step observer's middle line); a box
    starts intersecting it when its top reaches the top of the viewport. This catches drawings taller than 70% of
    the viewport (the proof figure, about 520px, on any phone; How step 1, 416px, under about 594px of height) and
    any drawing a fast scroll or an anchor jump carried past the play area.
  - **Whole viewport** (added in FEAT-004 after `site.mjs` failed): `IntersectionObserver({ rootMargin: '0px',
    threshold: [0.94, 0.95, 0.96, 0.97, 0.98, 0.99, 1] })`, the same handler. A drawing taller than the play
    area but not than the viewport (How step 1, 406px, at 320 × 568; the proof figure, 654px, at 375 × 667)
    crossed no threshold of the two observers above while `shouldPlay` held for it (going down its window
    with the top-line callback is about 10px; going up its `inView` window is 13px and the top line fires
    with the top a scroll step past it), so it never played. Ratio 1 is the `inView` moment going down; the
    thresholds from 94% call back every 1% of the box going up, so it plays with at most 6% of it (40px for
    a 667px box) above the viewport. `shouldPlay` is unchanged.
  - **Top line, leaving downwards** (added in the verification step): a drawing taller than the viewport
    entered from above (the proof figure, 680px, at 320 × 568) got no callback while `shouldPlay` held: the top
    line reports its top leaving the line one scroll step late, with the top already a step inside the viewport. The top-line
    handler remembers whether each drawing was on the line; when one that was on it leaves with its top below
    the top of the viewport and at most one band (30% of the viewport) below it, it asks `shouldPlay` about the
    box at the crossing (top 0, same height). Other entries, including a jump below the fold, go to `shouldPlay`
    as reported (bound added in iteration 2, B2).
  - **Top band** (iteration 2, N1): `IntersectionObserver({ rootMargin: '0px 0px -70% 0px', threshold: 0 })`, the
    same handler. Its root is the top 30% of the viewport; it calls back as a drawing's top enters it, inside the
    widened window of a drawing that fits above the line (see "Play range" above).
  - Handler: for each entry, if the drawing has no `data-played` and `shouldPlay(entry.boundingClientRect,
    innerHeight)`, set `data-played="1"` and unobserve it from both observers. Otherwise do nothing. A drawing
    a jump carried entirely above the viewport is not played (nothing to see); when the visitor scrolls back, the
    callbacks come as its box re-enters, and it plays once `shouldPlay` holds: with its whole box in view (V32), never
    with only its bottom edge on screen.
  - Where a drawing plays, by estimate: a 216px box stage at 375 × 667 plays with its top at about 251px (the box at
    251-467px); How step 1 (416px) at 375 × 667 with its top at about 51px; at 320 × 568 How step 1 and the proof
    figure play with their top at the top of the viewport and their whole box in view; at 1280 × 800 the proof
    figure plays with its top at about 40px.
  - Mount, as before: in `move()`, before `data-site-motion="on"` is set (the same order as today's reveal code),
    `splitInitialPlay` runs over every `[data-play]` without `data-played`; the `instant` ones get
    `data-played="instant"`, the `later` ones are observed by both observers. This is the MS-8.4 reveal rule applied
    to drawings: **a `data-play` drawing on screen or above it when motion starts shows its finished state and never
    plays** (the desktop How picture is not a `data-play` root and follows MS-8.12, V33), so
    nothing in view blinks from finished to start (a visitor who reloads mid-page or follows `#access` sees finished
    drawings in view and played ones below). An element with no box (`getClientRects().length === 0`: the three How
    stages on desktop, any stage hidden by a layout) is not marked; it stays observed and plays the first time
    `shouldPlay` holds after it gets a box (a tablet turned from landscape to portrait).
- **Step observer (A8).** One `IntersectionObserver({ rootMargin: '-50% 0px -50% 0px', threshold: 0 })` over the
  three `.site-how__step` elements, at every width (the CSS that uses its attributes applies from 1024px only). On
  any callback, `activeStep(tops, innerHeight / 2)` gives the active step. When it changes, `SiteMotion` sets
  `data-how-step` (0-3) on `.site-how`. If the story is `deferred` and the new step is 1 or more, it first sets
  `data-how-live` and clears `deferred` (below). If the new step is higher than `seen` (the highest step reached in
  this page view), it sets `data-how-play` to it and raises `seen`; otherwise it removes `data-how-play`. All of
  these writes happen in the same callback, so the browser paints them together.
- **Live, deferred or finished at mount (V26).** In `move()`, before `"on"` is set, `SiteMotion` reads
  `step = activeStep(tops, innerHeight / 2)` and `howStart(picture, innerHeight, step)`:
  - `'live'`: the picture is below the fold, so the step is 0 by geometry. Set `data-how-live`, `seen = 0`,
    `data-how-step="0"`. Steps play as the visitor scrolls.
  - `'deferred'`: the picture is already in view (or above the fold's bottom edge) but no step is active yet. This
    happens on tall viewports, where the How picture starts within the first screen: 1024 × 1366 (a 12.9-inch tablet
    held upright) and 1920 × 1200 by estimate (the picture's top at about 1,100px). Set `seen = 0`,
    `data-how-step="0"` and no `data-how-live`, so the picture keeps showing its finished state and nothing in view
    changes when motion starts. When step 1 first becomes active, the step observer sets `data-how-live`,
    `data-how-step="1"` and `data-how-play="1"` in the same callback: the picture goes to the start of the story as
    the visitor scrolls step 1 across the middle line, together with the outline appearing on step 1, and step 1
    plays. Steps 2 and 3 are then in their start state and play as usual. This is the same kind of jump the design
    already accepts when a visitor scrolls back from step 3 to step 2. If the first change goes straight to step 2 or
    3 (a fast scroll), the same writes happen with that step: it plays, earlier steps show their finished state.
  - `'finished'`: the picture has no box (the viewport is under 1024px), or a step is already active (a reload
    mid-section, or a jump to `#proof` and back). Set `seen = 3`, `data-how-step` to `step` and no
    `data-how-live`. No step ever plays in this page view; the outline still follows the active step.
  The "not reached yet" rules of 4.1 require `data-how-live`, so a picture that was on screen at mount never drops
  to its start state before the visitor scrolls a step across the middle line.
- **`still()`** (reduce, or no observer): disconnect every observer, set every `[data-play]` to
  `data-played="instant"` (also ones playing, so nothing replays if the preference changes back), remove
  `data-how-step`, `data-how-play` and `data-how-live`, clear `deferred`, set `seen` to 3.
- **Back to no-preference** (`move()` again): only drawings with no `data-played` go through `splitInitialPlay`;
  `seen` stays at 3, `howStart` is not asked again and `data-how-live` is not set again.
- Cleanup disconnects every observer.

Each callback does a few `getBoundingClientRect` reads and one or a few attribute writes. Script cost about 0.7 KB
gzip.

### 3.4 What reduced motion shows

The base styles: every drawing at its finished state, the How picture at the end of step 3, no active-step
outline, the proof figure with real chips, the digit lines, the boxed digit, the x and the closing lines.
`document.getAnimations()` is empty after loading and scrolling to the end (MS-8.7). When the preference changes to
reduce during a play, `data-site-motion` is removed, no rule matches, every animation is dropped and the finished
state shows at once (MS-8.8).

## 4. Sections

### 4.1 How it works (`#how`)

**What it shows.** `HowScreen`, one small app screen, top to bottom: the sentence well (`site-well`, text in
`candidate` type, digits in mono under it, a drawn secondary Speak on the right), up to three sentence rows
(`div.nl-candidate`, ranks 1-3), the 64px keypad (`KeypadPicture`). Build-time data, `getHowData()` (changed):

```ts
interface HowData {
  code: '4663';
  /** The well after each press, sentence case, decoded as the hero demo does (decodeGhost, else the top completion). */
  typing: [string, string, string, string];   // today: "I", "I'm", "Hmm", "Good"
  /** The top 3 sentences for 4663, best first. */
  sentences: string[];                          // today: good, home, gone
  /** Index in `sentences` of the word the drawing picks. */
  chosen: number;                               // "home", today 1
}
```

`getHowData` throws when the dictionary is loaded but `encodeWord('home')` or `encodeWord('good')` is not `4663` or
"home" is not in the top 3 (MS-7.8). Without a dictionary it returns digits only (`typing` "4", "4 6", "4 6 6",
"4 6 6 3", `sentences` empty, `chosen` −1) and warns at build, as the hero demo does; the rows are then not
rendered and step 2 shows only the well.

**Steps and their sequences.** Every animated part carries `data-s` (1-3), the step it belongs to. `HowScreen`
takes `{ how: HowData; part: 'all' | 1 | 2 | 3 }`: `'all'` is the desktop picture (well with Speak, rows, keypad);
`1` the well without Speak and the keypad; `2` the well without Speak and the rows; `3` the well with Speak. The
pressed rings on keys come from `KeypadPicture`'s new `rings` prop (4.4).

| Step | Step length | Parts (role, k-u) | Finished state of the step |
|---|---|---|---|
| 1 Press one key per letter | `motion-demo-step` 520 ms | "Press a key to start" `.site-out` u0 (in `label` type, below); pressed ring on key 4 `.site-ring` 0-1, on 6 1-2, on 6 again 2-3 with `.site-late`, on 3 3-4; well texts `typing[0..2]` `.site-during` from `TYPING` (0-1, 1-2, 2-3), `typing[3]` `.site-in` k3; digits "4", "4 6", "4 6 6" `.site-during` likewise, "4 6 6 3" `.site-in` k3 | well "Good", "4 6 6 3", no ring |
| 2 Pick the sentence you meant | `motion-sweep` 240 ms | rows 1-3 `.site-rise` k0, k1, k2; chosen marker on row 1 `.site-ring` 3-5; chosen marker on row `chosen` `.site-mark` k5; a `.site-out` u5 wrapper (data-s 2) around step 1's "Good" and `sentences[chosen]` sentence-cased `.site-in` k5 in the well | rows with "home" chosen, well "Home" |
| 3 Hear it out loud | `motion-frame` 600 ms | pressed ring on Speak `.site-ring` 0-1; label "Speak" `.site-out` u1, "Speaking" `.site-in` k1 | Speak reading "Speaking", no ring |

**Placeholder rows (V36, review P1).** In the desktop picture each sentence row shares a `.site-cell` with an
`.site-cand__ghost`: an empty row with a dashed `--line` edge, the card radius and two `--line` bars where the rank
and the sentence go, `data-s="2"`, `role('out', row)`. While step 2 has not played (live, steps 0 and 1) the
placeholders show, so the picture has no 184px empty band between the well and the keypad during step 1; when step
2 plays, each fades out as its row rises in at the same step. The finished state hides them (`.site-out`), so
reduced motion and no-JS show the real rows only. Fades only, no layout change.

**Stage padding (V40, review N10).** Under 1024px the How stages have `padding-inline: var(--space-2)` and the drawn
keypad panel inside them pads by `var(--space-2)` instead of `var(--space-4)` (3 × 64 + 2 × 8 + 2 × 8 = 224px), so in
a 240px stage the panel no longer meets the edges. Heights and the 64px keys are unchanged.

Totals (`--play-i` is 0 for the picture and the stages): step 1 is 300 + 4 × 520 + 120 = 2.5 s, step 2 300 + 5 ×
240 + 200 = 1.7 s, step 3 300 + 600 + 200 = 1.1 s. Choosing a sentence never touches Speak, as the step 2 text says.
The chosen marker is an overlay (2px `line-strong` border, `surface-sunken` behind the text through `z-index`, the
`check` icon at the row's right end), the round-1 `.site-cand--chosen` look as a layer; never ember (MS-7.3).

**The two presses of 6 (V29).** The ring on key 6 is two rings: 1-2, then 2-3 with `.site-late`. At t(2) the first
ring fades out over `motion-jump` and the second starts fading in `motion-jump` later: the first ring fades out,
then the second fades in, so the key visibly dips between the two presses (V35) and shows two separate presses, each matched by its change in the well ("I'm" to "Hmm", "4 6" to "4 6 6"). The handovers 4 to 6 (t(1)) and
6 to 3 (t(3)) are cross-fades over `motion-jump`, which MS-7.3 counts as one ring.

**The empty-well hint (V27).** "Press a key to start" is set in `label` type (16px, weight 600, `--ink-muted`,
about 170px wide), the look of the app's muted hints at a size that fits on one line: the well's text room is 208px in
a 240px stage and about 180px beside Speak in the desktop picture at 1024px. It sits in the well text cell, whose
height stays the `candidate` line (34px) whatever it holds, so the hint never makes the well taller. MS-7.7's
overflow check covers it at 320px (the stages) and at 1024px (the picture).

**Desktop (1024px and up).** Two columns as today (picture 5fr, steps 7fr); the picture `.site-how__picture` is
sticky at `top: var(--space-12)`. Its height is declared once, from 1024px, as a token sum and set on the picture,
so it is exact rather than an estimate (V30):

```css
@media (min-width: 1024px) {
  .site-how { --site-how-h: calc(var(--space-24) * 6 + var(--space-8) + var(--space-2)); } /* 616px */
  .site-how__picture { block-size: var(--site-how-h); }
}
```

Its contents (well about 82-88, rows 184, keypad 312, gaps 32) fit inside, and MS-7.7's overflow check fails if they
do not; a found overflow raises `--site-how-h` by one token step and is recorded here. 616px fits inside the 720px
below the sticky top at 1024 × 768. Short windows: `@media (min-width: 1024px) and (max-height: 679px)
{ .site-how__picture { top: var(--space-4); } }`, so the whole picture fits from an inner height of 632px (a 1366 ×
768 laptop browser is about 650px). Below 632px the bottom of the keypad's last row (`*` `0` `#`, which no step uses)
is cut off while the picture is stuck; accepted, and nothing a step changes is cut off down to an inner height of
536px. Step cards shrink to their content (the `min-height: 40svh` goes); the scroll distance comes from

```css
@media (min-width: 1024px) {
  .site-how__steps { gap: 24svh; padding-block: max(12svh, calc(var(--site-how-h) - 50svh)) 36svh; }
}
```

The picture and the steps column share the grid row's top, so step 1's top crosses the middle line when the
picture's top is at 50svh minus the top padding, which puts the picture's bottom at or above the bottom of the
viewport: **step 1 becomes active only once the whole picture is in view** (V30). With `12svh` alone this failed on
short laptop windows (at an inner height of 650px keys 4 and 6 were below the fold while step 1 played). The `max()`
adds no space on tall windows (at 1080px the padding stays 12svh, 130px); at 650px it is 291px instead of 78px. Steps 2 and 3 cross
the middle line while the picture is stuck.

The desktop picture is **not** a `data-play` root (3.3). Each part takes its step length from its own `data-s`,
scoped to the picture, so nested parts of different steps (step 1's "Good" inside step 2's `.site-out` wrapper)
never inherit the wrong one:

```css
.site-how__picture [data-s="1"] { --play-step: var(--motion-demo-step); }
.site-how__picture [data-s="2"] { --play-step: var(--motion-sweep); }
.site-how__picture [data-s="3"] { --play-step: var(--motion-frame); }
```

Contexts, inside the motion block, from 1024px, scoped to the picture:

```css
/* steps not reached yet, only once the story is live (3.3: live at mount, or deferred until step 1): the before-play declarations of 3.2 */
[data-site-motion="on"] .site-how[data-how-live][data-how-step="0"] .site-how__picture [data-s],
[data-site-motion="on"] .site-how[data-how-live][data-how-step="1"] .site-how__picture :is([data-s="2"], [data-s="3"]),
[data-site-motion="on"] .site-how[data-how-live][data-how-step="2"] .site-how__picture [data-s="3"] { /* per role */ }
/* the step that plays: the play declarations of 3.2 */
[data-site-motion="on"] .site-how[data-how-play="2"] .site-how__picture [data-s="2"] { /* per role; same for 1, 3 */ }
```

Parts of steps already passed, or revisited (no `data-how-play`), match nothing and show their finished state.
Scrolling back from step 3 to 2 puts step 3's parts back to their start state in one jump (live only). A new play
cuts a still running earlier step to its finished state (its play rule stops matching).

**Active step.** Each card gets `position: relative` and an outline layer, `.site-how__step::after` (`content: ''`,
`position: absolute`, `inset: 0`, 2px `--line-strong` border, `border-radius: inherit`, `opacity: 0`,
`pointer-events: none`). Its label `.site-step` becomes a `.site-cell` holding two stacked spans with the same text:
the plain one (today's look) and `.site-step__key` (`--key` fill, `--on-key` text, the same 56px square, `opacity:
0`). From 1024px and with motion on, `.site-how[data-how-step="N"] .site-how__step:nth-child(N)::after` and that
card's `.site-step__key` get `opacity: 1` with `transition: opacity var(--motion-state) var(--motion-ease-out)`. The
label stays `aria-hidden`. The other cards keep full contrast (no dimming, accessibility rule 8). Motion off: no
card is marked.

**Phones and tablets (under 1024px).** `.site-how__picture` is `display: none`. Each step card holds a
`div.site-stage.site-how__stage` with its own part of the screen (`HowScreen part={n}`), a `data-play` root with the
step's play class: step 1 the well (no Speak) and the keypad (`site-play--type`), step 2 the well (no Speak) and the
rows (`--sweep`), step 3 the well with Speak (`--frame`), with the same parts and k-u values as the table. In the
stages the well wraps (`.site-how__stage .site-well--row { flex-wrap: wrap; }`), so Speak goes under the text when
the row does not fit; "Speak" and "Speaking" (with the icon) share one `.site-cell` sized by "Speaking", so the
button's width never changes. The desktop picture keeps the non-wrapping row (it is at least 387px wide at 1024px).
Phone (under 600px): one column, stage under the step text. Tablet (600-1023px): one column of cards, each a
two-column grid (text left, stage right, 240px). Stage heights (tokens; checked by `site.mjs`, raised one token sum if
an overflow is found and recorded here):

| Stage | Contents (estimate at 240px wide) | Height |
|---|---|---|
| Step 1 | well 88 + gap 12 + keypad 312 = 412 | `calc(var(--space-24) * 4 + var(--space-8))` = 416px |
| Step 2 | well 88 + gap 12 + 3 rows of 56 with 8px gaps (184) = 284 | `calc(var(--space-24) * 3)` = 288px |
| Step 3 | well wrapped: padding 24 + text 34 (the `candidate` line) + digits 22 + gaps 16 + Speak 56 = 152 | `calc(var(--space-24) + var(--space-16))` = 160px |

The desktop picture and the per-step stages are rendered once each; a hidden one has no box, so it is never marked
and never intersects while hidden (3.3).

**Copy change** (content.md §2): step 1 text becomes **Keys 2 to 9 carry the letters. G, H and I share key 4, so
"home" is 4 6 6 3, and so is "good". No tapping a key three times and no code to learn. 0 is space.** Steps 2 and 3
unchanged. Drawing text: "Press a key to start" (in `label` type), the build-time words, "Speak", "Speaking".

**Accessibility.** The picture and the stages are `aria-hidden`, contain nothing focusable and say nothing the step
text does not. Step labels stay `aria-hidden`; the outline is decoration (the list order says which step is which).
Drawing text 14px or more; keys 64px.

**Budget.** HTML about +1.2 KB gzip, CSS about +0.8 KB gzip, about +120 elements.
**Layout-shift guard.** Every changing text (well texts, digits, Speak and Speaking, the two label layers) shares a
`.site-cell` sized by its longest value; the well text cell is one `candidate` line tall and the hint fits on that
line; the rows exist from the start; rings and markers are overlays; the sticky picture's height is
`--site-how-h`; the per-step stages have the fixed heights above, and `site.mjs` checks that no stage content
overflows (MS-7.7).
**Files.** `components/site/pictures/HowScreen.tsx` (new), `sections/How.tsx`, `site-data.ts` (`getHowData`),
`site.css`, `SiteMotion.tsx`, `motion.ts`, `content.md` §2.

### 4.2 The proof figure (`#proof`)

**What it shows.** `figure.site-proof` with `data-play` and `site-play--sweep`:

- `figcaption.site-proof__keys`: a `span.nl-sr-only` with the whole caption, "Your keys: 92837" (from
  `proof.keys`), then the visible parts, both `aria-hidden`: the label "Your keys:" and the five digits of
  `proof.keys` as five spans in a `.site-proof__digits` grid of fixed columns (`--proof-col: var(--space-8)` 32px,
  gap `var(--space-2)`: 5 × 32 + 4 × 8 = 192px). Grid items are blockified, so screen readers could read the
  visible digits one by one; the hidden span keeps the accessible caption exactly "Your keys: 92837" (V31).
- `ul.site-proof__rows`, one `li` per word (water, waves, wafer), each:
  - a chip `.site-cell`: the real `ProofChip` (`match` or `reject`, the accessible content), `.site-in` at
    `CHIP[row]` (k9, k10, k11 for rows 1-3), and over it an `aria-hidden` `nl-chip--typing` chip that shows the word
    only, `.site-out` at the same step. The typing chip holds the real chip's icon and code as hidden slots
    (`.site-proof__slot`, `visibility: hidden`), so both words start at the same x and the 200 ms cross-fade never
    shows two offset copies of the word (review R3-B1; `site.mjs` checks the two `.nl-chip__word` left edges match
    within 1px). Same steps, same 3.4 s total;
  - an `aria-hidden` grid in the same five columns: the word's letters (`label` type) and under each its key digit
    (mono 17px); the digit line is `.site-rise` at `DIGIT_LINE[row]` (k1, k2, k3). For the reject word the digit at
    `reject.diffAt` has the `.site-digit--diff` box and an `x` icon under it, both `role('mark', SWEEP[diffAt][0])`
    (when the sweep reaches that column). The differing digit is `ink-muted` like the others until then: the box
    draws an `ink` copy of it (`::before { content: attr(data-d) }`), so it brightens with the box at the mark step
    and the finished state (reduced motion, no JavaScript) shows it in `ink` (review B3: an unstepped `ink` colour
    gave the answer away from the first frame).
- The column box (the sweep) lives **in each digit line**, never across the chips. Each of the 4 digit lines (the
  caption's digits and the 3 word rows' digits) is a `.site-proof__digits` grid, `grid-template-columns: repeat(5,
  var(--proof-col)); column-gap: var(--space-2); grid-auto-rows: var(--space-6)` (32 × 24px cells; the mono 17px
  digits have a 24px line). After its 5 digit spans it holds 5 `aria-hidden` `span.site-proof__box` elements placed
  in the same cells (`grid-area: 1 / (c + 1)`, `pointer-events: none`, 2px `--line-strong` border drawn as an inset
  box-shadow, `radius-chip`). The box for column c in all 4 lines is `role('ring', ...SWEEP[c])`, so the 4 boxes of
  a column jump on and off together and a chip is never covered. In the wafer line the boxed digit
  (`.site-digit--diff`) shares its cell with that column's sweep box for one step. Never ember (MS-7.3). In the
  caption the digit grid and its boxes are `aria-hidden`; the caption's accessible text is the hidden span.
- `p.site-proof__said`, **Can be spoken: water, waves. Never spoken: wafer.** (from `proofSaidLine(proof)`, built from
  `proof.matches` and `proof.reject.word`), then today's "For example…" sentence; both `.site-in` at k12, both outside
  `aria-hidden`.

Total 300 + 12 × 240 + 200 = 3.4 s. Finished state: every chip in its real state, every digit line, the boxed digit
and x, both closing lines; no column box. Screen readers get the caption, three ProofChips and the two sentences, with
and without motion (MS-7.2). The labels "Suggested", "Checked", "Dropped" go.

**Sizes.** At 320px the figure's inner width is 240px; the grid is 192px. Height about 520px (today about 384), set
once by the server HTML. **Budget.** HTML +0.8 KB gzip, CSS +0.4 KB gzip. **Layout-shift guard:** chips share a cell
sized by the wider (reject) chip; overlays only. **Files.** `Pictures.tsx` (`ProofFrames` becomes `ProofCheck`),
`sections/Proof.tsx`, `site-data.ts` (`proofSaidLine`), `site.css`, `content.md` §3.

### 4.3 The stage and the grids (all box sections)

Each box card gets `div.site-stage` (`aria-hidden`) as its first child, before the `h3`; DOM order is the visual
order and screen readers skip the stage. Stage heights (tokens only), sized to the tallest drawing of the section at
240px wide:

| Section | Stage height |
|---|---|
| Conversation | `calc(var(--space-24) * 2 + var(--space-6))` = 216px |
| Access, except switches | 216px (same) |
| Access, switches | `calc(var(--space-24) * 4)` = 384px (keypad 312 + gap 8 + switch 56 = 376); from 648px Your view, in the same row, takes this height too (below) |
| Privacy | `calc(var(--space-24) * 3)` = 288px (Model ranking at 240px: Off row 64 + 8 + heading 24 + 7 lines of 22 + 24 = about 274) |
| How, per step (under 1024px) | 416, 288 and 160px (4.1) |

The stage is `--surface-sunken` on `--surface` cards and `--surface` on sunken bands, `border-radius:
calc(var(--radius-card) - var(--space-2))`, `display: grid; place-items: center; overflow: clip` (clip is a
guard; `site.mjs` fails if any drawing is larger than its stage). If `site.mjs` finds a **height** overflow at
320px, the stage moves one step up the 4px scale and the design records it. A **width** overflow is fixed by
narrowing the drawing's boxes and gaps (layout boxes, drawn computer keys' padding, the gaps between them), never its
text: no drawing may shrink or wrap its text below 14px to fit, and drawn keypad keys stay 64px (MS-10.8). Drawings
are designed with at least 12px of spare width at 240px (LayoutBoxes 226px, Touch 208px, the proof grid 192px, the
Keyboard arrow row about 220px).

**Grids.** Every card is at least 288px wide, so its stage is at least 240px wide inside (the round-1 two-column
grid gave 216px-wide card insides at 600px). The two 4-card sections stay a 2 × 2 grid at every width from 648px,
never 3 + 1: Conversation and Privacy swap `site-grid--2` for a new class (and `.site-grid--2`, which has no other
user, is removed):

```css
.site-grid--boxes { grid-template-columns: minmax(0, 1fr); }
@media (min-width: 648px) { .site-grid--boxes { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
```

At 648px each column is (648 − 48 − 24) / 2 = 288px; at 1280px each is 564px, and the drawings sit centred in their
stages. Between 600 and 647px both sections are one column of 552-599px cards.

**Works the way you type: five normal cards (V37, replaces the bento).** The product owner decided after the
round-2 review (P2) that the switch card is a normal card at every width: the tall tile left a stage of about 830px
(768 × 1024) or 686px (1280) around a 376px drawing. From 648px, at every width: `repeat(2, minmax(0, 1fr))`; row 1
Keyboard and Touch, row 2 One or two switches and Your view, row 3 Phones, tablets and laptops across both columns
(`.site-grid--access > :nth-child(5) { grid-column: 1 / -1; }`). Below 648px one column. Your view's stage takes the
switch stage's height from 648px (`.site-grid--access > :nth-child(4) > .site-stage { min-block-size:
calc(var(--space-24) * 4); }`), so the stages and headings of row 2 line up; MS-7.7's equal heights hold per row in
Access. The switch stage is 384px around its 376px drawing at every width. Reading order stays Keyboard, Touch,
Switches, Your view, Phones (no `order`). `site.mjs` checks at 320, 768, 1024, 1280 and 1920 that the switch stage is
at most 24px taller than its drawing, that from 648px the switch card shares its row with one card, and that
stages in an Access row have equal heights.

**Privacy (V38).** From 648px the Privacy grid also has `site-grid--start` (`align-items: start`), so a short card
("On your device") keeps its own height instead of stretching to its neighbour's.

### 4.4 Box drawings

Every box drawing is a `data-play` root with one `site-play--*` class inside the stage; `aria-hidden`; built from
`nl-` classes, tokens and `Icon`; drawn buttons are `div.nl-btn` with `cursor: default`; nothing focusable; text 14px
or more; no ember fill; at most one ember ring at a time (a handover over `motion-jump` counts as one, 3.2);
finished state from the base styles; parts that replace each other in a `.site-cell`. Bytes are gzip estimates of the drawing's HTML (standalone, calibrated on today's drawings);
CSS per drawing is 0.1 to 0.3 KB gzip on top of the shared role rules.

| Box | Component | Finished state | Sequence (role k-u) | Step | Last change | HTML |
|---|---|---|---|---|---|---|
| They said | `SaidStrip` | the They said strip (`said` icon, label "They said", line "What do you need?") above a well "I need water" with "4 6333 92837" | "Nothing yet." `.site-out` u1; the line `.site-in` k1; the reply `.site-rise` k2 | frame | 2.1 s | 0.35 KB |
| Show and Flip | `ShowFlip` | the Show card with the message turned 180° (a still layout), Done and Flip upright | ring on Flip `.site-ring` 1-2; upright card `.site-out` u2; turned card `.site-in` k2 | frame | 2.1 s | 0.38 KB |
| Saved phrases | `PhraseSave` | "Your phrases": "I need water" on top, then "Thank you", "Yes, please", each row with a drawn `speaker` icon | well with Save phrase (`save` icon) `.site-out` u2; ring on Save phrase `.site-ring` 1-2; the list without its first row `.site-in` k2; the first row `.site-rise` k3 | frame | 2.7 s | 0.45 KB |
| Spell and My words | `WordAdd` | a Matches `ProofChip` "Mihai 64424" and the line "In my words." | New chip (dashed, plus), "Not in your words yet." and Add to my words (`plus`) `.site-out` u2; ring on Add `.site-ring` 1-2; Matches chip and "In my words." `.site-in` k2 | frame | 2.1 s | 0.40 KB |
| Keyboard | `KeyLegend` | four rows: drawn key `4` "types g h i"; `Enter` "speaks"; `Backspace` "goes back"; `↑` `↓` "pick a sentence" | pressed ring on each key `.site-ring` 0-1, 1-2, 2-3, 3-4 (on the arrow pair together) | quick (was frame; V39) | 2.0 s | 0.45 KB |
| Touch | `TouchSizes` | key 2 ABC at 72px and at 128px, "72" and "128" under them in mono | ring on the 72px key `.site-ring` 0-1, on the 128px key 1-2 | frame | 2.0 s | 0.25 KB |
| One or two switches | `ScanPlay` | the 64px keypad with key 9 in the scan ring, and a drawn switch below it (56px circle, `switch` icon, "Switch") | row 1 `.site-ring` 0-1, row 2 1-2, row 3 2-4; switch pressed 3-4; key 7 4-5, key 8 5-6; key 9 `.site-mark` k6; switch pressed 6-7 | quick | 3.6 s | 0.50 KB |
| Your view | `ThemeHalves` | a Night half and a Day half, each labelled and holding "Hi" and key 4 GHI at 84px; "Extra large" under both | the Day half `.site-in` k1; the 64px keys and "Large" `.site-out` u2; the 84px keys and "Extra large" `.site-in` k2 | frame | 2.1 s | 0.60 KB |
| Phones, tablets and laptops | `LayoutBoxes` | three bare boxes labelled Phone (upright), Tablet (landscape, keys block on the right), Laptop (wide); each with a sentence bar, two suggestion lines, a keys block and three small pills, the middle one outlined | the boxes `.site-rise` k0, k1, k2 | frame | 2.1 s | 0.50 KB |
| On your device | `DeviceBoundary` | a dashed `line-strong` boundary labelled "This device" with four rows and a `check` each: What you type, The dictionary, Saved phrases, My words; the pill "Offline. Using your dictionary." at its foot | rows `.site-rise` k0-k3; the pill `.site-rise` k4 | frame | 3.3 s | 0.45 KB |
| Model ranking | `RankingSides` | the Off row (drawn toggle off, "Off, the default", "Ranked on this device") above the On block (toggle on, "On. Sent to rank:" and the `RANKING_SENT` list, one item per line) | outline `.site-ring` on Off 0-1, on On 1-6; list items `.site-rise` k2-k5 | quick | 3.2 s | 0.55 KB |
| Voices | `VoiceRows` | "Voice (en, on this device)" with a check and "Keeps your words on the device"; "Voice (en, online)" with "Sends the text to the browser maker" | the check `.site-mark` k1 and its line `.site-in` k1; the online line `.site-in` k2 | frame | 2.1 s | 0.30 KB |
| Listen | `ListenStrip` | the They said strip with "What do you need?" and a drawn Listen (`mic`) | "Nothing yet." `.site-out` u3; ring on Listen `.site-ring` 1-2; in the button one `.site-cell` with three labels: Listen (`mic`) `.site-out` u2, Stop (`stop`) `.site-during` 2-3, a second Listen (`mic`) `.site-in` k3; the status line "Listening. Ask them to speak now." `.site-during` 2-3; the line `.site-in` k3 | frame | 2.7 s | 0.38 KB |

"Last change" is an upper bound: it uses the largest `--play-lead` (700 ms, `--play-i` 2, which only the switch
drawing has from 1024px) for every drawing, the largest k or u, and the last change's duration (200 ms for a fade,
120 ms for a ring or mark). For example Saved phrases is 700 + 3 × 600 + 200 = 2,700 ms. The longest is the switch
drawing, 700 + 7 × 400 + 120 = 3,620 ms.

Iteration 2 (V39): leads are now per card, 300 ms in column 0, 900 ms in column 1, 1,900 ms for Touch; with those
the longest drawings are Model ranking (900 + 6 × 400 + 120 = 3,420 ms), Listen (900 + 3 × 600 + 200 = 2,900 ms),
the switch drawing (300 + 7 × 400 + 120 = 3,220 ms) and Touch (1,900 + 2 × 600 + 120 = 3,220 ms). The table's
totals above are the round-2 upper bounds; `site.test.tsx` checks every part against 4 s with the real leads.

Notes:

- **Pressed rings on drawn keypad keys** (How step 1; the Touch keys use the same ring element). `KeypadPicture`
  gains one optional prop:

  ```ts
  import type { KeyId } from '@/lib/keys';            // existing: '1' … '9', '*', '0', '#'
  export interface KeyRing { key: KeyId; k: KStep; u: UStep; late?: 'late' }   // late: a repeated press (3.2)
  // KeypadPicture({ size, pressed, ninth, className, rings }: { …; rings?: readonly KeyRing[] })
  ```

  For each ring it renders, inside that key's `div.nl-key` (already `position: relative` for its `::after`), one
  `div.site-key-ring` with `role('ring', k, u, late)`: `position: absolute; inset: 0; border-radius: inherit;
  pointer-events: none; box-shadow: inset 0 0 0 var(--ring-width) var(--ember)`, base `opacity: 0` (the `.site-ring`
  role). Absolutely positioned, so the key's layout does not change. A key may hold several rings (different k-u).
  The existing `pressed` prop stays for the hero demo. The scan rings of `ScanPlay` stay a separate overlay layer
  over the keypad grid, as today's `.site-frames--scan` (renamed `.site-scan__rings`), with the classes
  `site-scan__ring--row1` to `--row3` and new `--key7`, `--key8` (`grid-area: 3 / 1` and `3 / 2`) beside `--key9`.
- **They said, Listen.** The app's `PartnerTurn` read view, shortened: "Nothing yet." stands for the app's "Nothing
  yet. Add what the other person said, if you like." They said ends on the reply below the line; Listen ends on the
  line with the Listen button, so the two do not repeat each other. Listen is shown pressed by someone, and its state
  is in words (accessibility rule 12). In Listen the status line has its own row under the strip, reserved at
  rest (empty), so it appears without moving anything; the button's three labels share one `.site-cell` sized by
  the widest ("Listen" with its icon).
- **Show and Flip.** The turned frame is a still layout that fades in; nothing rotates in motion (D6.1).
- **Saved phrases.** "Thank you" and "Yes, please" are our own words.
- **Spell and My words.** `getSpellExample()` (new, build time) returns `{ word: 'Mihai', code: '64424' }` and throws
  when `encodeWord` disagrees or the dictionary has the word (the New chip must be true, MS-7.8). The chips are real
  `ProofChip`s inside the `aria-hidden` drawing; "Not in your words yet." and "In my words." are the SpellSheet's lines.
- **Keyboard.** The drawn computer key is a new website drawing element: `surface-sunken`, 2px `line-strong`,
  `radius-chip`, label in mono 16px, 40px tall, at least 40px wide; the ring is the Key's 3px inner ember ring on an
  overlay. Added to `design/system/README.md` ("Website drawings") before use. The arrow pair is Up and Down, the
  only arrow keys `lib/keyboard.ts` maps to picking a sentence (review B1; there is no Left or Right in the app): the
  `back` icon with a still `rotate(90deg)` (`.site-kbd--up`) and `rotate(-90deg)` (`.site-kbd--down`).
- **Touch.** The one exception to MS-10.8. Each key sets `--nl-key` inline from new constants
  `TOUCH_MIN_SIZE = 'var(--key-min)'` and `TOUCH_XL_SIZE = 'var(--key-xl)'` in `KeypadPicture.tsx`, on the key's own
  wrapper (not inside `.nl-keypad`), so the app's key-size setting cannot change them. 72 + 8 + 128 = 208px, inside 240.
- **Switches.** The card carries `.site-card--tall` (the bento placement and the growing stage, 4.3). Rings use the
  Keypad's `is-scanning` look as today; the switch's press is a `line-strong` 3px inner
  ring, so ember stays on the keypad. It rests with key 9 in the scan ring (the point of the drawing).
- **Your view.** Each half sets `data-theme` and re-declares `color: var(--ink); background: var(--surface)`, so the
  scoped theme applies; keys stay plum in both themes. Both key sizes sit in one 84px `.site-cell` (no size animation).
  At 240px each half is 116px wide.
- **Phones, tablets and laptops.** No notch, camera, buttons, stand or keyboard deck (MS-4.3). The keys block is one
  block, not drawn keys, so the Keypad rules (every digit shown) and MS-10.8 do not apply to it. Sizes (V31): the
  boxes are 36 × 64px (Phone, upright), 64 × 48px (Tablet, landscape; was 72 × 52 until review R3-P2 moved the
  labels to 16px `label` type, so the row still fits a 225px stage) and 96 × 60px (Laptop); from 1024px all three
  are doubled with their inner parts and gaps (72 × 128, 128 × 96, 192 × 120; review R3-P1), bottom-aligned in
  a `grid-template-columns: repeat(3, auto)` row with `column-gap: var(--space-2)`; the labels under them were 14px
  (`caption` size, allowed in drawings), so the widest column is "Phone" at about 42px and the row is about
  42 + 72 + 96 + 2 × 8 = 226px, 14px inside the 240px stage. A width overflow narrows the boxes, never the labels.
- **Model ranking.** The Off and On parts stack at every width (two columns would not fit 240px with the list). The
  list is `RANKING_SENT` from `lib/rankingProvider.ts` (new constant, V14): "Your keys", "The dictionary words that
  match them", "Ninth Life's own best guesses", "The other person's last line". The drawing shows no count and names
  no provider (the card names it through `providerCopy()`, MS-4.6). "Ranked on this device" is true for ranking alone.
- **Voices.** The rows use the voice picker's label format (`{name} ({lang}, on this device | online)` in
  `SettingsSheet`) with the generic name "Voice"; system voice names can carry vendor names (trademarks.md). The two
  lines are the Settings help text in the singular. No browser maker is named here (MS-4.8).

**Files.** New `components/site/pictures/Conversation.tsx`, `Access.tsx`, `Privacy.tsx` (the 13 drawings) and
`pictures/roles.ts` (the step-class helpers); `Pictures.tsx` keeps `ProofCheck` and re-exports;
`sections/Conversation.tsx`, `Access.tsx`, `Privacy.tsx` (stage first in each card); `site-data.ts`
(`getSpellExample`, `getDemoData` reused for "I need water"); `KeypadPicture.tsx` (touch constants, `KeyId`,
`KeyRing` and the `rings` prop);
`lib/rankingProvider.ts` (`RANKING_SENT`); `site.css`; `content.md` §4-§6; `design/system/README.md`.

## 5. Budgets and performance

| | Today (2026-11-10 Lighthouse) | Estimate after | Budget (MS-11.2) |
|---|---|---|---|
| Document | 17.7 KB | about 25 to 28 KB (drawings about +5.5 KB gzip, counted twice for the RSC payload) | 32 KB |
| CSS | 8.1 KB | about 12.5 KB (roles 0.6, stage and bento 0.4, drawings 3.0, How and proof 1.2; A5 rules −0.4) | 16 KB |
| Script | 116.8 KB | about 117.5 KB (`SiteMotion` +0.7: three observers and `howStart`) | 125 KB |
| Total | 199.7 KB | about 213 KB | 250 KB |
| CLS | 0.000 | 0 | 0.02 |

These are estimates. A new unit test (MS-11.6) renders the page with `renderToStaticMarkup`, gzips the markup and
fails above 15 KB; the implementer records today's figure in the test's comment first. The final check is
`node scripts/lighthouse.mjs --write` on a production server after the person agrees to stop the dev server
(`tech.md` rule 1; task 44). Elements: about 795 today, about 1,150 after; at most about 20 animate at once (one
drawing plus a neighbour). Animations change only opacity and transform, so they run on the compositor.

## 6. Error handling

| Operation | Failure | Recoverable? | Result | Logged |
|---|---|---|---|---|
| `getHowData()` at build | no dictionary | yes | digits only, no rows (4.1) | `console.warn('[site] …')` at build, as today |
| `getHowData()` at build | dictionary loaded, but "home" not in the top 3 or a code differs | no | throws; the build fails | build error |
| `getSpellExample()` at build | the name is in the dictionary, or its code differs | no | throws; the build fails | build error |
| `getProofExample()` | as today | no | throws | build error |
| `SiteMotion` in the browser | no `IntersectionObserver` or no `matchMedia` | yes | `still()`: every drawing finished, no outline | nothing |
| Preference changes during a play | reduce | yes | `still()`: finished states at once | nothing |
| An animation declaration is invalid at computed time (for example `--play-lead` cannot be computed) | no animation runs | yes | the before-play rules match only `:not([data-played])`, so once `data-played="1"` is set the parts show their base (finished) state at once; nothing stays hidden | nothing |

The page logs nothing at runtime (privacy.md).

## 7. Inputs and validation

No new visitor input. Build-time inputs: the shipped dictionary and `encodeWord` (validated as in 6). Step classes
are typed (`KStep`, `UStep` in `roles.ts`), so no drawing can name a class without a rule. A unit test computes each drawing's last change
from its play class, its largest k or u and the role's duration, adds 700 ms, and asserts at most 4,000 ms.

## 8. Invariants and who enforces them

| Invariant | Owner | Checked by |
|---|---|---|
| Finished state without motion | base role styles; motion only under `[data-site-motion="on"]` inside `no-preference` | `site-css.test.ts`, `site.mjs` reduced-motion run |
| Once per page view | `SiteMotion` (`data-played` set once, never removed; `data-how-play` only for a new highest step) | `site-motion.test.tsx`, `site.mjs` |
| At most 4 s per sequence; no forwards fill | typed steps, the totals test, the CSS test | `site.test.tsx`, `site-css.test.ts` |
| Opacity and transform only; tokens only | `site.css` | `site-css.test.ts` |
| No ember fill; at most one ember ring at a time per drawing | drawing components | `site.test.tsx` (class audit per step), `site.mjs` |
| No layout shift | `.site-cell` stacks, fixed stages, overlays | `site.mjs` (CLS while drawings play), Lighthouse |
| Same accessible content with and without motion | `aria-hidden` on every drawing except the proof's chips and lines | `site.test.tsx`, axe |
| Drawn privacy wording matches what is sent and the app's copy | `RANKING_SENT`, the voice lines | `site.test.tsx`, `ranking-provider.test.ts` |
| Nothing on screen at mount changes when motion starts | `SiteMotion.move()` (`splitInitialPlay` and `howStart` run before `"on"`; a `deferred` picture changes only when step 1 crosses the middle line) | `site-motion.test.tsx`, `site.mjs` reload mid-page |
| A drawing plays only with its whole box in view where it fits (above the play line, or from the top of the viewport) | `motion.ts` `shouldPlay`, called by both play observers | `site-motion.test.tsx`, `site.mjs` at 320 × 568 and 375 × 667 |
| Desktop step 1 plays only with the whole How picture in view | `site.css` (`--site-how-h` and the steps' top padding) | `site.mjs` at 1366 × 650, 1024 × 768, 1280 × 800 |
| The desktop How picture is driven only by A8 | `sections/How.tsx` (no `data-play` on the picture) | `site.test.tsx` |
| Every step class used has a CSS rule | `pictures/roles.ts` types, `site.css` | `site.test.tsx` |

## 9. Tests (each name starts with the requirement ID)

- `site-motion.test.tsx`:
  - `MS-8.11 a drawing reaching the play line gets data-played=1 once` (and is unobserved);
  - `MS-8.13 splitInitialPlay marks drawings in view or above at mount instant` (pure, with rects above, inside and
    below the viewport);
  - `MS-8.13 a hidden drawing at mount is not marked instant` (`getClientRects().length === 0`; it is observed and
    plays when a mocked entry later intersects);
  - `MS-8.13 nothing in view changes when motion starts` (a drawing in view has `data-played="instant"` before
    `data-site-motion` becomes `on`);
  - `MS-8.13 reduce during a play marks every drawing instant and nothing replays after no-preference`;
  - `MS-8.12 activeStep counts the tops at or above the middle line` (pure: 0, 1, 2, 3, and a top exactly on the line);
  - `MS-8.12 data-how-step follows the middle line and data-how-play only marks a new highest step`;
  - `MS-8.11 shouldPlay waits for the whole box above the play line` (pure, V32: a 216px box at 667 with its top
    at 300 is false, at 250 true and at -200 false; a 520px box at 568 is true with its top at 10, 0, 20 and -40 and
    false at -300; a box with its bottom at or above 0 is false; 1px rounding allowed);
  - `MS-8.11 both play observers use shouldPlay and unobserve once played` (mocked entries from the play-area and
    the top-line observer; a played drawing is unobserved from both);
  - `MS-8.12 howStart is live below the fold, deferred in view with no active step, finished otherwise` (pure: top
    at or below the viewport's bottom; top inside with step 0; step 1 with the top inside; no box);
  - `MS-8.12 a How picture below the fold at mount is live and starts at step 0`;
  - `MS-8.12 a How picture in view at mount with no active step plays from step 1` (no `data-how-live` and no
    `data-how-play` at mount; after a mocked step change to 1, `data-how-live`, `data-how-step="1"` and
    `data-how-play="1"` are all set in that callback; a later change to 2 sets `data-how-play="2"`);
  - `MS-8.12 a How picture with a step already active at mount never plays` (`seen` 3, no `data-how-play`, the
    outline attribute still follows).
- `site.test.tsx`: `MS-7.7 every box card starts with a stage holding one data-play drawing`; `MS-8.12 the desktop
  How picture has no data-play and the per-step stages each have one`; `MS-7.4 the round-2 drawings are present`;
  `MS-8.11 every drawing's last change is at most 4000 ms`; `MS-8.11 every step class used on the page has a CSS
  rule`; How and Spell examples (MS-7.8); `MS-7.9 the proof figure keeps its accessible text, adds the closing line
  and has no frame labels` (the caption's accessible name is exactly "Your keys: 92837" and its digit grid is
  `aria-hidden`); `MS-7.3 a repeated key press is two rings, the second late` (How key 6: rings 1-2 and 2-3 with
  `site-late`) and `MS-7.9 every digit line holds 5 sweep boxes and no box sits outside a digit line`;
  `MS-7.10 the ranking drawing lists RANKING_SENT with no count and the voice lines match the Voices card`; `MS-7.3 no
  ember fill and at most one ember ring per step`; `MS-10.8 the Touch keys use TOUCH_MIN_SIZE and TOUCH_XL_SIZE`;
  `MS-10.9 Conversation and Privacy use site-grid--boxes and the switch card is site-card--tall`; the copy of
  content.md (MS-4.1); `MS-11.6 the page markup is at most 15 KB gzip`.
- `site-css.test.ts`: `MS-8.5 no scroll-timeline property anywhere` (added in task 38, when the last A5 rule goes);
  `MS-8.11 role and step rules only inside no-preference and [data-site-motion="on"]`; `MS-8.11 drawing play rules
  fill backwards only` (scope: rules whose selector contains `[data-play]`, `[data-how-play]` or
  `.site-how__picture [data-s`; A1, A2 and A4 are not checked by it); `MS-8.12 How parts take --play-step from their
  data-s and the not-reached rules need data-how-live`; `MS-8.12 the How steps' top padding uses --site-how-h from
  1024px`; `MS-8.11 the play lead uses --play-i, never --reveal-i`; `MS-7.5 base role rules show the finished state`; only
  opacity and transform in keyframes (MS-8.10); tokens only (MS-8.2); `MS-10.9 the Access bento places the switch
  card without order`; `MS-10.9 site-grid--boxes has 2 columns from 648px`.
- `site-data.test.ts`: `getHowData` for 4663 and its throw, `getSpellExample` and its throws, `proofSaidLine` (MS-7.8,
  MS-7.9).
- `ranking-provider.test.ts` (new): `MS-7.10 RANKING_SENT maps to codes, lattice, beams and context.partner` (item 1 to
  `codes`, 2 to `lattice`, 3 to `beams`, 4 to `context.partner`; the test builds a request with `buildRequest` and
  asserts those four fields are filled; `v`, `lang`, `mode` and `k` are protocol fields with no visitor data and are
  not listed; `context.recent` is asserted to be `[]`).
- `tokens.test.ts`: the six new motion tokens (MS-8.2).
- `test/e2e/site.mjs`: at 1280 × 800, 1920 × 1080 and 1024 × 768 the step under the middle line is the one the picture
  shows and outlines, scrolling down and up (MS-8.12); `MS-8.12 How plays every step from the top on tall
  viewports` at 1024 × 1366 and 1920 × 1200 (load at the top, scroll through How in 40px steps, expect
  `data-how-play` to become 1, 2 and 3 in turn); `MS-8.12 step 1 plays with the whole How picture in view` at
  1366 × 650, 1024 × 768 and 1280 × 800 (when `data-how-step` first becomes 1, the picture's box is inside the
  viewport); `MS-8.11 tall drawings play in view` at 320 × 568 and 375 × 667 (scrolling in 40px steps, when a How
  stage or the proof figure gets `data-played="1"`, its top is at -40px or more and its bottom at the viewport
  height or less, so the whole box is in view within one scroll step); a reload scrolled to `#access` shows the drawings in view
  finished with no animation (MS-8.13); every drawing has no animation and shows its finished state 4.5 s after it
  crosses the play line (MS-8.11); reduced motion: finished states and `getAnimations()` empty (MS-8.7); no drawing
  overflows its stage, the How stages, the desktop How picture or the proof figure at the 14 sizes and with XL keys,
  in width and height, with "Press a key to start" on one line in the well at 320px and 1024px (MS-7.7); `MS-7.7 stages in a section have equal heights` (switch card excepted); CLS 0 while drawings play
  (MS-11.2); every drawn keypad key (`.nl-key`) 64-84px except the Touch drawing's 72 and 128px (MS-10.8); at 1280 ×
  800 and 1920 × 1080 Conversation and Privacy show 2 cards per row, and the tall switch card's last child ends within
  24px of its inner bottom edge at 1280 × 800 and 768 × 1024 (MS-10.9); the bento order by Tab (MS-10.9); axe as today
  (MS-13.1).

## 10. Responses to the first design review (2026-11-11)

Every finding of the first review is addressed; none is backlogged or ignored, and none changes a product call
(V1-V17 stand; V18-V24 in `decisions.md` record the design choices).

| # | Finding | Response | Where |
|---|---|---|---|
| 1 | 4-card grids become 3 + 1 | Fixed: `.site-grid--boxes`, 2 columns from 648px; `.site-grid--2` removed; MS-10.9 and `site.mjs` at 1280 and 1920 (V18) | 4.3; MS-10.9; R2.5 |
| 2 | Desktop How picture as `data-play` | Fixed: the picture has no `data-play`; only the per-step stages are roots; unit test | 3.3, 4.1; MS-8.12; R2.3 |
| 3 | Drawings in view at mount blink | Fixed with option (a): in view or above at mount means finished, never played; How uses `data-how-live` (V19). Option (a) was chosen because it is the rule reveals already follow (MS-8.4) and it adds no motion | 3.3, 4.1; MS-8.12, MS-8.13; ADR-006 amendment clarified |
| 4 | Tall switch tile empty space | Fixed: the tall card's stage grows from 648px; `site.mjs` check | 4.3; MS-10.9 |
| 5 | How stages unsized; the well with Speaking overflows | Fixed: stage heights 416/288/160px; the stage well wraps with Speak and Speaking in one cell; MS-7.7 and the overflow check cover the How stages, the desktop picture and the proof figure (V20) | 4.1, 4.3; MS-7.7 |
| 6 | No per-step `--play-step` on the desktop picture | Fixed: `.site-how__picture [data-s="N"]` sets it per part | 4.1; R2.3 |
| 7 | Proof column-box geometry | Fixed: 5 boxes in each of the 4 digit lines, 32 × 24px, column c shares k(4+c)/u(5+c) (V21) | 4.2; MS-7.9; R2.4 |
| 8 | `u0`, helper and ring signatures | Fixed: `.site-u0`-`.site-u13`; `roles.ts` and `KeypadPicture` `rings` signatures; "every step class has a rule" test | 3.2, 4.4; R2.2 |
| 9 | Hidden stages marked instant | Fixed: elements with no box are skipped and stay observed; unit test | 3.3; MS-8.13 |
| 10 | Fill test vs A1, A2, A4 | Fixed: rule and test scoped to drawing play rules; A1, A2, A4 unchanged | 3.2, 9; MS-8.11 |
| 11 | MS-7.2 "last frame" | Fixed: reworded | MS-7.2 |
| 12 | MS-10.8 "every drawn key" | Fixed: "every drawn keypad key (`.nl-key`)"; `site.mjs` selects `.nl-key` | MS-10.8 |
| 13 | `RANKING_SENT` field mapping | Fixed: mapping and excluded fields in MS-7.10 and the test | 9; MS-7.10 |
| 14 | Privacy stage too small | Fixed: 288px (`calc(var(--space-24) * 3)`) | 4.3; R2.5 |
| 15 | Active label mechanism | Fixed: two stacked spans in a `.site-cell`; the card is `position: relative` | 4.1 |
| 16 | Listen label two roles | Fixed: three labels in one `.site-cell` (Listen out u2, Stop during 2-3, Listen in k3) | 4.4; R2.6 |
| 17 | Sticky picture on short windows | Fixed: sticky top `var(--space-4)` under 679px tall; below 632px the bottom keypad row is cut, accepted and stated (V22) | 4.1 |
| 18 | MS-8.3 "type out text" | Fixed: carve-out for the keypad state changing once per drawn key press | MS-8.3 |
| 19 | Task order and unnamed tests | Fixed: A5 parts are removed with the drawing that uses them (the last in task 38, with the MS-8.5 test); each task replaces its own round-1 frame-count case; the `activeStep`, `splitInitialPlay` and MS-7.7 equal-height tests are named (V23) | tasks.md 33-41; §9 |

The review's "not verified" items stay as stated: the byte estimates of §5 and the 15 KB markup threshold are
measured in tasks 39.1 and 44 (the implementer records today's markup size in the MS-11.6 test before adding the
drawings; if the page goes over 15 KB, the implementer stops and reports, and the threshold changes only through a
spec change, V24); the middle-line observer's behaviour in Chromium
and WebKit is checked by the `site.mjs` step-sync run at three sizes in both engines (task 43).

## 11. Responses to the second design review (2026-11-11, `design-review.md` revision 2)

13 findings are fixed; NIT 14 is backlogged with a reason. No fix changes a product call: V1's play line (30% above
the bottom) and its purpose (a drawing plays once, where the visitor sees it) stand, and V25 only defines what
"reaches" means for a box; V26 amends V19, which was a design-phase decision; the backlogged NIT keeps V10 as the
product owner decided it. Decisions V25-V31 in `decisions.md`.

| # | Sev. | Finding | Response | Where |
|---|---|---|---|---|
| 1 | HIGH | Tall viewports: the How picture is in view at mount and never plays | Fixed: `howStart` returns `'live'`, `'deferred'` or `'finished'`; a picture in view with no active step keeps its finished state and starts the story (live, step 1, play 1, in one callback) when step 1 crosses the middle line; `'finished'` only when a step is already active or there is no box (V26). Unit tests `MS-8.12 howStart …` and `MS-8.12 a How picture in view at mount with no active step plays from step 1`; `site.mjs` at 1024 × 1366 and 1920 × 1200 from the top | 3.3; §9; MS-8.12; R2.2; ADR-006 A8 |
| 2 | HIGH | Tall drawings play with their changing parts below the fold | Fixed: `shouldPlay` (whole box above the play line, or top at the top of the viewport, with part of it on screen). The reviewer's single observer with thresholds `[0, 0.25, 0.5, 0.75, 1]` cannot see the second moment: while a box taller than the play area covers it, its ratio stays constant, so no threshold is crossed when its top passes 0. So two observers call `shouldPlay`: the play area (`-30%` bottom margin, thresholds `[0, 1]`) and a top line (`-100%` bottom margin, the middle-line technique) (V25). Glossary and MS-8.11 updated; unit tests `MS-8.11 shouldPlay …` and `MS-8.11 both play observers …`; `site.mjs` at 320 × 568 and 375 × 667 | 3.3; §8, §9; glossary; MS-8.11; R2.2; ADR-006 A7 |
| 3 | MEDIUM | Desktop step 1 active before the picture is in view | Fixed: `--site-how-h` (616px as a token sum) is the picture's `block-size` from 1024px, and the steps' top padding is `max(12svh, calc(var(--site-how-h) - 50svh))`; the 4.1 sentence corrected; `site.mjs` at 1366 × 650, 1024 × 768 and 1280 × 800 (V30) | 4.1; §8, §9; R2.3 |
| 4 | MEDIUM | "Press a key to start" wraps | Fixed: `label` type (16px/600, `--ink-muted`, about 170px) in the well text cell, one `candidate` line tall; in content.md §2 and the MS-7.7 overflow check at 320 and 1024px (V27) | 4.1; content.md §2; MS-7.7 |
| 5 | MEDIUM | MS-8.11's first change vs sequences that start at k1 | Fixed: MS-8.11 now says no change comes earlier than the lead and every change comes a whole number of steps after it (t(k) = lead + k × step). The ADR-006 A7 bullet states no first-change time, so it needs no edit for this | MS-8.11 |
| 6 | NIT | `--reveal-i` leads | Fixed: the lead uses `--play-i`, the card's column in its row, set by layout CSS; 0 for the How stages, the picture and the proof (V28); CSS test `MS-8.11 the play lead uses --play-i, never --reveal-i` | 3.2; MS-8.11; R2.2 |
| 7 | NIT | `role('ring', 4 + c, 5 + c)` does not type-check | Fixed: typed tables `SWEEP`, `TYPING`, `DIGIT_LINE`, `CHIP` (`Span = readonly [KStep, UStep]`); the diff mark is `role('mark', SWEEP[diffAt][0])` (V31) | 3.2, 4.2; R2.4 |
| 8 | NIT | Ring handovers show two rings for 120 ms | Fixed: MS-7.3 says a handover over `motion-jump` (one ring out while the next comes in) counts as one ring, as in the hero demo (V29) | 3.2, 4.4; MS-7.3 |
| 9 | NIT | No width-overflow fallback; LayoutBoxes exactly 240px | Fixed: LayoutBoxes 36, 72 and 96px wide with 8px gaps and 14px labels, about 226px; a width overflow narrows boxes and gaps, never text (V31) | 4.3, 4.4 |
| 10 | NIT | "Model ranking" drawing title only in content.md | Fixed: dropped from content.md §6 (the card's `h3` already says it); the Privacy stage stays 288px | content.md §6 |
| 11 | NIT | A5 removal per task; 2.8 s totals | Fixed: tasks 36 and 37 now remove the proof's and Show's own A5 rules and frame-count cases (V23 as written; the shared `site-frame-*` keyframes and the rest go in task 38); Saved phrases and Listen are 2.7 s, and Model ranking is 3.2 s (700 + 6 × 400 + 120), which the review did not flag | 4.4; tasks 36-38 |
| 12 | NIT | Caption digits read one by one | Fixed: a `nl-sr-only` span holds "Your keys: 92837"; the visible label and digit grid are `aria-hidden`; asserted in the MS-7.9 unit test, and VoiceOver is checked in task 43 (V31) | 4.2; R2.4; MS-7.9 |
| 13 | NIT | How key 6 shows two presses as one | Fixed: two rings, 1-2 and 2-3, the second with `.site-late` (in `motion-jump` after t(2)), so each press shows once; unit test `MS-7.3 a repeated key press is two rings, the second late` (V29) | 3.2, 4.1; R2.3 |
| 14 | NIT | The tall switch stage is mostly empty from 648 to 1023px | Backlogged: the tall tile from 648px is the product owner's call (V10). Task 43 records a screenshot at 768 × 1024; the alternative (the switch card spanning both columns from 648 to 1023px) is written out in 4.3 and needs the product owner's yes | 4.3; task 43 |

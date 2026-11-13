// The website's stylesheet, read as text (marketing-site design.md "Test plan" site-css.test.ts).
// Static cases: drawn keys, ember, colours, breakpoints, the short-landscape rule, key sizes and the
// bar's DOM order. Motion cases (MS-8, MS-5.5, MS-6.9): site.css and the A6 rules in globals.css.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const raw = readFileSync(resolve(__dirname, '../components/site/site.css'), 'utf8');
/** The stylesheet without comments, so prose never trips a check. */
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every at-rule block whose prelude matches, as { prelude, body, start }, with balanced braces. */
function atBlocks(source: string, prelude: RegExp): { prelude: string; body: string; start: number; end: number }[] {
  const out: { prelude: string; body: string; start: number; end: number }[] = [];
  const re = /@(media|supports)([^{]*)\{/g;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    let depth = 1;
    let i = re.lastIndex;
    for (; i < source.length && depth > 0; i += 1) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}') depth -= 1;
    }
    const p = `@${m[1]}${m[2]}`.trim();
    if (prelude.test(p)) out.push({ prelude: p, body: source.slice(re.lastIndex, i - 1), start: m.index, end: i });
  }
  return out;
}

/** The stylesheet with every @media and @supports block (and anything nested in one) removed. */
function outsideAtRules(source: string): string {
  let out = '';
  let from = 0;
  for (const b of atBlocks(source, /./)) {
    if (b.start < from) continue; // nested inside a block already removed
    out += source.slice(from, b.start);
    from = b.end;
  }
  return out + source.slice(from);
}

describe('site.css (static)', () => {
  it('MS-7.2 drawn keys are not controls: no pointer and no :active ring', () => {
    expect(css).toMatch(/\.site-key \{[^}]*cursor: default/);
    expect(css).toMatch(/\.site-key:active \{[^}]*box-shadow: none/);
    expect(css).toMatch(/\.site-drawing \.nl-candidate \{[^}]*cursor: default/);
    expect(css).toMatch(/\.site-drawn-btn \{[^}]*cursor: default/);
  });

  it('MS-7.3 MS-9.1 never sets an ember token as a background', () => {
    expect(css).not.toMatch(/background(-color)?:[^;]*var\(--ember/);
  });

  it('MS-9.2 tokens only: no hex, rgb() or hsl() colour literals', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/\b(rgba?|hsla?)\(/i);
  });

  it('MS-10.1 has the phone, tablet and desktop queries', () => {
    expect(css).toContain('@media (max-width: 599px)');
    expect(css).toContain('@media (min-width: 600px)');
    expect(css).toContain('@media (min-width: 1024px)');
  });

  it('MS-3.3 MS-10.7 the short-landscape rule hides the nav and comes after the tablet and desktop rules', () => {
    const blocks = atBlocks(css, /^@media \(orientation: landscape\) and \(max-height: 500px\)$/);
    expect(blocks).toHaveLength(1);
    const landscape = blocks[0]!;
    expect(landscape.body).toMatch(/\.site-bar nav \{ display: none; \}/);
    expect(landscape.body).toMatch(/\.site-hero__title \{ font-size: clamp\(36px, 11svh, var\(--type-display-size\)\); \}/);
    for (const b of atBlocks(css, /min-width: (600|1024)px/)) expect(b.start).toBeLessThan(landscape.start);
    // W1 (2026-11-12): the nav shows from 960px, so the bar is one row at every width; under 352px the brand is its icon.
    expect(atBlocks(css, /^@media \(max-width: 959px\)$/)[0]!.body).toMatch(/\.site-bar nav \{ display: none; \}/);
    expect(atBlocks(css, /^@media \(max-width: 351px\)$/)[0]!.body).toMatch(/\.site-bar \.nl-brand__name \{[^}]*position: absolute;[^}]*clip-path: inset\(50%\);/);
  });

  it('MS-10.5 MS-10.8 sets no key size and has no .site-demo__pad rule', () => {
    expect(css).not.toContain('--nl-key');
    expect(css).not.toContain('.site-demo__pad');
  });

  it('MS-13.2 never reorders the bar: no order declaration', () => {
    expect(css).not.toMatch(/(^|[{;\s])order\s*:/);
  });

  it('MS-10.4 standalone links and link groups: 56px targets, 8px apart', () => {
    expect(css).toMatch(/\.site \.site-nav a, \.site \.site-footer__nav a, \.site \.site-links a \{[^}]*min-height: var\(--target-min\); min-width: var\(--target-min\);/);
    expect(css).toMatch(/\.site-nav, \.site-footer__nav, \.site-links \{[^}]*gap: var\(--space-2\) var\(--space-6\)/);
  });

  it('MS-10.4 question summaries are 8px or more apart: 4px above and below each 2px rule', () => {
    expect(css).toMatch(/\.site-faq \{ padding-block: var\(--space-1\); \}/);
    expect(css).toMatch(/\.site-faq \+ \.site-faq \{ border-top: var\(--line-width\) solid var\(--line\); \}/);
  });
});

// ---- motion ---------------------------------------------------------------------------------------

const globalsCss = readFileSync(resolve(__dirname, '../styles/globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const NO_PREFERENCE = /^@media \(prefers-reduced-motion: no-preference\)$/;
const REDUCE = /^@media \(prefers-reduced-motion: reduce\)$/;

/** Every block opened by an at-rule matching `opener` (for example /@keyframes[^{]*\{/g), braces balanced. */
function blocksOf(source: string, opener: RegExp): { start: number; end: number; body: string }[] {
  const out: { start: number; end: number; body: string }[] = [];
  const re = new RegExp(opener.source, 'g');
  for (let m = re.exec(source); m; m = re.exec(source)) {
    let depth = 1;
    let i = re.lastIndex;
    for (; i < source.length && depth > 0; i += 1) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}') depth -= 1;
    }
    out.push({ start: m.index, end: i, body: source.slice(re.lastIndex, i - 1) });
  }
  return out;
}

/** The source with the given blocks cut out (nested ones are skipped). */
function without(source: string, blocks: { start: number; end: number }[]): string {
  let out = '';
  let from = 0;
  for (const b of [...blocks].sort((a, z) => a.start - z.start)) {
    if (b.start < from) continue;
    out += source.slice(from, b.start);
    from = b.end;
  }
  return out + source.slice(from);
}

const keyframes = (source: string) => blocksOf(source, /@keyframes[^{]*\{/);
const noPreference = (source: string) => atBlocks(source, NO_PREFERENCE);

interface Rule {
  selector: string;
  decls: { prop: string; value: string }[];
}
/** Leaf style rules, with @keyframes bodies left out. */
function rules(source: string): Rule[] {
  const text = without(source, keyframes(source));
  return [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1]!.trim(),
    decls: m[2]!
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const i = d.indexOf(':');
        return { prop: d.slice(0, i).trim(), value: d.slice(i + 1).trim() };
      }),
  }));
}
const isMotionProp = (p: string) => /^(animation|transition)(-|$)/.test(p);
const motionDecls = (r: Rule) => r.decls.filter((d) => isMotionProp(d.prop));
const stripVars = (v: string) => {
  let out = v;
  for (let prev = ''; prev !== out; ) {
    prev = out;
    out = out.replace(/var\([^()]*\)/g, '');
  }
  return out;
};

describe('site.css and globals.css (motion)', () => {
  it('MS-8.1 outside the no-preference blocks there is no animation or transition, and every site.css motion rule is under [data-site-motion', () => {
    for (const source of [css, globalsCss]) {
      const outside = without(source, [...noPreference(source), ...atBlocks(source, REDUCE)]);
      for (const r of rules(outside)) {
        for (const d of motionDecls(r)) expect(d.value, `${r.selector} ${d.prop}`).toBe('none');
      }
    }
    const siteMotion = rules(noPreference(css).map((b) => b.body).join('\n')).filter((r) => motionDecls(r).length > 0);
    expect(siteMotion.length).toBeGreaterThan(10);
    for (const r of siteMotion) {
      // Split on top-level commas only, so :is(a, b) and :not(a, b) stay whole (round 4).
      for (const part of r.selector.split(/,(?![^(]*\))/)) expect(part.trim(), r.selector).toMatch(/^\[data-site-motion/);
    }
    expect(atBlocks(css, REDUCE)).toHaveLength(0);
  });

  it('MS-8.1 (R4) globals.css animates only the A6 view transition and keeps the reduce guard', () => {
    const reduce = atBlocks(globalsCss, REDUCE);
    expect(reduce).toHaveLength(1);
    expect(reduce[0]!.body).toMatch(/\*, \*::before, \*::after \{ transition: none !important; animation: none !important;/);
    const vt = rules(noPreference(globalsCss).map((b) => b.body).join('\n')).filter((r) => motionDecls(r).length > 0);
    expect(vt.map((r) => r.selector)).toEqual(['::view-transition-group(root)']);
    expect(vt[0]!.decls).toEqual([{ prop: 'animation-duration', value: 'var(--motion-crossfade)' }]);
  });

  it('MS-8.2 durations, delays and easings come only from --motion-* tokens', () => {
    for (const source of [css, globalsCss]) {
      expect(source).not.toMatch(/\b\d+(\.\d+)?m?s\b/);
      expect(source).not.toContain('cubic-bezier(');
      for (const r of rules(source)) {
        for (const d of motionDecls(r)) {
          expect(stripVars(d.value), `${r.selector} ${d.prop}`).not.toMatch(/\b(linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end)\b|steps\(/);
          for (const v of d.value.match(/var\(--[a-z0-9-]+/g) ?? []) {
            if (/var\(--(motion|reveal-i|play-lead|play-step|k|u|late)\b/.test(v)) continue;
            throw new Error(`${r.selector} ${d.prop} uses ${v}`);
          }
        }
      }
    }
    expect(css).toMatch(/\.site-demo \.site-key::after \{ transition: opacity var\(--motion-jump\) var\(--motion-ease-linear\); \}/);
    expect(css).toContain('translateY(var(--motion-reveal-distance))');
  });

  it('MS-8.3 nothing loops, alternates or repeats', () => {
    for (const source of [css, globalsCss]) {
      expect(source).not.toMatch(/\binfinite\b/);
      expect(source).not.toMatch(/\balternate\b/);
      for (const m of source.matchAll(/animation-iteration-count:\s*([^;}]+)/g)) expect(m[1]!.trim()).toBe('1');
    }
  });

  it('MS-8.5 no scroll-timeline property anywhere', () => {
    // A5 (scroll-linked frames) is retired: drawings play once (A7) and How follows its steps (A8).
    for (const source of [css, globalsCss]) {
      expect(source).not.toMatch(/(animation-timeline|animation-range|view-timeline|scroll-timeline|timeline-scope)\s*:/);
      expect(source).not.toMatch(/@supports \(animation-timeline/);
      expect(source).not.toMatch(/scroll-snap/);
      expect(source).not.toMatch(/scroll-behavior:\s*smooth/);
    }
    expect(css).not.toMatch(/\.site-frames?\b|site-frame-/);
  });

  it('MS-8.6 the cross-document view transition is opted in only inside a no-preference block', () => {
    expect(noPreference(globalsCss).some((b) => /@view-transition \{ navigation: auto; \}/.test(b.body))).toBe(true);
    expect(without(globalsCss, noPreference(globalsCss))).not.toContain('@view-transition');
    expect(css).not.toContain('@view-transition');
  });

  it('MS-8.10 every @keyframes changes only opacity and transform', () => {
    const all = [...keyframes(css), ...keyframes(globalsCss)];
    const names = (source: string) => [...source.matchAll(/@keyframes ([a-z-]+) \{/g)].map((m) => m[1]);
    // Round 4 (PO-1): the Results bars grow once with site-grow, a transform-only keyframe; the A10 answer reuses
    // site-rise, so no other keyframe is added.
    expect([...names(css)].sort()).toEqual(['site-fade-in', 'site-grow', 'site-in', 'site-out', 'site-reveal', 'site-rise']);
    expect(names(globalsCss)).toEqual([]);
    expect(all).toHaveLength(6);
    for (const k of all) {
      for (const m of k.body.matchAll(/([a-z-]+)\s*:/g)) expect(['opacity', 'transform']).toContain(m[1]);
    }
    // site-grow plays only on a played drawing's .site-grow part, filling backwards, so the full bar is the finished
    // state; a scaled-down bar exists only as that part's before-play state.
    for (const r of rules(css)) {
      for (const d of motionDecls(r)) {
        if (!/\bsite-grow\b/.test(d.value)) continue;
        for (const part of r.selector.split(/,(?![^(]*\))/)) expect(part.trim()).toMatch(/\[data-play\]\[data-played="1"\] \.site-grow$/);
        expect(d.value, r.selector).toMatch(/ backwards$/);
      }
      for (const v of declsOf(r, 'transform')) {
        if (/scale/.test(v)) expect(r.selector, v).toMatch(/^\[data-site-motion="on"\] \[data-play\]:not\(\[data-played\]\) \.site-grow$/);
      }
    }
  });

  it('MS-5.5 the numbers never animate and are never revealed digit by digit', () => {
    for (const r of rules(css)) {
      if (/\.site-stat/.test(r.selector)) expect(motionDecls(r), r.selector).toHaveLength(0);
      if (/data-reveal/.test(r.selector)) expect(r.selector).not.toMatch(/\.site-stat|\bdd\b/);
    }
  });

  it('MS-6.9 the arrival fades: A1 and A2 run once, before data-site-arrived, on the slow fade tokens', () => {
    const motion = rules(noPreference(css).map((b) => b.body).join('\n'));
    const a1 = motion.find((r) => r.selector === '[data-site-motion]:not([data-site-arrived]) .site-top::before')!;
    expect(a1.decls).toEqual([{ prop: 'animation', value: 'site-fade-in var(--motion-fade-slow) var(--motion-ease-out) both' }]);
    const a2 = motion.find((r) => r.selector === '[data-site-motion]:not([data-site-arrived]) .site-top .site-key--ninth::after')!;
    expect(a2.decls).toEqual([
      { prop: 'animation', value: 'site-fade-in var(--motion-fade-slow) var(--motion-ease-out) var(--motion-delay-arrival) both' },
    ]);
    // The ninth key's resting ring is never animated anywhere else.
    for (const r of motion) {
      if (r === a2 || !/site-key--ninth/.test(r.selector)) continue;
      expect(motionDecls(r), r.selector).toHaveLength(0);
    }
  });

  it('MS-8.4 the three reveal rules of design A4, the :focus-within one included', () => {
    const body = noPreference(css).map((b) => b.body).join('\n');
    expect(body).toContain('[data-site-motion="on"] [data-reveal]:not([data-revealed]) { opacity: 0; transform: translateY(var(--motion-reveal-distance)); }');
    expect(body).toContain('[data-site-motion="on"] [data-reveal]:not([data-revealed]):focus-within { opacity: 1; transform: none; }');
    expect(body).toMatch(
      /\[data-site-motion="on"\] \[data-reveal\]\[data-revealed="1"\] \{\s*animation: site-reveal var\(--motion-fade\) var\(--motion-ease-out\) calc\(var\(--reveal-i, 0\) \* var\(--motion-stagger\)\) both;\s*\}/,
    );
    expect(body).toMatch(/@keyframes site-reveal \{\s*from \{ opacity: 0; transform: translateY\(var\(--motion-reveal-distance\)\); \}\s*to \{ opacity: 1; transform: none; \}\s*\}/);
  });
});

// ---- round 2: played drawings and the box grids (design R2.2, R2.5) --------------------------------

/** Selectors of the played-drawing machinery: step classes, play classes, the late ring, data-play. */
const PLAY_MACHINERY = /\.site-[ku]\d|\.site-play--|\.site-late|\[data-play|\[data-played|--play-i/;
const ROLE = /\.site-(in|rise|out|during|ring|mark)\b/;
const declsOf = (r: Rule, prop: string) => r.decls.filter((d) => d.prop === prop).map((d) => d.value);
/** The comma-separated layers of an animation shorthand (no commas inside its calc()s). */
const layers = (value: string) => value.split(/,(?![^(]*\))/).map((s) => s.trim());

describe('site.css round 2 (played drawings, stages and grids)', () => {
  const motionBody = noPreference(css).map((b) => b.body).join('\n');
  const motionRules = rules(motionBody);
  const outside = without(css, noPreference(css));

  it('MS-8.11 role and step rules only inside no-preference and [data-site-motion="on"]', () => {
    for (const r of rules(outside)) {
      expect(r.selector, r.selector).not.toMatch(PLAY_MACHINERY);
      // Outside the motion block a role class only gets its finished opacity.
      if (ROLE.test(r.selector)) for (const d of r.decls) expect(d.prop, r.selector).toBe('opacity');
    }
    const machinery = motionRules.filter((r) => PLAY_MACHINERY.test(r.selector) || (ROLE.test(r.selector) && motionDecls(r).length > 0));
    expect(machinery.length).toBeGreaterThan(30);
    for (const r of machinery) {
      for (const part of r.selector.split(/,(?![^(]*\))/)) expect(part.trim(), r.selector).toMatch(/^\[data-site-motion="on"\]/);
    }
    // 13 k steps, 14 u steps and the four play classes, one rule each.
    for (let k = 0; k <= 12; k += 1) expect(motionBody).toContain(`[data-site-motion="on"] .site-k${k} { --k: ${k}; }`);
    for (let u = 0; u <= 13; u += 1) expect(motionBody).toContain(`[data-site-motion="on"] .site-u${u} { --u: ${u}; }`);
    expect(motionBody).not.toMatch(/\.site-k13\b|\.site-u14\b/);
    for (const [p, token] of [['frame', 'motion-frame'], ['quick', 'motion-frame-quick'], ['sweep', 'motion-sweep'], ['type', 'motion-demo-step']]) {
      expect(motionBody).toContain(`[data-site-motion="on"] .site-play--${p} { --play-step: var(--${token}); }`);
    }
    expect(motionBody).toContain('[data-site-motion="on"] .site-ring { --late: calc(var(--motion-jump) * 0); }');
    expect(motionBody).toContain('[data-site-motion="on"] .site-ring.site-late { --late: var(--motion-jump); }');
    // The before-play state.
    expect(motionBody).toContain('[data-site-motion="on"] [data-play]:not([data-played]) :is(.site-in, .site-mark) { opacity: 0; }');
    expect(motionBody).toContain('[data-site-motion="on"] [data-play]:not([data-played]) .site-rise { opacity: 0; transform: translateY(var(--motion-nudge)); }');
    expect(motionBody).toContain('[data-site-motion="on"] [data-play]:not([data-played]) .site-out { opacity: 1; }');
    // Every role plays only on data-played="1", never on "instant".
    for (const name of ['in', 'rise', 'out', 'during', 'ring', 'mark']) {
      const play = motionRules.find((r) => r.selector === `[data-site-motion="on"] [data-play][data-played="1"] .site-${name}`);
      expect(play, name).toBeDefined();
      expect(declsOf(play!, 'animation')).toHaveLength(1);
    }
    expect(motionBody).not.toContain('data-played="instant"');
    // The ring: site-out at t(u), then site-in at t(k) plus the late press.
    const ring = layers(declsOf(motionRules.find((r) => r.selector.endsWith('[data-played="1"] .site-ring'))!, 'animation')[0]!);
    expect(ring).toEqual([
      'site-out var(--motion-jump) var(--motion-ease-linear) calc(var(--play-lead) + var(--u) * var(--play-step)) backwards',
      'site-in var(--motion-jump) var(--motion-ease-linear) calc(var(--play-lead) + var(--k) * var(--play-step) + var(--late)) backwards',
    ]);
    for (const name of ['site-in', 'site-out', 'site-rise']) expect(motionBody).toMatch(new RegExp(`@keyframes ${name} \\{`));
  });

  it('MS-8.11 drawing play rules fill backwards only', () => {
    const play = rules(css).filter((r) => /\[data-play|\[data-how-play|site-how__picture/.test(r.selector) && motionDecls(r).length > 0);
    expect(play.length).toBeGreaterThanOrEqual(6);
    for (const r of play) {
      for (const d of motionDecls(r)) {
        expect(d.prop, r.selector).toBe('animation');
        for (const layer of layers(d.value)) {
          expect(layer, r.selector).toMatch(/ backwards$/);
          expect(layer, r.selector).not.toMatch(/\b(forwards|both)\b/);
        }
      }
    }
  });

  it('MS-7.5 base role rules show the finished state', () => {
    const top = outsideAtRules(css);
    expect(top).toContain('.site-out, .site-during, .site-ring { opacity: 0; }');
    expect(top).toContain('.site-cell { display: grid; }');
    expect(top).toContain('.site-cell > * { grid-area: 1 / 1; }');
    // .site-in, .site-rise and .site-mark keep the default opacity 1 and no transform outside the motion block.
    for (const r of rules(top)) {
      if (/\.site-(in|rise|mark)\b/.test(r.selector)) throw new Error(`${r.selector} hides a finished part`);
    }
    // The drawn rings are overlays, so a change never moves anything.
    expect(top).toMatch(/\.site-key-ring \{[^}]*position: absolute; inset: 0;[^}]*box-shadow: inset 0 0 0 var\(--ring-width\) var\(--ember\);/);
    expect(top).toMatch(/\.site-drawn-btn \{ position: relative;/);
    expect(top).toContain('.site-drawing .nl-candidate { cursor: default; }');
    // Stages: minimum heights from tokens (216px, Privacy 288px, switches 384px), so text spacing (WCAG 1.4.12)
    // grows a stage instead of cutting its drawing off (MS-7.7, review N8); no fixed block-size on a stage.
    expect(top).toMatch(/\.site-stage \{[^}]*overflow: clip;[^}]*min-block-size: var\(--stage-s\);/);
    // Round 4 (r4-boxes): a row's stage is 288px (stage-m); a lead card's stage at least 384px (stage-l) from 600px.
    expect(top).toContain('.site-stage--m { min-block-size: var(--stage-m); }');
    expect(top).toContain('.site-stage--lead { min-block-size: var(--stage-m); }');
    expect(css).toContain('@media (min-width: 600px) { .site-stage--lead { min-block-size: var(--stage-l); } }');
    expect(top).not.toMatch(/\.site-(?:how__)?stage[^{,]*\{[^}]*(?<!min-)block-size/);
  });

  it('MS-10.9 the box grids: a lead card across the grid, then two cards a row from 648px; no tall card and no order', () => {
    // Round 4 (r4-boxes): .site-bento (Conversation, Access, Privacy). Every card is at least 288px wide from 648px.
    const at = (width: number) => atBlocks(css, new RegExp(`^@media \\(min-width: ${width}px\\)$`)).map((b) => b.body).join('\n');
    expect(at(648)).toContain('.site-bento { grid-template-columns: repeat(2, minmax(0, 1fr)); }');
    expect(at(648)).toContain('.site-bento > .site-card--lead { grid-column: 1 / -1; }');
    // A row's cards share its lines (subgrid), so their stages are one height and their titles level (MS-7.7).
    expect(at(648)).toContain('.site-bento--3 > .site-card:not(.site-card--lead) { display: grid; grid-row: span 3; grid-template-rows: subgrid; row-gap: var(--space-3); }');
    expect(at(648)).toContain('.site-bento--4 > .site-card:not(.site-card--lead) { display: grid; grid-row: span 4; grid-template-rows: subgrid; row-gap: var(--space-3); }');
    expect(css).not.toContain('site-card--tall');
    expect(css).not.toMatch(/\.site-grid--(boxes|access|start|hug)\b/);
    expect(css).not.toMatch(/(^|[{;\s])order\s*:/);
    expect(css).not.toContain('auto-fit, minmax(288px');
  });

  it('MS-10.9 Conversation and Privacy show three cards a row from 1024px; the lead card puts its stage beside its words', () => {
    const at1024 = atBlocks(css, /^@media \(min-width: 1024px\)$/).map((b) => b.body).join('\n');
    expect(at1024).toContain('.site-bento--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }');
    expect(at1024).toMatch(/\.site-card--lead \{[^}]*grid-template-columns: minmax\(0, 7fr\) minmax\(0, 5fr\);/);
    // The only rules that give a box grid more than one column: 2 from 648px, 3 for .site-bento--3 from 1024px.
    for (const r of rules(css)) {
      if (/^\.site-bento(--[34])?$/.test(r.selector)) {
        for (const v of declsOf(r, 'grid-template-columns')) expect(['repeat(2, minmax(0, 1fr))', 'repeat(3, minmax(0, 1fr))'], r.selector).toContain(v);
      }
    }
  });

  it('MS-8.11 the play lead uses --play-i, never --reveal-i', () => {
    const lead = motionRules.filter((r) => declsOf(r, '--play-lead').length > 0);
    // Round 4 (2026-11-13): a [data-play-scope] (a How step beside its scene) gets the lead too.
    expect(lead.map((r) => r.selector)).toEqual(['[data-site-motion="on"] :is([data-play], [data-play-scope])']);
    // motion-frame per column (review N7), so a neighbour's single ring has ended; --play-after for longer ones.
    expect(declsOf(lead[0]!, '--play-lead')).toEqual(['calc(var(--motion-play-lead) + var(--play-i, 0) * var(--motion-frame) + var(--play-after, calc(var(--motion-jump) * 0)))']);
    for (const r of rules(css)) {
      if (/\[data-play|\[data-how|site-how__picture|\.site-(in|rise|out|during|ring|mark)\b/.test(r.selector)) {
        for (const d of r.decls) expect(d.value, r.selector).not.toContain('--reveal-i');
      }
    }
    // The column rules (V28).
    const at = (width: number) => atBlocks(motionBody, new RegExp(`^@media \\(min-width: ${width}px\\)$`)).map((b) => b.body).join('\n');
    // Round 4 (r4-boxes): after each lead card, the cards' columns: the second of a row is column 1 from 648px, the
    // third of Conversation's and Privacy's row column 2 from 1024px.
    expect(at(648)).toContain('[data-site-motion="on"] .site-bento > :nth-child(2n + 3) { --play-i: 1; }');
    // Touch waits for the Keyboard drawing's four quick rings.
    expect(at(648)).toContain('[data-site-motion="on"] .site-bento--4 > :nth-child(3) { --play-i: 0; --play-after: calc(4 * var(--motion-frame-quick)); }');
    expect(at(1024)).toContain('[data-site-motion="on"] .site-bento--3 > :nth-child(4) { --play-i: 2; }');
    // Round 4 (lead ruling, MS-8.11): the column lead counts at most 2 columns, so a row of three staggers.
    for (const r of rules(css)) for (const v of declsOf(r, '--play-i')) expect(['0', '1', '2'], r.selector).toContain(v);
  });

  it('MS-8.12 (round 4, removed) How has no step sync, sticky picture or runway; from 1024px its row plays in story order', () => {
    // A8 is gone with the sticky picture (MS-8.12 removed): no data-how-*/data-s rule, no runway, nothing sticky.
    expect(css).not.toMatch(/data-how-|\[data-s[=\]]|site-how__picture|--site-how-h|site-how-screen|1[26]svh|timeline-scope|site-frames--how/);
    for (const r of rules(css)) expect(declsOf(r, 'position').join(' '), r.selector).not.toContain('sticky');
    // Story order (MS-8.11, round 4): step 2 waits step 1's four presses, step 3 also step 2's five sweeps.
    const motion1024 = atBlocks(motionBody, /^@media \(min-width: 1024px\)$/).map((b) => b.body).join('\n');
    expect(motion1024).toContain('[data-site-motion="on"] .site-how__step:nth-child(2) { --play-after: calc(4 * var(--motion-frame-quick)); }');
    expect(motion1024).toContain(
      '[data-site-motion="on"] .site-how__step:nth-child(3) { --play-after: calc(4 * var(--motion-frame-quick) + 5 * var(--motion-sweep)); }',
    );
    // Below 1024px no How step waits: each plays on its own at the play line.
    const motionOutside1024 = without(motionBody, atBlocks(motionBody, /^@media \(min-width: 1024px\)$/));
    for (const r of rules(motionOutside1024)) if (r.selector.includes('site-how')) expect(declsOf(r, '--play-after'), r.selector).toEqual([]);
    // One column, three from 1024px. Below 1024px a stage hugs its scene (12px above and below); in the row every
    // stage is --stage-m, a minimum (N8), so the three scenes reach the play line together.
    const top = outsideAtRules(css);
    expect(top).toContain('.site-how__steps { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-12); }');
    expect(top).toContain('.site-how__stage { min-block-size: 0; padding: var(--space-3) var(--space-2); }');
    const at1024 = atBlocks(outside, /^@media \(min-width: 1024px\)$/).map((b) => b.body).join('\n');
    expect(at1024).toContain('.site-how__steps { grid-template-columns: repeat(3, minmax(0, 1fr)); }');
    expect(at1024).toContain('.site-how__stage { min-block-size: var(--stage-m); padding: var(--space-4); }');
  });

  it('round 4 .site-step is shared: unscoped base rules; its number lights inside a play root (A7) or beside one (:has())', () => {
    const top = outsideAtRules(css);
    // The base rules carry no section scope (a section may still set its own type or tile size on top).
    const base = rules(top).map((r) => r.selector).filter((s) => /^\.site-step(__[a-z]+)?$/.test(s));
    expect(base.sort()).toEqual(['.site-step', '.site-step__line', '.site-step__lit', '.site-step__num', '.site-step__title']);
    expect(top).toMatch(/\.site-step \{ display: grid; grid-template-columns: var\(--site-step-num, var\(--space-12\)\) minmax\(0, 1fr\);/);
    // A title with or without a line: its first line centres on the tile, whatever its type size (1lh).
    expect(top).toMatch(/\.site-step__title \{[^}]*padding-top: max\(0px, calc\(\(var\(--site-step-num, var\(--space-12\)\) - 1lh\) \/ 2\)\);/);
    // Beside a root: the one :has() rule, in the motion block, on the root's clock, filling backwards only.
    const lit = motionRules.filter((r) => r.selector.includes('.site-step__lit'));
    expect(lit.map((r) => r.selector)).toEqual(['[data-site-motion="on"] [data-play-scope]:has([data-play][data-played="1"]) .site-step__lit']);
    expect(layers(declsOf(lit[0]!, 'animation')[0]!)).toEqual([
      'site-out var(--motion-state) var(--motion-ease-out) calc(var(--play-lead) + var(--u) * var(--play-step)) backwards',
      'site-in var(--motion-state) var(--motion-ease-out) calc(var(--play-lead) + var(--k) * var(--play-step)) backwards',
    ]);
    // The forced-colours outline is on the tile.
    expect(atBlocks(css, /forced-colors: active/).map((b) => b.body).join('\n')).toMatch(/\.site-step__num \{\s*outline:/);
  });

  it('MS-7.9 MS-9.3 the differing letter turns reject only with its mark: the plain letter is ink, the box draws a reject copy', () => {
    // Round 4 (2026-11-13): the letter under its key replaces round 3's digit. A colour on the plain letter
    // would single it out before the sweep reaches its column (review B3), so only the mark (.site-letter__box) has it.
    expect(css).toMatch(/\.site-letter \{[^}]*color: var\(--ink\);/);
    expect(css).not.toMatch(/\.site-letter\s*\{[^}]*--proof-reject/);
    expect(css).toMatch(/\.site-letter__box \{[^}]*color: var\(--proof-reject\);[^}]*box-shadow: inset 0 0 0 var\(--line-width\) var\(--proof-reject\);/);
    expect(css).toContain('.site-letter__box::before { content: attr(data-l); }');
  });

  it('MS-9.3 in forced colours every drawn ring and box keeps an outline and the toggle knob stays visible', () => {
    // Round 4: a section may keep its forced-colours rules in its own block (Results), so read every block.
    const forced = atBlocks(css, /^@media \(forced-colors: active\)$/);
    expect(forced.length).toBeGreaterThanOrEqual(1);
    const body = forced.map((b) => b.body).join('\n');
    for (const sel of ['.site-press-ring', '.site-key-ring', '.site-key::after', '.site-scan__press', '.site-outline', '.site-proof__box', '.site-proof__spot', '.site-letter__box', '.site-keycap', '.site-step__num', '.site-scan__ring']) {
      expect(body).toMatch(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\:]/g, '\\$&')}[^{]*\\{[^}]*outline:`));
    }
    expect(body).toContain('.site-toggle, .site-toggle__knob { forced-color-adjust: none; }');
    expect(body).toContain('.site-toggle--on .site-toggle__knob { background: Canvas; }');
  });

  it('MS-10.5 caption (14px) is used only by the footer caption, never inside a drawing (review R3-P2)', () => {
    const rules = [...css.matchAll(/([^{}]+)\{[^}]*var\(--type-caption-size\)[^}]*\}/g)].map((m) => m[1]!.trim());
    expect(rules).toEqual(['.site-footer__caption']);
  });

  it('MS-6.7 Hear it while the demo plays is drawn as a disabled icon button through aria-disabled, with no hover layer (review R3-N6; round 4)', () => {
    // Round 4 (r4-hero): Hear it is a .site-icon-btn; aria-disabled draws a --line ring and an --ink-muted icon.
    expect(css).toMatch(/\.site-icon-btn\[aria-disabled="true"\] \{[^}]*color: var\(--ink-muted\);[^}]*box-shadow: inset 0 0 0 var\(--line-width\) var\(--line\);/);
    // A9's hover layer skips it, as it skips every disabled control (MS-8.14).
    expect(css).toContain('.site .nl-btn:not(.site-drawn-btn, :disabled, [aria-disabled="true"]):hover::after');
  });
});

// ---- round 4: the shared language (r4-language; design.md "Round 4: shared language") --------------------------

describe('site.css round 4 (shared language: A9, A10 and the primitives)', () => {
  const motionBody = noPreference(css).map((b) => b.body).join('\n');
  const top = outsideAtRules(css);
  const hoverBlocks = (source: string) => atBlocks(source, /^@media \(hover: hover\)$/).map((b) => b.body).join('\n');

  it("MS-8.14 the hover layer: a real control's own text colour over its fill, opacity only, at --state-hover", () => {
    // The layer: absolute, the control's shape, its own text colour, hidden at rest. Drawn buttons get none.
    expect(top).toMatch(
      /\.site \.nl-btn:not\(\.site-drawn-btn\)::after, \.site \.site-key--try::before \{\s*content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;\s*background: currentColor; opacity: 0;\s*\}/,
    );
    expect(top).toContain('.site .nl-btn { position: relative; -webkit-tap-highlight-color: transparent; }');
    // globals.css's a:hover must not turn an ember link-button's label ink (1.6:1 on ember, MS-9.2).
    expect(top).toContain('.site a.nl-btn--primary:hover { color: var(--on-ember); }');
    // Shown on hover only on devices that hover, never on disabled or aria-disabled controls; a secondary's edge goes ink.
    const hover = hoverBlocks(without(css, noPreference(css)));
    expect(hover).toMatch(/\.site \.nl-btn:not\(\.site-drawn-btn, :disabled, \[aria-disabled="true"\]\):hover::after,\s*\.site \.site-key--try:hover::before \{ opacity: var\(--state-hover\); \}/);
    expect(hover).toContain('.site .nl-btn--secondary:not(.site-drawn-btn, :disabled, [aria-disabled="true"]):hover { border-color: var(--ink); }');
    // Links thicken their underline; the brand lockup is never underlined (the wordmark is never altered).
    expect(hover).toContain('.site a:not(.nl-btn, .nl-brand):hover, .site .site-faq summary:hover { text-decoration: underline; text-decoration-thickness: var(--line-width); }');
    // Outside the hover query no rule shows the layer, so a tap leaves no sticky hover.
    for (const r of rules(top)) if (/:hover::(after|before)/.test(r.selector)) throw new Error(`${r.selector} shows the layer outside (hover: hover)`);
    // The fade: opacity only, over motion-jump, linear, with motion on.
    expect(motionBody).toMatch(
      /\[data-site-motion\] \.site \.nl-btn:not\(\.site-drawn-btn\)::after,\s*\[data-site-motion\] \.site \.site-key--try::before \{ transition: opacity var\(--motion-jump\) var\(--motion-ease-linear\); \}/,
    );
  });

  it('MS-8.14 nothing a person presses moves: no transform, scale or size change on a key, button or chip state', () => {
    for (const r of rules(css)) {
      if (!/(\.nl-key|\.site-key|\.nl-btn|\.site-icon-btn|\.nl-chip)[^,]*:(hover|active|focus|focus-visible)\b/.test(r.selector)) continue;
      for (const d of r.decls) expect(['transform', 'translate', 'scale', 'rotate', 'width', 'height', 'inline-size', 'block-size', 'zoom'], r.selector).not.toContain(d.prop);
    }
  });

  it('MS-8.14 .site-go: a 56px standalone link whose trailing icon points --motion-hint further its way, only with motion on', () => {
    expect(top).toContain('.site-go { display: inline-flex; align-items: center; gap: var(--space-2); min-height: var(--target-min); border-radius: var(--radius-chip); }');
    expect(top).toContain('.site-go > .nl-icon { flex: none; --site-go-hint: translateX(var(--motion-hint)); }');
    expect(top).toContain('.site-go > .site-icon--up { --site-go-hint: translateY(calc(var(--motion-hint) * -1)); }');
    expect(top).toContain('.site-go > .site-icon--down { --site-go-hint: translateY(var(--motion-hint)); }');
    expect(top).toContain('.site-go > .site-icon--left { --site-go-hint: translateX(calc(var(--motion-hint) * -1)); }');
    expect(top).toContain('.site-go--out > .nl-icon { --site-go-hint: translate(var(--motion-hint), calc(var(--motion-hint) * -1)); }');
    // The hint is applied only in the motion block: on keyboard focus, and on hover where the device hovers.
    for (const r of rules(without(css, noPreference(css)))) {
      if (/\.site-go/.test(r.selector)) expect(declsOf(r, 'transform'), r.selector).toEqual([]);
    }
    expect(motionBody).toContain('[data-site-motion] .site-go > .nl-icon { transition: transform var(--motion-state) var(--motion-ease-out); }');
    expect(motionBody).toContain('[data-site-motion] .site-go:focus-visible > .nl-icon { transform: var(--site-go-hint); }');
    expect(hoverBlocks(motionBody)).toContain('[data-site-motion] .site-go:hover > .nl-icon { transform: var(--site-go-hint); }');
  });

  it('MS-8.15 A10: try-it chips fade in as they mount (opacity only) and an answer rises in as it opens, only with motion on', () => {
    const chip = '[data-site-motion="on"] .site-demo:is(.is-playing, .is-trying) .site-demo__chips:not(.site-sizer__ghost) .nl-chip';
    expect(motionBody).toContain(`${chip},\n  ${chip} > .nl-icon {\n    transition: opacity var(--motion-jump) var(--motion-ease-linear);\n  }`);
    const starting = blocksOf(motionBody, /@starting-style\s*\{/);
    const chips = starting.filter((b) => b.body.includes(chip));
    expect(chips).toHaveLength(1);
    expect(chips[0]!.body).toContain(`${chip} > .nl-icon { opacity: 0; }`);
    // Every @starting-style sits inside the motion block, so nothing enters with motion off.
    expect(blocksOf(css, /@starting-style\s*\{/).length).toBe(starting.length);
    expect(motionBody).toContain('[data-site-motion="on"] .site-faq[open] > :not(summary) { animation: site-rise var(--motion-state) var(--motion-ease-out) backwards; }');
  });

  it('MS-7.3 press ring v2: on a drawn button or computer key the ember ring covers the edge, with a plum line inside; keys keep the plain ring', () => {
    expect(top).toContain(
      '.site-press-ring { box-shadow: inset 0 0 0 var(--ring-width) var(--ember), inset 0 0 0 calc(var(--ring-width) + var(--line-width)) var(--plum); }',
    );
    expect(top).toContain(':is(.site-drawn-btn, .site-kbd) > .site-press-ring { inset: calc(var(--line-width) * -1); }');
    expect(top).toMatch(/\.site-press-ring, \.site-key-ring \{[^}]*box-shadow: inset 0 0 0 var\(--ring-width\) var\(--ember\);/);
  });

  it('MS-7.3 a key drawn outside a keypad sits on .site-key-panel: the panel fill and its lift, never a bare stage', () => {
    expect(top).toMatch(
      /\.site-key-panel \{\s*display: inline-flex; align-items: flex-end; gap: var\(--space-2\); padding: var\(--space-2\);\s*border-radius: calc\(var\(--radius-key\) \+ var\(--space-2\)\); background: var\(--panel\); box-shadow: var\(--lift\);\s*\}/,
    );
  });

  it('the fact tile and fact row: a 48px tile whose fill follows the surface under it, tokens only', () => {
    expect(top).toMatch(
      /\.site-tile \{\s*display: grid; place-items: center; flex: none; inline-size: var\(--space-12\); block-size: var\(--space-12\);\s*border-radius: var\(--radius-chip\); background: var\(--surface-sunken\); color: var\(--ink\);\s*\}/,
    );
    // A note card has no fill, so on a surface band its tiles stay sunken (r4-boxes, round 4).
    expect(top).toContain('.site-band--surface .site-card:not(.site-card--note) .site-tile { background: var(--surface); }');
    expect(top).toContain('.site-stage .site-tile { background: var(--site-piece); }');
    expect(top).toContain('.site-fact { display: flex; align-items: center; gap: var(--space-4); }');
  });

  it('the header lists the round-4 shared primitives', () => {
    for (const name of ['the hover layer (A9)', '.site-go (+ --out)', '.site-tile', '.site-fact', '.site-key-panel', '.site-press-ring (v2)', 'components/site/icons.tsx']) {
      expect(raw.slice(0, raw.indexOf('*/'))).toContain(name);
    }
  });
});

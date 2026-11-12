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
    expect(landscape.body).toMatch(/\.site-hero__name \{ font-size: clamp\(48px, 16svh, var\(--type-display-xl-size\)\); \}/);
    for (const b of atBlocks(css, /min-width: (600|1024)px/)) expect(b.start).toBeLessThan(landscape.start);
    expect(atBlocks(css, /^@media \(max-width: 719px\)$/)[0]!.body).toMatch(/\.site-bar nav \{ display: none; \}/);
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
      for (const part of r.selector.split(',')) expect(part.trim(), r.selector).toMatch(/^\[data-site-motion/);
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
    expect(names(css)).toEqual(['site-fade-in', 'site-reveal', 'site-in', 'site-out', 'site-rise']);
    expect(names(globalsCss)).toEqual([]);
    expect(all).toHaveLength(5);
    for (const k of all) {
      for (const m of k.body.matchAll(/([a-z-]+)\s*:/g)) expect(['opacity', 'transform']).toContain(m[1]);
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
    expect(top).toMatch(/\.site-stage \{[^}]*overflow: clip;[^}]*min-block-size: calc\(var\(--space-24\) \* 2 \+ var\(--space-6\)\);/);
    expect(top).toContain('.site-stage--privacy { min-block-size: calc(var(--space-24) * 3); }');
    expect(top).toContain('.site-stage--switch { min-block-size: calc(var(--space-24) * 4); }');
    expect(top).not.toMatch(/\.site-(?:how__)?stage[^{,]*\{[^}]*(?<!min-)block-size/);
  });

  it('MS-10.9 Access is 2 columns of normal cards from 648px, with no tall card and no order', () => {
    const at = (width: number) => atBlocks(css, new RegExp(`^@media \\(min-width: ${width}px\\)$`)).map((b) => b.body).join('\n');
    expect(at(648)).toContain('.site-grid--access { grid-template-columns: repeat(2, minmax(0, 1fr)); }');
    // Your view shares the switch card's row, so its stage takes the switch stage's height; the last card spans the row.
    expect(at(648)).toContain('.site-grid--access > :nth-child(4) > .site-stage { min-block-size: calc(var(--space-24) * 4); }');
    expect(at(648)).toContain('.site-grid--access > :nth-child(5) { grid-column: 1 / -1; }');
    expect(at(648)).toContain('.site-grid--start { align-items: start; }');
    expect(at(1024)).not.toContain('.site-grid--access');
    expect(css).not.toContain('site-card--tall');
    for (const r of rules(css)) if (r.selector.includes('site-grid--access')) expect(declsOf(r, 'grid-row'), r.selector).toEqual([]);
    expect(outsideAtRules(css)).toContain('.site-grid--boxes, .site-grid--access { grid-template-columns: minmax(0, 1fr); }');
    expect(css).not.toMatch(/(^|[{;\s])order\s*:/);
    expect(css).not.toContain('auto-fit, minmax(288px');
  });

  it('MS-10.9 site-grid--boxes has 2 columns from 648px', () => {
    const at648 = atBlocks(css, /^@media \(min-width: 648px\)$/);
    const layout = at648.filter((b) => b.body.includes('.site-grid--boxes { grid-template-columns'));
    expect(layout).toHaveLength(1);
    expect(layout[0]!.body).toContain('.site-grid--boxes { grid-template-columns: repeat(2, minmax(0, 1fr)); }');
    // It is the only rule that gives the boxes more than one column.
    for (const r of rules(css)) {
      if (/\.site-grid--boxes(?![\w-])/.test(r.selector) && r.selector !== '.site-grid--boxes, .site-grid--access') {
        for (const v of declsOf(r, 'grid-template-columns')) expect(v).toBe('repeat(2, minmax(0, 1fr))');
      }
    }
  });

  it('MS-8.11 the play lead uses --play-i, never --reveal-i', () => {
    const lead = motionRules.filter((r) => declsOf(r, '--play-lead').length > 0);
    expect(lead.map((r) => r.selector)).toEqual(['[data-site-motion="on"] :is([data-play], .site-how__picture)']);
    // motion-frame per column (review N7), so a neighbour's single ring has ended; --play-after for longer ones.
    expect(declsOf(lead[0]!, '--play-lead')).toEqual(['calc(var(--motion-play-lead) + var(--play-i, 0) * var(--motion-frame) + var(--play-after, calc(var(--motion-jump) * 0)))']);
    for (const r of rules(css)) {
      if (/\[data-play|\[data-how|site-how__picture|\.site-(in|rise|out|during|ring|mark)\b/.test(r.selector)) {
        for (const d of r.decls) expect(d.value, r.selector).not.toContain('--reveal-i');
      }
    }
    // The column rules (V28).
    const at = (width: number) => atBlocks(motionBody, new RegExp(`^@media \\(min-width: ${width}px\\)$`)).map((b) => b.body).join('\n');
    expect(at(648)).toContain('[data-site-motion="on"] .site-grid--boxes > :nth-child(2n) { --play-i: 1; }');
    expect(at(648)).toContain('[data-site-motion="on"] .site-grid--access > :nth-child(4) { --play-i: 1; }');
    // Touch waits for the Keyboard drawing's four quick rings.
    expect(at(648)).toContain('[data-site-motion="on"] .site-grid--access > :nth-child(2) { --play-after: calc(4 * var(--motion-frame-quick)); }');
    expect(at(1024)).not.toContain('--play-i');
  });

  it('MS-8.12 How parts take --play-step from their data-s and the not-reached rules need data-how-live', () => {
    const at1024 = atBlocks(motionBody, /^@media \(min-width: 1024px\)$/).map((b) => b.body).join('\n');
    for (const [s, token] of [['1', 'motion-demo-step'], ['2', 'motion-sweep'], ['3', 'motion-frame']]) {
      expect(at1024).toContain(`[data-site-motion="on"] .site-how__picture [data-s="${s}"] { --play-step: var(--${token}); }`);
    }
    const how = rules(at1024).filter((r) => r.selector.includes('.site-how__picture') && ROLE.test(r.selector));
    // Not reached yet: the before-play state, only once the story is live, only for later steps.
    const notReached = how.filter((r) => motionDecls(r).length === 0);
    expect(notReached).toHaveLength(3);
    for (const r of notReached) {
      for (const part of r.selector.split(',').map((p) => p.trim())) {
        const m = part.match(/^\[data-site-motion="on"\] \.site-how\[data-how-live\]\[data-how-step="([012])"\] \.site-how__picture \.site-(in|mark|rise|out)\[data-s(?:="([123])")?\]$/);
        expect(m, part).not.toBeNull();
        if (m![3] !== undefined) expect(Number(m![3]), part).toBeGreaterThan(Number(m![1]));
        else expect(m![1], part).toBe('0');
      }
    }
    // The step that plays: one rule per role, each part scoped to data-how-play="N" and that step's parts.
    const playing = how.filter((r) => motionDecls(r).length > 0);
    expect(playing).toHaveLength(6);
    for (const r of playing) {
      const parts = r.selector.split(',').map((p) => p.trim());
      expect(parts).toHaveLength(3);
      parts.forEach((p, i) => {
        expect(p).toMatch(new RegExp(`^\\[data-site-motion="on"\\] \\.site-how\\[data-how-play="${i + 1}"\\] \\.site-how__picture \\.site-[a-z]+\\[data-s="${i + 1}"\\]$`));
      });
    }
    // data-s is styled only inside the motion block.
    for (const r of rules(outside)) expect(r.selector, r.selector).not.toContain('[data-s');
  });

  it("MS-8.12 the How steps' top padding uses --site-how-h from 1024px", () => {
    const at1024 = atBlocks(outside, /^@media \(min-width: 1024px\)$/).map((b) => b.body).join('\n');
    expect(at1024).toMatch(/\.site-how \{[^}]*--site-how-h: calc\(var\(--space-24\) \* 6 \+ var\(--space-8\) \+ var\(--space-2\)\);/);
    expect(at1024).toMatch(/\.site-how__picture \{[^}]*position: sticky; top: var\(--space-12\); block-size: var\(--site-how-h\);/);
    expect(at1024).toContain('.site-how__steps { gap: 24svh; padding-block: max(12svh, calc(var(--site-how-h) - 50svh)) 36svh; }');
    expect(at1024).not.toContain('40svh');
    const short = atBlocks(css, /^@media \(min-width: 1024px\) and \(max-height: 679px\)$/);
    expect(short).toHaveLength(1);
    expect(short[0]!.body).toContain('.site-how__picture { top: var(--space-4); }');
    // The round-1 scroll timeline is gone.
    expect(css).not.toMatch(/timeline-scope|--site-how\b(?!-h)|site-frames--how/);
    // Under 1024px the picture is hidden and the stages have their heights (416, 288, 160px, minimums: N8).
    const top = outsideAtRules(css);
    expect(top).toContain('.site-how__picture { display: none; }');
    expect(top).toContain('.site-how__step:nth-child(1) .site-how__stage { min-block-size: calc(var(--space-24) * 4 + var(--space-8)); }');
    expect(top).toContain('.site-how__step:nth-child(2) .site-how__stage { min-block-size: calc(var(--space-24) * 3); }');
    expect(top).toContain('.site-how__step:nth-child(3) .site-how__stage { min-block-size: calc(var(--space-24) + var(--space-16)); }');
  });

  it('MS-7.9 MS-9.3 the differing digit brightens only with its mark: no colour of its own, an ink copy in the box', () => {
    // An unstepped colour on .site-digit--diff would single the digit out before the sweep reaches it (review B3).
    expect(css).not.toMatch(/\.site-digit--diff[^{]*\{[^}]*color/);
    expect(css).toMatch(/\.site-digit__box \{[^}]*color: var\(--ink\);/);
    expect(css).toContain('.site-digit__box::before { content: attr(data-d); }');
  });

  it('MS-9.3 in forced colours every drawn ring and box keeps an outline and the toggle knob stays visible', () => {
    const forced = atBlocks(css, /^@media \(forced-colors: active\)$/);
    expect(forced).toHaveLength(1);
    const body = forced[0]!.body;
    for (const sel of ['.site-press-ring', '.site-key-ring', '.site-key::after', '.site-scan__press', '.site-outline', '.site-proof__box', '.site-digit__box', '.site-step', '.site-scan__ring']) {
      expect(body).toMatch(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\:]/g, '\\$&')}[^{]*\\{[^}]*outline:`));
    }
    expect(body).toContain('.site-toggle, .site-toggle__knob { forced-color-adjust: none; }');
    expect(body).toContain('.site-toggle--on .site-toggle__knob { background: Canvas; }');
  });

  it('MS-10.5 caption (14px) is used only by the footer caption, never inside a drawing (review R3-P2)', () => {
    const rules = [...css.matchAll(/([^{}]+)\{[^}]*var\(--type-caption-size\)[^}]*\}/g)].map((m) => m[1]!.trim());
    expect(rules).toEqual(['.site-footer__caption']);
  });

  it('MS-6.7 Hear it while the demo plays is drawn as a disabled quiet button through aria-disabled (review R3-N6)', () => {
    expect(css).toMatch(/\.site-demo__bar \.nl-btn--quiet\[aria-disabled="true"\] \{[^}]*color: var\(--ink-muted\);[^}]*background: var\(--surface-sunken\);/);
  });
});

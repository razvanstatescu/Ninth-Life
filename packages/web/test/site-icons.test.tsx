// Website icons (round 4, 2026-11-13; MS-7.1; design.md "Round 4: shared language", Icons).
// components/site/icons.tsx: SiteIcon and one named export of path data per icon, drawn on the app's grid (24px box,
// 2.5px round stroke), kept out of the app's bundle.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as icons from '@/components/site/icons';
import { SiteIcon } from '@/components/site/icons';

const { SiteIcon: _renderer, ...exported } = icons;
const PATHS = exported as Record<string, unknown>;
const NAMES = Object.keys(PATHS);

type Point = [number, number];

/** Arity of each path command we draw with (Q and T are not used). */
const ARITY: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, a: 7, z: 0 };

/**
 * Every point a path reaches: end points, Bézier control points (the curve stays inside their hull) and, for an
 * arc, 64 samples along the arc from its true centre (SVG 1.1 F.6.5). Circles only: rx = ry, no rotation.
 */
function pointsOf(d: string): Point[] {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];
  const out: Point[] = [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let lastC2: Point | null = null;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i]!)) cmd = tokens[i++]!;
    else if (!cmd) throw new Error(`path starts without a command: ${d}`);
    const lower = cmd.toLowerCase();
    const arity = ARITY[lower];
    if (arity === undefined) throw new Error(`unexpected command ${cmd} in ${d}`);
    const rel = cmd !== cmd.toUpperCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    if (lower === 'z') {
      x = sx;
      y = sy;
      lastC2 = null;
      continue;
    }
    if (lower === 'm' || lower === 'l') {
      x = ox + num();
      y = oy + num();
      if (lower === 'm') {
        sx = x;
        sy = y;
        cmd = rel ? 'l' : 'L'; // further pairs are line-tos
      }
      out.push([x, y]);
      lastC2 = null;
    } else if (lower === 'h') {
      x = ox + num();
      out.push([x, y]);
      lastC2 = null;
    } else if (lower === 'v') {
      y = oy + num();
      out.push([x, y]);
      lastC2 = null;
    } else if (lower === 'c' || lower === 's') {
      let c1: Point;
      if (lower === 'c') c1 = [ox + num(), oy + num()];
      else c1 = lastC2 ? [2 * x - lastC2[0], 2 * y - lastC2[1]] : [x, y];
      const c2: Point = [ox + num(), oy + num()];
      x = ox + num();
      y = oy + num();
      out.push(c1, c2, [x, y]);
      lastC2 = c2;
    } else {
      const rx = num();
      const ry = num();
      const rot = num();
      const large = num();
      const sweep = num();
      const x2 = ox + num();
      const y2 = oy + num();
      if (rx !== ry || rot !== 0) throw new Error(`only circular arcs are drawn here: ${d}`);
      out.push(...arcPoints(x, y, x2, y2, rx, large === 1, sweep === 1));
      x = x2;
      y = y2;
      lastC2 = null;
    }
  }
  return out;
}

function arcPoints(x1: number, y1: number, x2: number, y2: number, r0: number, large: boolean, sweep: boolean): Point[] {
  const px = (x1 - x2) / 2;
  const py = (y1 - y2) / 2;
  let r = r0;
  const lambda = (px * px + py * py) / (r * r);
  if (lambda > 1) r *= Math.sqrt(lambda);
  const sign = large !== sweep ? 1 : -1;
  const k = sign * Math.sqrt(Math.max(0, (r * r * r * r - r * r * py * py - r * r * px * px) / (r * r * py * py + r * r * px * px)));
  const cxp = k * py;
  const cyp = -k * px;
  const cx = cxp + (x1 + x2) / 2;
  const cy = cyp + (y1 + y2) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) => Math.sign(ux * vy - uy * vx || 1) * Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy)))));
  const t1 = angle(1, 0, (px - cxp) / r, (py - cyp) / r);
  let dt = angle((px - cxp) / r, (py - cyp) / r, (-px - cxp) / r, (-py - cyp) / r);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  return Array.from({ length: 65 }, (_, s): Point => [cx + r * Math.cos(t1 + (dt * s) / 64), cy + r * Math.sin(t1 + (dt * s) / 64)]);
}

/** Half the 2.5px stroke: a point closer to the edge than this would be cut off by the svg's own box. */
const MARGIN = 1.25;

/** The app's icons, read from components/Icon.tsx's PATHS object (it exports no list). */
const iconSource = readFileSync(resolve(__dirname, '../components/Icon.tsx'), 'utf8');
const appBlock = iconSource.slice(iconSource.indexOf('const PATHS = {'), iconSource.indexOf('} as const;'));
const APP_NAMES = [...appBlock.matchAll(/^\s{2}(\w+): \[/gm)].map((m) => m[1]!);
const APP_DRAWINGS = [...appBlock.matchAll(/^\s{2}\w+: (\[.*\]),$/gm)].map((m) => m[1]!.replace(/\s+/g, ''));

describe('website icons (components/site/icons.tsx)', () => {
  it('MS-7.1 the module exports SiteIcon and path arrays only, so a client chunk bundles just the icons it imports', () => {
    expect(typeof icons.SiteIcon).toBe('function');
    expect(NAMES.length).toBeGreaterThanOrEqual(23);
    for (const name of NAMES) {
      const d = PATHS[name];
      expect(Array.isArray(d), name).toBe(true);
      expect((d as unknown[]).length, name).toBeGreaterThan(0);
      for (const p of d as unknown[]) expect(typeof p, name).toBe('string');
    }
  });

  it('MS-7.1 every icon the round-4 proposals name is there', () => {
    for (const name of ['play', 'replay', 'backspace', 'arrow', 'external', 'info', 'minus', 'globe', 'lock', 'cloud', 'toggle', 'keyboard', 'key', 'keypad', 'view', 'screens', 'sun', 'moon', 'code', 'chart', 'report', 'clock', 'download']) {
      expect(NAMES, name).toContain(name);
    }
  });

  it('the path reader finds the true extremes (a self-check, so the grid test below cannot pass by accident)', () => {
    const circle = pointsOf('M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17z');
    const xs = circle.map((p) => p[0]);
    const ys = circle.map((p) => p[1]);
    expect(Math.min(...xs)).toBeCloseTo(3.5, 1);
    expect(Math.max(...xs)).toBeCloseTo(20.5, 1);
    expect(Math.min(...ys)).toBeCloseTo(3.5, 1);
    expect(Math.max(...ys)).toBeCloseTo(20.5, 1);
    // A minor arc stays on its own side: the moon's inner arc never reaches the top of its circle.
    expect(Math.min(...pointsOf('M9.5 4.5a7.5 7.5 0 0 0 10 10').map((p) => p[1]))).toBeGreaterThan(MARGIN);
    expect(pointsOf('M1 12h23')).toContainEqual([24, 12]);
    expect(pointsOf('M2 2l3 4h1v1')).toEqual([[2, 2], [5, 6], [6, 6], [6, 7]]);
  });

  it('MS-7.1 every icon is drawn on the 24px grid, with its 2.5px stroke inside the box', () => {
    for (const name of NAMES) {
      for (const d of PATHS[name] as string[]) {
        expect(d, name).toMatch(/^M/);
        for (const [x, y] of pointsOf(d)) {
          expect(x, `${name}: ${d}`).toBeGreaterThanOrEqual(MARGIN - 1e-6);
          expect(x, `${name}: ${d}`).toBeLessThanOrEqual(24 - MARGIN + 1e-6);
          expect(y, `${name}: ${d}`).toBeGreaterThanOrEqual(MARGIN - 1e-6);
          expect(y, `${name}: ${d}`).toBeLessThanOrEqual(24 - MARGIN + 1e-6);
        }
      }
    }
  });

  it("MS-7.1 no website icon repeats an app icon's name or drawing (the app's stay in components/Icon.tsx)", () => {
    expect(APP_NAMES).toEqual(expect.arrayContaining(['speaker', 'check', 'plus', 'x', 'back', 'switch', 'offline']));
    for (const name of NAMES) expect(APP_NAMES, name).not.toContain(name);
    expect(APP_DRAWINGS.length).toBeGreaterThan(10);
    for (const name of NAMES) {
      const drawing = JSON.stringify(PATHS[name]).replace(/"/g, "'");
      expect(APP_DRAWINGS, name).not.toContain(drawing);
    }
  });

  it('SiteIcon is decorative by default: aria-hidden, not focusable, the nl-icon class on a 24px viewBox', () => {
    const html = renderToStaticMarkup(<SiteIcon d={icons.replay} />);
    expect(html).toMatch(/^<svg class="nl-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">/);
    expect(html).not.toContain('role=');
    expect(html.match(/<path /g)).toHaveLength(icons.replay.length);
  });

  it('SiteIcon with a label is a named image; className is added after nl-icon', () => {
    const html = renderToStaticMarkup(<SiteIcon d={icons.info} label="Note" className="x-test" />);
    expect(html).toContain('class="nl-icon x-test"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Note"');
    expect(html).not.toContain('aria-hidden');
  });

  it('SiteIcon turn rotates the drawing inside the svg and marks the class, so a .site-go hint points the same way', () => {
    expect(renderToStaticMarkup(<SiteIcon d={icons.arrow} turn="up" />)).toContain('class="nl-icon site-icon--up"');
    expect(renderToStaticMarkup(<SiteIcon d={icons.arrow} turn="up" />)).toContain('<g transform="rotate(-90 12 12)">');
    expect(renderToStaticMarkup(<SiteIcon d={icons.arrow} turn="down" />)).toContain('<g transform="rotate(90 12 12)">');
    expect(renderToStaticMarkup(<SiteIcon d={icons.arrow} turn="left" />)).toContain('<g transform="rotate(180 12 12)">');
    expect(renderToStaticMarkup(<SiteIcon d={icons.arrow} />)).not.toContain('<g');
  });

  it("the app never imports the website icons, so its bundle does not carry them (decisions §1.5)", () => {
    const root = resolve(__dirname, '..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(entry)) files.push(p);
      }
    };
    for (const dir of ['app/app', 'lib']) walk(join(root, dir));
    for (const entry of readdirSync(join(root, 'components'))) {
      if (/\.(ts|tsx)$/.test(entry)) files.push(join(root, 'components', entry));
    }
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/site\/icons/);
  });
});

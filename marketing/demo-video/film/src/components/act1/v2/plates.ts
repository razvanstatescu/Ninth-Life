/**
 * The second cut's Act 1 stills (public/img/v2) and what was measured on them (src/data/plates-v2.json,
 * written by scripts/images/measure-v2.py). Coordinates are the still's own pixels, origin top-left; quads
 * are [topLeft, topRight, bottomRight, bottomLeft].
 *
 * - p1: the master, straight on, clean (1440 x 2560); no lit edit.
 * - p5: the drawer, phone off (2560 x 1440), and its lit edit.
 * - p2: the angled macro of the screen (2560 x 1440), and its lit edit. Keys are estimates (out of frame).
 * - p3: the keypad straight on, dusty (3840 x 2160), and its lit edit.
 */
import data from '../../../data/plates-v2.json';

export type Pt = [number, number];
export type Quad = [Pt, Pt, Pt, Pt];
export type PlateKey = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'star' | '0' | 'hash';
export const PLATE_KEYS: PlateKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'star', '0', 'hash'];
export type PlateId = 'p1' | 'p5' | 'p2' | 'p3';

type Raw = {
  file: string;
  width: number;
  height: number;
  window?: number[][];
  active?: number[][];
  lightPass?: string | null;
  lightPassShiftPx?: number[];
  keys: Record<string, { center: number[]; quad: number[][]; source: string }>;
  nav?: { center: number[]; radiusPx: number };
};

const RAW = data as unknown as Record<string, Raw>;
const NAMES: Record<PlateId, string> = { p1: 'v2-p1-master', p5: 'v2-p5-drawer', p2: 'v2-p2-macro', p3: 'v2-p3-keypad' };

export type PlateInfo = {
  id: PlateId;
  src: string;
  width: number;
  height: number;
  window: Quad | null;
  active: Quad | null;
  lit: string | null;
  /** How far the lit edit sits from the still (px); draw it moved back by this. */
  litShift: Pt;
  keys: Record<PlateKey, { center: Pt; quad: Quad; measured: boolean }>;
};

const quad = (q?: number[][]): Quad | null => (q ? (q.map((p) => [p[0]!, p[1]!]) as Quad) : null);

export const plate = (id: PlateId): PlateInfo => {
  const r = RAW[NAMES[id]];
  if (!r) throw new Error(`plates-v2.json has no ${NAMES[id]}`);
  const keys = Object.fromEntries(
    PLATE_KEYS.map((k) => {
      const v = r.keys[k]!;
      return [k, { center: [v.center[0]!, v.center[1]!] as Pt, quad: quad(v.quad)!, measured: v.source === 'measured' }];
    }),
  ) as PlateInfo['keys'];
  return {
    id,
    src: r.file,
    width: r.width,
    height: r.height,
    window: quad(r.window),
    active: quad(r.active),
    lit: r.lightPass ?? null,
    litShift: [r.lightPassShiftPx?.[0] ?? 0, r.lightPassShiftPx?.[1] ?? 0],
    keys,
  };
};

/** Centre of a quad. */
export const quadCenter = (q: Quad): Pt => [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4];

/**
 * CSS matrix3d that maps an element of size w x h (placed at 0,0 with transform-origin 0 0) onto a quad,
 * in the parent's pixels: the homography from the element's corners to the quad's corners.
 */
export const quadTransform = (w: number, h: number, q: Quad) => {
  const src: Pt[] = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const H = homography(src, q);
  const [a, b, c, d, e, f, g, hh] = H;
  // 4x4, column-major, with z untouched: x' = (a x + b y + c) / (g x + hh y + 1), y' = (d x + e y + f) / (...)
  return `matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
};

/** Homography (8 numbers, h33 = 1) mapping four source points onto four target points. */
export const homography = (src: Pt[], dst: Pt[]) => {
  const A: number[][] = [];
  const B: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i]!;
    const [u, v] = dst[i]!;
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    B.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    B.push(v);
  }
  return solve(A, B);
};

/** Gaussian elimination with partial pivoting (8 x 8). */
const solve = (A: number[][], B: number[]) => {
  const n = B.length;
  const M = A.map((row, i) => [...row, B[i]!]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r;
    [M[c], M[p]] = [M[p]!, M[c]!];
    const pivot = M[c]!;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const row = M[r]!;
      const k = row[c]! / pivot[c]!;
      for (let j = c; j <= n; j++) row[j] = row[j]! - k * pivot[j]!;
    }
  }
  return M.map((row, i) => row[n]! / row[i]!);
};

/** Map a point through the homography from the unit square of a w x h element to a quad. */
export const mapPoint = (w: number, h: number, q: Quad, x: number, y: number): Pt => {
  const H = homography(
    [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ],
    q,
  );
  const den = H[6]! * x + H[7]! * y + 1;
  return [(H[0]! * x + H[1]! * y + H[2]!) / den, (H[3]! * x + H[4]! * y + H[5]!) / den];
};

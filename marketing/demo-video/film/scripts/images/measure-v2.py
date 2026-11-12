"""Measure the v2 Act 1 plates: screen window corners, LCD active area, and each key's centre and quad.

    python3 -I scripts/images/measure-v2.py align <unlit.png> <lit.png>     how far a lit edit drifted
    python3 -I scripts/images/measure-v2.py all                               write src/data/plates-v2.json

Run from film/ with the system python (Pillow and numpy). Method (research-v2/10-act1-old-world.md, section 4.4):
- the display window is the brightest part of (lit edit minus unlit plate); each side is a robust (RANSAC) line
  on its outline, and the corners are where the lines meet: the window's sharp corners (the print's rounding
  is ignored). The top edge is then moved, in the lit picture, to the black print: on the straight-down drawer
  plate as a line parallel to the bottom edge; on the angled macro column by column, because a reflection sits
  at the top of the glass and the light alone stops short of the print;
- the twelve keys are the light rings round them in (lit minus unlit), or, on the straight-on keypad, the dark
  holes in the light body, each grown to the middle of its own light ring;
- a homography from the phone's design in millimetres (research-v2/10-act1-phone-front.svg) to the plate's pixels
  is fitted to the measured points; every quad is the design's rectangle mapped through it, so the quads stay
  consistent even where a key is blurred or out of frame.
Overlays for checking go to out/act1-v2/overlays/.
"""
import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
FILM = HERE.parent.parent
IMG = FILM / 'public' / 'img' / 'v2'
OUT = FILM / 'src' / 'data' / 'plates-v2.json'
OVER = FILM / 'out' / 'act1-v2' / 'overlays'

# The design, in mm (front face, origin top-left); keep in step with 10-act1-phone-front.svg.
WINDOW = [(6, 11), (40, 11), (40, 37), (6, 37)]
ACTIVE = [(8.6, 13.6), (37.4, 13.6), (37.4, 32.8), (8.6, 32.8)]
KEY_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'star', '0', 'hash']
COLS = [9, 23, 37]
ROWS = [60.5, 69, 77.5, 86]
KEY_W, KEY_H = 12.5, 6.5
NAV = (23, 46, 7.0)


def key_center(i):
    return (COLS[i % 3], ROWS[i // 3])


def key_rect(i):
    cx, cy = key_center(i)
    return [(cx - KEY_W / 2, cy - KEY_H / 2), (cx + KEY_W / 2, cy - KEY_H / 2), (cx + KEY_W / 2, cy + KEY_H / 2), (cx - KEY_W / 2, cy + KEY_H / 2)]


def lum(path):
    return np.asarray(Image.open(path).convert('L'), dtype=np.float32)


def box_blur(a, r):
    if r <= 0:
        return a
    k = 2 * r + 1
    p = np.pad(a, r, mode='edge')
    c = p.cumsum(0).cumsum(1)
    c = np.pad(c, ((1, 0), (1, 0)))
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def shift(a, b):
    """Translation of b relative to a, by phase correlation (whole pixels), on a central window."""
    h, w = a.shape
    y0, y1, x0, x1 = h // 8, h - h // 8, w // 8, w - w // 8
    A = a[y0:y1, x0:x1] - a[y0:y1, x0:x1].mean()
    B = b[y0:y1, x0:x1] - b[y0:y1, x0:x1].mean()
    win = np.outer(np.hanning(A.shape[0]), np.hanning(A.shape[1]))
    F = np.fft.fft2(A * win) * np.conj(np.fft.fft2(B * win))
    r = np.fft.ifft2(F / (np.abs(F) + 1e-9)).real
    dy, dx = np.unravel_index(np.argmax(r), r.shape)
    if dy > r.shape[0] // 2:
        dy -= r.shape[0]
    if dx > r.shape[1] // 2:
        dx -= r.shape[1]
    return int(-dx), int(-dy), float(r.max())


def label(mask):
    """4-connected components of a boolean array: list of (ys, xs) index arrays, largest first."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    comps = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]:
            continue
        q = deque([(y0, x0)])
        seen[y0, x0] = True
        ys, xs = [], []
        while q:
            y, x = q.popleft()
            ys.append(y)
            xs.append(x)
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True
                    q.append((yy, xx))
        comps.append((np.array(ys), np.array(xs)))
    comps.sort(key=lambda c: -len(c[0]))
    return comps


def homography(src, dst):
    """3x3 H with dst ~ H src (DLT with normalisation, least squares for more than 4 points)."""
    src = np.asarray(src, float)
    dst = np.asarray(dst, float)

    def norm(p):
        m = p.mean(0)
        s = np.sqrt(2) / np.mean(np.linalg.norm(p - m, axis=1))
        T = np.array([[s, 0, -s * m[0]], [0, s, -s * m[1]], [0, 0, 1]])
        return T, (np.c_[p, np.ones(len(p))] @ T.T)[:, :2]

    Ts, s = norm(src)
    Td, d = norm(dst)
    A = []
    for (x, y), (u, v) in zip(s, d):
        A.append([-x, -y, -1, 0, 0, 0, u * x, u * y, u])
        A.append([0, 0, 0, -x, -y, -1, v * x, v * y, v])
    _, _, Vt = np.linalg.svd(np.array(A))
    H = Vt[-1].reshape(3, 3)
    H = np.linalg.inv(Td) @ H @ Ts
    return H / H[2, 2]


def apply(H, pts):
    p = np.c_[np.asarray(pts, float), np.ones(len(pts))] @ H.T
    return p[:, :2] / p[:, 2:3]


def diff_img(unlit, lit, dx, dy):
    """The light: lit edit (moved back by its drift) minus the unlit plate, never negative."""
    lit = np.roll(np.roll(lit, -dy, 0), -dx, 1)
    return np.clip(lit - unlit, 0, None)


def components(mask, step=2):
    """Connected components of mask, labelled on a grid of `step` px; full-size bbox, centre and pixel count."""
    comps = []
    for ys, xs in label(mask[::step, ::step]):
        ys, xs = ys * step, xs * step
        comps.append({'ys': ys, 'xs': xs, 'n': len(ys) * step * step,
                      'bbox': (int(xs.min()), int(ys.min()), int(xs.max()) + step, int(ys.max()) + step),
                      'cx': float(xs.mean()), 'cy': float(ys.mean())})
    return comps


def boundary(mask):
    inner = mask[1:-1, 1:-1] & mask[:-2, 1:-1] & mask[2:, 1:-1] & mask[1:-1, :-2] & mask[1:-1, 2:]
    edge = mask.copy()
    edge[1:-1, 1:-1] &= ~inner
    ys, xs = np.nonzero(edge)
    return np.c_[xs, ys].astype(float)


def ransac_line(pts, tol=2.0, iters=400, seed=9):
    rng = np.random.default_rng(seed)
    best, best_in = None, None
    for _ in range(iters):
        a, b = pts[rng.choice(len(pts), 2, replace=False)]
        v = b - a
        L = np.hypot(*v)
        if L < 10:
            continue
        nrm = np.array([-v[1], v[0]]) / L
        inl = np.abs((pts - a) @ nrm) < tol
        if best_in is None or inl.sum() > best_in.sum():
            best_in = inl
    sel = pts[best_in]
    c = sel.mean(0)
    _, _, vt = np.linalg.svd(sel - c)
    return c, vt[0], int(best_in.sum())


def fit_quad(mask):
    """Sharp corners (TL, TR, BR, BL) of a roughly rectangular blob: a robust line per side (RANSAC on the
    blob's outline, so bumps and notches such as a reflection do not tilt it), intersected."""
    pts = boundary(mask)
    s, df = pts[:, 0] + pts[:, 1], pts[:, 0] - pts[:, 1]
    corners = [pts[np.argmin(s)], pts[np.argmax(df)], pts[np.argmax(s)], pts[np.argmin(df)]]
    lines = []
    for i in range(4):
        a, b = corners[i], corners[(i + 1) % 4]
        ab = b - a
        L = np.hypot(*ab)
        tpar = ((pts - a) @ ab) / (L * L)
        dist = np.abs((pts - a) @ np.array([-ab[1], ab[0]]) / L)
        sel = pts[(tpar > 0.08) & (tpar < 0.92) & (dist < 0.2 * L)]
        c, dvec, _ = ransac_line(sel)
        lines.append((c, dvec))
    out = []
    for i in range(4):
        (c1, d1), (c2, d2) = lines[i - 1], lines[i]
        tt = np.linalg.solve(np.array([d1, -d2]).T, c2 - c1)
        out.append(c1 + tt[0] * d1)
    return np.array(out)


def refine_top(lit, quad, reach=0.3):
    """Move the window's top edge up to where the lit picture falls from the glass (glow or reflection) to the
    black print: the steepest drop going up, per column, then a robust line. For plates where a reflection sits
    at the top of the glass and the light alone stops short of the print."""
    tl, tr, br, bl = quad
    hgt = (np.hypot(*(bl - tl)) + np.hypot(*(br - tr))) / 2
    a = box_blur(lit, 2)
    pts = []
    for f in np.linspace(0.12, 0.88, 40):
        x = tl[0] + f * (tr[0] - tl[0])
        y = tl[1] + f * (tr[1] - tl[1])
        xi = int(round(x))
        y_hi = int(max(3, y - reach * hgt))
        y_lo = int(y + 0.05 * hgt)
        col = a[y_hi:y_lo, xi]
        grad = col[3:] - col[:-3]  # positive where it gets brighter going down: the print-to-glass edge
        k = int(np.argmax(grad))
        pts.append((x, y_hi + k + 1.5))
    c, dvec, _ = ransac_line(np.array(pts), tol=3.0)
    # new corners: the new top line against the old left and right sides
    def meet(p0, p1):
        d2 = p1 - p0
        tt = np.linalg.solve(np.array([dvec, -d2]).T, p0 - c)
        return c + tt[0] * dvec
    return np.array([meet(tl, bl), meet(tr, br), br, bl])


def refine_top_parallel(lit, quad, reach=0.15):
    """For a straight-down plate: the top edge parallel to the bottom edge, at the offset where the lit picture
    brightens most from the black print to the glass (mean over the middle 80% of the width)."""
    tl, tr, br, bl = quad
    hgt = (np.hypot(*(bl - tl)) + np.hypot(*(br - tr))) / 2
    dvec = (br - bl) / np.hypot(*(br - bl))
    nrm = np.array([dvec[1], -dvec[0]])  # points up, out of the window
    if nrm[1] > 0:
        nrm = -nrm
    a = box_blur(lit, 1)
    mid = (tl + tr) / 2
    best, best_o = -1e9, 0.0
    fs = np.linspace(-0.4, 0.4, 41)
    for o in np.arange(-0.05 * hgt, reach * hgt, 0.5):
        p0 = mid + o * nrm
        score = 0.0
        for f in fs:
            q = p0 + f * np.hypot(*(tr - tl)) * dvec
            below = q - 3 * nrm
            above = q + 3 * nrm
            score += a[int(below[1]), int(below[0])] - a[int(above[1]), int(above[0])]
        if score > best:
            best, best_o = score, o
    c = mid + best_o * nrm

    def meet(p0, p1):
        d2 = p1 - p0
        tt = np.linalg.solve(np.array([dvec, -d2]).T, p0 - c)
        return c + tt[0] * dvec
    return np.array([meet(tl, bl), meet(tr, br), br, bl])


def find_window(d):
    """The display window: the brightest large blob of the light; its sides fitted robustly."""
    b = box_blur(d, 3)
    comps = components(b > 0.5 * np.percentile(b, 99.7), 2)
    core = comps[0]
    med = float(np.median(b[core['ys'], core['xs']]))
    comps = components(b > 0.55 * med, 2)
    core = comps[0]
    m = np.zeros(b.shape, bool)
    m[core['ys'], core['xs']] = True
    m = dilate(m, 1)
    return fit_quad(m), core


def dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out


def find_keys(d, region=None, exclude=None):
    """The twelve keypad keys from the light that leaks round them: ring-shaped blobs of similar size in a
    4 x 3 grid. Returns {id: (centre, bbox)} with the bbox shrunk by half the ring's thickness."""
    b = box_blur(d, 2)
    m = np.zeros(b.shape, bool)
    x0, y0, x1, y1 = region if region else (0, 0, b.shape[1], b.shape[0])
    sub = b[y0:y1, x0:x1]
    m[y0:y1, x0:x1] = sub > 0.3 * np.percentile(sub, 99.5)
    if exclude is not None:
        m &= ~exclude
    g = 3  # px: bridge small breaks in an outline, then take it back off the box
    m = dilate(m, g)
    cands = []
    for c in components(m, 2):
        bx0, by0, bx1, by1 = c['bbox']
        bx0, by0, bx1, by1 = bx0 + g, by0 + g, bx1 - g, by1 - g
        c['bbox'] = (bx0, by0, bx1, by1)
        w, h = bx1 - bx0, by1 - by0
        if h < 8 or not (1.4 < w / h < 2.8):
            continue
        cands.append((w * h, c))
    cands.sort(key=lambda t: -t[0])
    cands = [c for _, c in cands[:20]]
    if len(cands) < 12:
        raise RuntimeError(f'only {len(cands)} key-like blobs')
    areas = np.array([(c['bbox'][2] - c['bbox'][0]) * (c['bbox'][3] - c['bbox'][1]) for c in cands[:12]])
    med = np.median(areas)
    keys = [c for c in cands if 0.6 * med < (c['bbox'][2] - c['bbox'][0]) * (c['bbox'][3] - c['bbox'][1]) < 1.5 * med][:12]
    if len(keys) != 12:
        raise RuntimeError(f'{len(keys)} keys of similar size')
    keys.sort(key=lambda c: (c['bbox'][1] + c['bbox'][3]) / 2)
    rows = [sorted(keys[i * 3:(i + 1) * 3], key=lambda c: (c['bbox'][0] + c['bbox'][2]) / 2) for i in range(4)]
    out = {}
    for r, row in enumerate(rows):
        for col, c in enumerate(row):
            bx0, by0, bx1, by1 = c['bbox']
            ring = c['n'] / max(1.0, 2.0 * ((bx1 - bx0) + (by1 - by0)))
            s = ring / 2
            box = (bx0 + s, by0 + s, bx1 - s, by1 - s)
            out[KEY_IDS[r * 3 + col]] = (((box[0] + box[2]) / 2, (box[1] + box[3]) / 2), box)
    return out


def find_keys_holes(unlit, d):
    """Straight-on keypad: the keys are dark holes in the light body of the unlit plate. Rows with three holes
    are keypad rows (the soft keys come in a pair); the four lowest such rows are the keypad. Each key's edges
    are then moved out to the middle of the light ring around it (the gap where the light leaks), so the quad is
    the key's outline, as on the other plates."""
    a = box_blur(unlit, 4)
    h, w = a.shape
    c = a[h // 4: 3 * h // 4, w // 3: 2 * w // 3]
    body = a > np.percentile(c, 55)
    holes = [cc for cc in components(~body, 4)
             if cc['bbox'][0] > 4 and cc['bbox'][1] > 4 and cc['bbox'][2] < w - 8 and cc['bbox'][3] < h - 8 and cc['n'] > 0.004 * h * w]
    holes.sort(key=lambda cc: (cc['bbox'][1] + cc['bbox'][3]) / 2)
    rows, cur = [], []
    for cc in holes:
        cy = (cc['bbox'][1] + cc['bbox'][3]) / 2
        if cur and cy - (cur[-1]['bbox'][1] + cur[-1]['bbox'][3]) / 2 > 0.5 * (cc['bbox'][3] - cc['bbox'][1]):
            rows.append(cur)
            cur = []
        cur.append(cc)
    if cur:
        rows.append(cur)
    rows = [sorted(r, key=lambda cc: cc['bbox'][0]) for r in rows if len(r) == 3][-4:]
    if len(rows) != 4:
        raise RuntimeError(f'{len(rows)} keypad rows')
    ring = box_blur(d, 2)
    out = {}
    for r, row in enumerate(rows):
        for col, cc in enumerate(row):
            x0, y0, x1, y1 = cc['bbox']
            kw, kh = x1 - x0, y1 - y0
            cx, cy = int((x0 + x1) / 2), int((y0 + y1) / 2)
            # the face inside the key's own light ring: flood from the centre until the ring stops it
            X0, Y0 = max(0, int(x0 - 0.4 * kw)), max(0, int(y0 - 0.4 * kh))
            X1, Y1 = min(w, int(x1 + 0.4 * kw)), min(h, int(y1 + 0.4 * kh))
            sub = ring[Y0:Y1, X0:X1]
            free = sub < 0.35 * np.percentile(sub, 99)
            seen = np.zeros_like(free)
            q = deque([(cy - Y0, cx - X0)])
            seen[cy - Y0, cx - X0] = True
            ys, xs = [], []
            while q:
                yy, xx = q.popleft()
                ys.append(yy)
                xs.append(xx)
                for ny, nx in ((yy - 1, xx), (yy + 1, xx), (yy, xx - 1), (yy, xx + 1)):
                    if 0 <= ny < free.shape[0] and 0 <= nx < free.shape[1] and free[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            area = len(ys)
            if 0.5 * cc['n'] < area < 1.8 * cc['n'] and min(xs) > 0 and min(ys) > 0 and max(xs) < free.shape[1] - 1 and max(ys) < free.shape[0] - 1:
                g = 4  # half the ring: from the face's edge to the middle of the gap
                box = (X0 + min(xs) - g, Y0 + min(ys) - g, X0 + max(xs) + g, Y0 + max(ys) + g)
            else:
                box = (x0, y0, x1, y1)  # the ring is open here: keep the dark face
            box = tuple(float(v) for v in box)
            out[KEY_IDS[r * 3 + col]] = (((box[0] + box[2]) / 2, (box[1] + box[3]) / 2), box)
    return out


def find_dark_window(unlit):
    """Master still (no lit edit): the screen is the largest dark hole in the light body, in the phone's upper
    half; its outline is the outer edge of the black border, as on the other plates."""
    a = box_blur(unlit, 4)
    h, w = a.shape
    c = a[h // 6: 5 * h // 6, w // 4: 3 * w // 4]
    body = a > np.percentile(c, 45)
    holes = [cc for cc in components(~body, 4)
             if cc['bbox'][0] > 4 and cc['bbox'][1] > 4 and cc['bbox'][2] < w - 8 and cc['bbox'][3] < h - 8]
    holes = [cc for cc in holes if cc['cy'] < h / 2]
    win = max(holes, key=lambda cc: cc['n'])
    m = np.zeros(a.shape, bool)
    m[win['ys'], win['xs']] = True
    return fit_quad(dilate(m, 2))


def find_pills(d, win):
    """For the angled macro: the soft keys, call keys and navigation key below the window, from the light round
    them. Returns design points (mm) and their measured centres (px)."""
    b = box_blur(d, 2)
    bottom = max(win[2][1], win[3][1])
    wx = (win[0][0] + win[1][0] + win[2][0] + win[3][0]) / 4
    ww = abs(win[1][0] - win[0][0])
    m = np.zeros(b.shape, bool)
    y0 = int(bottom + 0.02 * b.shape[0])
    m[y0:] = b[y0:] > 0.3 * np.percentile(b[y0:], 99.5)
    comps = [c for c in components(m, 2) if c['n'] > 2000 and c['bbox'][3] < b.shape[0] - 4]
    nav = min((c for c in comps if abs(c['cx'] - wx) < 0.15 * ww), key=lambda c: c['cy'], default=None)
    left = sorted([c for c in comps if c['cx'] < wx - 0.2 * ww], key=lambda c: c['cy'])[:2]
    right = sorted([c for c in comps if c['cx'] > wx + 0.2 * ww], key=lambda c: c['cy'])[:2]
    src, dst = [], []
    centre = lambda c: ((c['bbox'][0] + c['bbox'][2]) / 2, (c['bbox'][1] + c['bbox'][3]) / 2)
    if nav is not None:
        src.append((NAV[0], NAV[1]))
        dst.append(centre(nav))
    for (mmx, mmys), group in (((9, (42.5, 50)), left), ((37, (42.5, 50)), right)):
        for mmy, c in zip(mmys, group):
            src.append((mmx, mmy))
            dst.append(centre(c))
    return src, dst


def plate_entry(name, H, window=None, extra=None, measured=None):
    w, h = Image.open(IMG / f'{name}.png').size
    keys = {}
    for i, k in enumerate(KEY_IDS):
        if measured and k in measured:
            (cx, cy), (x0, y0, x1, y1) = measured[k]
            c, q, how = (cx, cy), [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], 'measured'
        else:
            c = apply(H, [key_center(i)])[0]
            q = apply(H, key_rect(i))
            inside = all(0 <= x < w and 0 <= y < h for x, y in q)
            how = 'estimated from the face plane' + ('' if inside else ', partly or wholly out of frame')
        keys[k] = {'center': [round(float(c[0]), 1), round(float(c[1]), 1)],
                   'quad': [[round(float(x), 1), round(float(y), 1)] for x, y in q], 'source': how}
    win = window if window is not None else apply(H, WINDOW)
    act = apply(H, ACTIVE) if window is None else apply(homography(WINDOW, window), ACTIVE)
    nav = apply(H, [(NAV[0], NAV[1]), (NAV[0] + NAV[2], NAV[1])])
    uv = lambda q: [[round(float(x) / w, 5), round(float(y) / h, 5)] for x, y in q]
    e = {
        'file': f'img/v2/{name}.png',
        'width': w,
        'height': h,
        'homographyMmToPx': [round(float(v), 8) for v in H.ravel()],
        'window': [[round(float(x), 1), round(float(y), 1)] for x, y in win],
        'active': [[round(float(x), 1), round(float(y), 1)] for x, y in act],
        'cornerPinUV': {'window': dict(zip(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'], uv(win))),
                        'active': dict(zip(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'], uv(act)))},
        'nav': {'center': [round(float(nav[0][0]), 1), round(float(nav[0][1]), 1)], 'radiusPx': round(float(np.hypot(*(nav[1] - nav[0]))), 1)},
        'keys': keys,
    }
    if extra:
        e.update(extra)
    return e


def overlay(name, e, measured=None):
    im = Image.open(IMG / f'{name}.png').convert('RGB')
    d = ImageDraw.Draw(im)
    if 'window' in e:
        d.polygon([tuple(p) for p in e['window']], outline=(255, 0, 255), width=3)
        d.polygon([tuple(p) for p in e['active']], outline=(0, 255, 255), width=3)
    for k, v in e['keys'].items():
        d.polygon([tuple(p) for p in v["quad"]], outline=(255, 200, 0), width=3)
        x, y = v['center']
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(255, 200, 0))
    for k, ((x, y), _) in (measured or {}).items():
        d.ellipse([x - 7, y - 7, x + 7, y + 7], outline=(0, 255, 0), width=2)
    OVER.mkdir(parents=True, exist_ok=True)
    im.save(OVER / f'{name}-overlay.png')


def measure_all():
    data = {
        '_about': ('Measured on the v2 Act 1 plates (public/img/v2) by scripts/images/measure-v2.py. Pixel coordinates '
                   'in each plate (origin top-left). Quads are [topLeft, topRight, bottomRight, bottomLeft]. "window" '
                   'is the glowing opening of the lens, out to the outer edge of its thin black border (sharp corners; '
                   'the border\'s rounding is ignored); "active" is the 96 x 64 LCD area inside it, placed by the '
                   'design\'s margins: pin the LCD there. cornerPinUV is the same divided by the plate size, for '
                   '@remotion/effects cornerPin. On v2-p2-macro the keys are estimates (source field): only the top row '
                   'shows, at the bottom edge. '
                   'Keys: 1-9, star, 0, hash. homographyMmToPx maps the design (mm, research-v2/10-act1-phone-front.svg) '
                   'to the plate. lightPass is the lit edit of the same plate (lit minus unlit = the light).'),
        'design': {'units': 'mm', 'window': WINDOW, 'active': ACTIVE, 'keySizeMm': [KEY_W, KEY_H],
                   'keys': {k: {'center': list(key_center(i)), 'quad': key_rect(i)} for i, k in enumerate(KEY_IDS)}},
    }
    report = {}
    pairs = [('v2-p1-master', None), ('v2-p5-drawer', 'v2-p5-lit'), ('v2-p2-macro', 'v2-p2-lit'), ('v2-p3-keypad', 'v2-p3-lit')]
    for plate, litname in pairs:
        if not (IMG / f'{plate}.png').exists():
            continue
        unlit = lum(IMG / f'{plate}.png')
        if litname is None:
            win = find_dark_window(unlit)
            measured = find_keys_holes(unlit, np.zeros_like(unlit))
            src = WINDOW + [key_center(KEY_IDS.index(k)) for k in measured]
            dst = [tuple(p) for p in win] + [v[0] for v in measured.values()]
            H = homography(src, dst)
            e = plate_entry(plate, H, window=win, measured=measured, extra={'lightPass': None, 'note': (
                'No lit edit: the window comes from the dark glass and the keys are the dark key faces (with '
                'their shadows), not the light rings. Give the screen its own glow (PhoneScreen does).')})
            pred = {k: apply(H, [key_center(KEY_IDS.index(k))])[0] for k in measured}
            e['keyFitRmsPx'] = round(float(np.sqrt(np.mean([np.hypot(measured[k][0][0] - pred[k][0], measured[k][0][1] - pred[k][1]) ** 2 for k in measured]))), 2)
            data[plate] = e
            overlay(plate, e, measured)
            report[plate] = {'keyFitRmsPx': e['keyFitRmsPx']}
            continue
        has_lit = (IMG / f'{litname}.png').exists()
        lit = lum(IMG / f'{litname}.png') if has_lit else None
        dx, dy, _ = shift(unlit, lit) if has_lit else (0, 0, 0)
        extra = {'lightPass': f'img/v2/{litname}.png' if has_lit else None, 'lightPassShiftPx': [dx, dy]}
        measured = None
        d = diff_img(unlit, lit, dx, dy)
        if plate == 'v2-p3-keypad':
            measured = find_keys_holes(unlit, d)
            H = homography([key_center(KEY_IDS.index(k)) for k in measured], [v[0] for v in measured.values()])
            e = plate_entry(plate, H, extra=extra, measured=measured)
            for k in ('window', 'active', 'cornerPinUV'):
                e.pop(k)
        else:
            win, core = find_window(d)
            litc = np.roll(np.roll(lit, -dy, 0), -dx, 1)
            win = refine_top_parallel(litc, win) if plate == 'v2-p5-drawer' else refine_top(litc, win)
            if plate == 'v2-p5-drawer':
                screen = np.zeros(d.shape, bool)
                x0, y0, x1, y1 = core['bbox']
                pad = int(0.02 * d.shape[1])
                screen[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad] = True
                Hw = homography(WINDOW, win)
                top = int(apply(Hw, [(0, 54)])[0][1])
                bot = int(apply(Hw, [(0, 96)])[0][1])
                lx = int(apply(Hw, [(-4, 0)])[0][0])
                rx = int(apply(Hw, [(50, 0)])[0][0])
                measured = find_keys(d, region=(max(0, lx), max(0, top), min(d.shape[1], rx), min(d.shape[0], bot)), exclude=screen)
                src = WINDOW + [key_center(KEY_IDS.index(k)) for k in measured]
                dst = [tuple(p) for p in win] + [v[0] for v in measured.values()]
                H = homography(src, dst)
            else:
                psrc, pdst = find_pills(d, win)
                H = homography(WINDOW + psrc, [tuple(p) for p in win] + pdst)
                extra['facePointsUsed'] = 4 + len(psrc)
            e = plate_entry(plate, H, window=win, extra=extra, measured=measured)
        if measured:
            pred = {k: apply(H, [key_center(KEY_IDS.index(k))])[0] for k in measured}
            err = [np.hypot(measured[k][0][0] - pred[k][0], measured[k][0][1] - pred[k][1]) for k in measured]
            e['keyFitRmsPx'] = round(float(np.sqrt(np.mean(np.square(err)))), 2)
            e['keysDetected'] = len(measured)
        data[plate] = e
        overlay(plate, e, measured)
        report[plate] = {k: e.get(k) for k in ('lightPassShiftPx', 'keyFitRmsPx', 'keysDetected')}
    OUT.write_text(json.dumps(data, indent=1) + '\n')
    print(json.dumps(report, indent=1))
    print('wrote', OUT)


if __name__ == '__main__':
    if len(sys.argv) >= 4 and sys.argv[1] == 'align':
        a, b = lum(sys.argv[2]), lum(sys.argv[3])
        print('shift of lit vs unlit (dx, dy, peak):', shift(a, b))
    elif len(sys.argv) >= 2 and sys.argv[1] == 'all':
        measure_all()
    else:
        print(__doc__)

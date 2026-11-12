"""Spatial lab: diff two regression runs (src/lab3d/tools/frames.ts) or seam pairs.

    python3 -I src/lab3d/tools/regress.py runs <before_dir> <after_dir> <out_sheet.png> [threshold]
    python3 -I src/lab3d/tools/regress.py seams <dir> a.png:b.png ...

'runs': per frame, the mean absolute difference (0-255) and the share of pixels that changed by more than 8; frames
above the threshold (mean diff, default 0.5) are listed and tiled as before | after | diff x4 into the sheet.
'seams': the same numbers for each pair (identical = 0 / 0%).
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw


def load(p):
    return np.asarray(Image.open(p).convert('RGB'), dtype=np.int16)


def diff(a, b):
    d = np.abs(a - b)
    return float(d.mean()), float((d.max(axis=2) > 8).mean() * 100), int(d.max())


def runs(before, after, sheet, threshold=0.5):
    rows = []
    for comp in sorted(os.listdir(before)):
        bdir, adir = os.path.join(before, comp), os.path.join(after, comp)
        if not os.path.isdir(adir):
            continue
        for f in sorted(os.listdir(bdir)):
            if not os.path.exists(os.path.join(adir, f)):
                continue
            m, share, mx = diff(load(os.path.join(bdir, f)), load(os.path.join(adir, f)))
            rows.append((comp, f, m, share, mx))
    changed = [r for r in rows if r[2] > threshold]
    print(f'{len(rows)} frames compared, {len(changed)} changed (mean abs diff > {threshold})')
    for comp, f, m, share, mx in changed:
        print(f'  {comp} {f[1:-4]}: mean {m:.2f}, {share:.1f}% of pixels > 8, max {mx}')
    if changed:
        tiles = []
        for comp, f, m, share, mx in changed[:60]:
            a = Image.open(os.path.join(before, comp, f)).convert('RGB')
            b = Image.open(os.path.join(after, comp, f)).convert('RGB')
            d = np.clip(np.abs(np.asarray(a, dtype=np.int16) - np.asarray(b, dtype=np.int16)) * 4, 0, 255).astype(np.uint8)
            w, h = a.size
            t = Image.new('RGB', (3 * w + 8, h + 22), (0, 0, 0))
            t.paste(a, (0, 22))
            t.paste(b, (w + 4, 22))
            t.paste(Image.fromarray(d), (2 * w + 8, 22))
            ImageDraw.Draw(t).text((4, 4), f'{comp} {f[1:-4]}  before | after | diff x4   mean {m:.2f}  {share:.1f}%', fill=(255, 255, 255))
            tiles.append(t)
        W, H = tiles[0].size
        cols = 2
        rows_n = (len(tiles) + cols - 1) // cols
        out = Image.new('RGB', (cols * W + 6, rows_n * H + (rows_n - 1) * 4), (30, 30, 30))
        for i, t in enumerate(tiles):
            out.paste(t, ((i % cols) * (W + 6), (i // cols) * (H + 4)))
        out.save(sheet)
        print('sheet', sheet, out.size)


def seams(d, pairs):
    for p in pairs:
        a, b = p.split(':')
        m, share, mx = diff(load(os.path.join(d, a)), load(os.path.join(d, b)))
        print(f'  {a} vs {b}: mean {m:.3f}, {share:.2f}% of pixels > 8, max {mx}')


if __name__ == '__main__':
    if sys.argv[1] == 'runs':
        runs(sys.argv[2], sys.argv[3], sys.argv[4], float(sys.argv[5]) if len(sys.argv) > 5 else 0.5)
    else:
        seams(sys.argv[2], sys.argv[3:])

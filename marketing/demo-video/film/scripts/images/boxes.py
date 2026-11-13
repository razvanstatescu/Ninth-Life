"""Measure and check the boxes of keys and displays on Act 1's plates (src/data/plates.json).

    python3 -I scripts/images/boxes.py detect <plate.png> <guide-layout-key> [--scale 1]
        Estimates the 12 key boxes (and the display) from the green glow around them, starting from the
        guide's layout. Prints JSON.
    python3 -I scripts/images/boxes.py draw <plate-id> <out.jpg> [x y w h]
        Draws the boxes recorded in src/data/plates.json over the plate (optionally a crop), to check
        by eye that every box sits on its key.

Run from film/.
"""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FILM = Path(__file__).resolve().parents[2]
PLATES = FILM / 'src' / 'data' / 'plates.json'
ORDER = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'star', '0', 'hash']


def glow_mask(a):
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    return (g - (r + b) / 2)


def refine_key(gm, lum, box, pad):
    """Find the dark key top inside the glow ring near `box`: the bounding box of the region whose
    glow is low, searched from the box centre outwards along rows and columns."""
    x, y, w, h = box
    cx, cy = x + w // 2, y + h // 2
    H, W = gm.shape
    x0, x1 = max(0, x - pad), min(W, x + w + pad)
    y0, y1 = max(0, y - pad), min(H, y + h + pad)
    sub = gm[y0:y1, x0:x1]
    # Glow ring: strong green. Edges = where the green rises above a threshold, scanning out from the centre.
    thr = np.percentile(sub, 90) * 0.55
    row = gm[cy - h // 6: cy + h // 6, x0:x1].mean(axis=0)
    col = gm[y0:y1, cx - w // 6: cx + w // 6].mean(axis=1)
    c = cx - x0
    left = c
    while left > 0 and row[left] < thr:
        left -= 1
    right = c
    while right < len(row) - 1 and row[right] < thr:
        right += 1
    c = cy - y0
    top = c
    while top > 0 and col[top] < thr:
        top -= 1
    bottom = c
    while bottom < len(col) - 1 and col[bottom] < thr:
        bottom += 1
    return [int(x0 + left), int(y0 + top), int(right - left), int(bottom - top)]


def detect(path, key):
    a = np.asarray(Image.open(path).convert('RGB')).astype(float)
    gm = glow_mask(a)
    lum = a.mean(axis=2)
    layout = json.loads((Path(__file__).parent / 'guides' / 'layout.json').read_text())[key]
    out = {'width': a.shape[1], 'height': a.shape[0], 'keys': {}}
    pad = int(layout['keys'][0][2] * 0.35)
    for k, box in zip(ORDER, layout['keys']):
        out['keys'][k] = refine_key(gm, lum, box, pad)
    return out


def draw(pid, out, crop=None):
    plates = json.loads(PLATES.read_text())
    p = plates[pid]
    im = Image.open(FILM / 'public' / 'img' / f'{pid}.png').convert('RGB')
    d = ImageDraw.Draw(im)
    try:
        f = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 28)
    except Exception:
        f = ImageFont.load_default()
    for k, (x, y, w, h) in p.get('keys', {}).items():
        d.rectangle([x, y, x + w, y + h], outline=(255, 60, 200), width=3)
        d.text((x + 8, y + 6), k, fill=(255, 60, 200), font=f)
    for name in ('display', 'face', 'body'):
        if name in p:
            x, y, w, h = p[name]
            d.rectangle([x, y, x + w, y + h], outline=(60, 200, 255), width=3)
            d.text((x + 8, y + 6), name, fill=(60, 200, 255), font=f)
    if crop:
        x, y, w, h = crop
        im = im.crop((x, y, x + w, y + h))
    if im.width > 1600:
        im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    im.save(out, quality=90)
    print(out)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'detect':
        print(json.dumps(detect(sys.argv[2], sys.argv[3])))
    elif cmd == 'draw':
        crop = list(map(int, sys.argv[4:8])) if len(sys.argv) >= 8 else None
        draw(sys.argv[2], sys.argv[3], crop)

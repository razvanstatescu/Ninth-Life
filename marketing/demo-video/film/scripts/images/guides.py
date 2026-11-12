"""Flat layout guides for the image model (04-asset-plan.md, "Getting the keys where the film expects them").

Grey shapes on black, 2560 x 1440. The model is asked to keep every key where the guide has it; the real
boxes are measured afterwards and written to src/data/plates.json.

    python3 -I scripts/images/guides.py            (from film/)
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
OUT = HERE / 'guides'
W, H = 2560, 1440
GREY = (128, 128, 128)
DIM = (46, 46, 50)


def grid(x0, y0, size, gap, cols=3, rows=4):
    """Boxes [x, y, w, h] of a cols x rows grid of squares, row by row."""
    return [[x0 + c * (size + gap), y0 + r * (size + gap), size, size] for r in range(rows) for c in range(cols)]


def keypad():
    # The close-up (IMG-01/02): rounded-square keys filling most of the height, plain plastic below
    # the last row so a caption can sit there.
    size, gap = 256, 40
    gw = 3 * size + 2 * gap
    x0 = (W - gw) // 2
    y0 = 56
    im = Image.new('RGB', (W, H), (0, 0, 0))
    d = ImageDraw.Draw(im)
    boxes = grid(x0, y0, size, gap)
    for x, y, w, h in boxes:
        d.rounded_rectangle([x, y, x + w, y + h], radius=52, fill=GREY)
    im.save(OUT / 'keypad.png')
    return {'keys': boxes}


def phone():
    # The whole phone (IMG-06/07): a plain rounded body, one display, twelve rounded-square keys.
    bw, bh = 480, 1040
    bx, by = (W - bw) // 2, 120
    dw, dh = 364, 208  # 7:4
    dx, dy = bx + (bw - dw) // 2, by + 110
    size, gap = 104, 26
    gw = 3 * size + 2 * gap
    kx, ky = bx + (bw - gw) // 2, by + 450
    im = Image.new('RGB', (W, H), (0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=120, fill=DIM)
    d.rounded_rectangle([dx, dy, dx + dw, dy + dh], radius=10, fill=(150, 170, 150))
    boxes = grid(kx, ky, size, gap)
    for x, y, w, h in boxes:
        d.rounded_rectangle([x, y, x + w, y + h], radius=26, fill=GREY)
    im.save(OUT / 'phone.png')
    return {'body': [bx, by, bw, bh], 'display': [dx, dy, dw, dh], 'keys': boxes}


def screen():
    # The empty pixel screen (IMG-04): a 7:4 display, centred, about 64% of the width.
    dw, dh = 1624, 928
    dx, dy = (W - dw) // 2, (H - dh) // 2
    im = Image.new('RGB', (W, H), DIM)
    d = ImageDraw.Draw(im)
    d.rectangle([dx, dy, dx + dw, dy + dh], fill=(150, 170, 150))
    im.save(OUT / 'screen.png')
    return {'display': [dx, dy, dw, dh]}


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    layout = {'keypad': keypad(), 'phone': phone(), 'screen': screen()}
    (OUT / 'layout.json').write_text(json.dumps(layout, indent=1) + '\n')
    print('guides written to', OUT, file=sys.stderr)

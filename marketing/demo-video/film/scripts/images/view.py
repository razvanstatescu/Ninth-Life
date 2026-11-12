"""Small copies of image takes for looking at them, and labelled sheets.

    python3 -I scripts/images/view.py sheet <id> [width]          -> _takes/images/<id>/sheet.jpg (all takes)
    python3 -I scripts/images/view.py small <in.png> <out.jpg> [width]
    python3 -I scripts/images/view.py crop <in.png> <out.jpg> x y w h [width]   (a detail at full size)
    python3 -I scripts/images/view.py contact <out.png> <a.png> <b.png> ...      (chosen pictures, labelled)

Run from film/.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

FILM = Path(__file__).resolve().parents[2]
TAKES = FILM / '_takes' / 'images'


def font(size):
    try:
        return ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', size)
    except Exception:
        return ImageFont.load_default()


def label(im, text, size=22):
    d = ImageDraw.Draw(im)
    f = font(size)
    tb = d.textbbox((0, 0), text, font=f)
    d.rectangle([6, 6, 18 + tb[2] - tb[0], 14 + tb[3] - tb[1]], fill=(0, 0, 0))
    d.text((12, 6), text, fill=(255, 255, 255), font=f)
    return im


def small(src, width):
    im = Image.open(src).convert('RGB')
    h = round(im.height * width / im.width)
    return im.resize((width, h), Image.LANCZOS)


def tile(items, cols, out, width):
    ims = [label(small(p, width), name) for name, p in items]
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * w + (cols - 1) * 6, rows * h + (rows - 1) * 6), (20, 20, 20))
    for i, im in enumerate(ims):
        sheet.paste(im, ((i % cols) * (w + 6), (i // cols) * (h + 6)))
    sheet.save(out, quality=88)
    print(out)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'sheet':
        iid = sys.argv[2]
        width = int(sys.argv[3]) if len(sys.argv) > 3 else 760
        files = sorted((TAKES / iid).glob(f'{iid}-*.png'))
        tile([(f.stem, f) for f in files], 2, TAKES / iid / 'sheet.jpg', width)
    elif cmd == 'small':
        width = int(sys.argv[4]) if len(sys.argv) > 4 else 1280
        small(sys.argv[2], width).save(sys.argv[3], quality=90)
        print(sys.argv[3])
    elif cmd == 'crop':
        src, out = sys.argv[2], sys.argv[3]
        x, y, w, h = map(int, sys.argv[4:8])
        width = int(sys.argv[8]) if len(sys.argv) > 8 else w
        im = Image.open(src).convert('RGB').crop((x, y, x + w, y + h))
        im.resize((width, round(h * width / w)), Image.LANCZOS).save(out, quality=92)
        print(out)
    elif cmd == 'contact':
        out = sys.argv[2]
        items = [(Path(p).stem, p) for p in sys.argv[3:]]
        tile(items, 2, out, 900)

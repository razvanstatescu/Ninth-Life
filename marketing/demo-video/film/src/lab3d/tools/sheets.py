"""Spatial lab: tile a regression run (src/lab3d/tools/frames.ts) into one contact sheet per composition.

    python3 -I src/lab3d/tools/sheets.py <run_dir> <out_dir> [cols]
"""
import os
import sys

from PIL import Image, ImageDraw


def main(run, out, cols=6):
    os.makedirs(out, exist_ok=True)
    for comp in sorted(os.listdir(run)):
        d = os.path.join(run, comp)
        if not os.path.isdir(d):
            continue
        files = sorted(f for f in os.listdir(d) if f.endswith('.png'))
        if not files:
            continue
        ims = [Image.open(os.path.join(d, f)).convert('RGB') for f in files]
        w, h = ims[0].size
        rows = (len(ims) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * w + (cols - 1) * 4, rows * h + (rows - 1) * 4), (0, 0, 0))
        dr = ImageDraw.Draw(sheet)
        for i, (f, im) in enumerate(zip(files, ims)):
            x, y = (i % cols) * (w + 4), (i // cols) * (h + 4)
            sheet.paste(im, (x, y))
            dr.rectangle([x, y, x + 46, y + 14], fill=(0, 0, 0))
            dr.text((x + 3, y + 2), f[1:-4], fill=(255, 255, 255))
        sheet.save(os.path.join(out, f'{comp}.png'))
        print(comp, len(files), sheet.size)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 6)

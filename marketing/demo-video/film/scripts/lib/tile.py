"""Tile labelled frames into a contact sheet: python3 -I tile.py <out.png> <cols> <frame:path> ..."""
import sys
from PIL import Image, ImageDraw, ImageFont

out, cols = sys.argv[1], int(sys.argv[2])
items = [a.split(':', 1) for a in sys.argv[3:]]
imgs = [(f, Image.open(p).convert('RGB')) for f, p in items]
w, h = imgs[0][1].size
rows = (len(imgs) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w + (cols - 1) * 4, rows * h + (rows - 1) * 4), (0, 0, 0))
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', max(14, h // 14))
except Exception:
    font = ImageFont.load_default()
for i, (f, im) in enumerate(imgs):
    x, y = (i % cols) * (w + 4), (i // cols) * (h + 4)
    sheet.paste(im, (x, y))
    d = ImageDraw.Draw(sheet)
    tb = d.textbbox((0, 0), f, font=font)
    d.rectangle([x + 4, y + 4, x + 12 + tb[2] - tb[0], y + 10 + tb[3] - tb[1]], fill=(0, 0, 0))
    d.text((x + 8, y + 4), f, fill=(255, 255, 255), font=font)
sheet.save(out)

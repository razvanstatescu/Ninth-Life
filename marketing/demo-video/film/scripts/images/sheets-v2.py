"""Review sheets for the v2 Act 1 plates (phase 1): the finals, every take with its verdict, and the look-alike
check that puts our phone beside the list of makers' signatures to avoid (research-v2/10-act1-old-world.md, 2.7).

    python3 -I scripts/images/sheets-v2.py          (from film/; writes out/act1-v2/*.png)
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
FILM = HERE.parent.parent
IMG = FILM / 'public' / 'img' / 'v2'
TAKES = FILM / 'out' / 'act1-v2' / 'takes'
OUT = FILM / 'out' / 'act1-v2'
BG, FG, DIM, OK, NO = (20, 10, 46), (238, 232, 255), (170, 160, 200), (150, 220, 160), (255, 143, 166)


def font(size, bold=False):
    for p in (['/System/Library/Fonts/Supplemental/Arial Bold.ttf'] if bold else []) + ['/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/SFNS.ttf']:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


def wrap(d, text, f, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def thumb(path, w, h):
    im = Image.open(path).convert('RGB')
    im.thumbnail((w, h), Image.LANCZOS)
    return im


def finals_sheet():
    plates = json.loads((FILM / 'src' / 'data' / 'plates-v2.json').read_text())
    items = [
        ('v2-p1-master', 'Master, the identity reference (1440 x 2560). Not in the film.'),
        ('v2-p5-drawer', 'Drawer, phone off. Act 1 shots 1, 2, 3, 6, 7.'),
        ('v2-p5-lit', 'Drawer light pass (lit edit). Shot 3, the wake.'),
        ('v2-p2-macro', 'Angled macro, screen off. Shots 4, 5.'),
        ('v2-p2-lit', 'Macro light pass. Shots 4, 5.'),
        ('v2-p3-keypad', 'Keypad straight on, dusty (3840 x 2160). Act 2 "same keys" handover.'),
        ('v2-p3-lit', 'Keypad light pass: the keys light up.'),
    ]
    cw, ch, pad, lab = 640, 360, 24, 70
    cols = 3
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (cw + pad) + pad, 90 + rows * (ch + lab + pad) + pad), BG)
    d = ImageDraw.Draw(sheet)
    d.text((pad, 24), 'Act 1 v2 plates, finals (phase 1, 2026-11-10). Overlays with the measured window, screen and keys: out/act1-v2/overlays/', font=font(22, True), fill=FG)
    for i, (name, note) in enumerate(items):
        x = pad + (i % cols) * (cw + pad)
        y = 90 + (i // cols) * (ch + lab + pad)
        t = thumb(IMG / f'{name}.png', cw, ch)
        sheet.paste(t, (x + (cw - t.width) // 2, y + (ch - t.height) // 2))
        info = ''
        base = name.replace('-lit', '-drawer' if 'p5' in name else ('-macro' if 'p2' in name else '-keypad'))
        if name.endswith('-lit') and base in plates:
            info = f"  drift vs plate (px): {plates[base].get('lightPassShiftPx')}"
        elif name in plates and plates[name].get('keyFitRmsPx') is not None:
            info = f"  key fit rms {plates[name]['keyFitRmsPx']} px"
        d.text((x, y + ch + 8), name + info, font=font(18, True), fill=FG)
        d.text((x, y + ch + 34), note, font=font(16), fill=DIM)
    sheet.save(OUT / 'contact-finals.png')


def takes_sheet():
    decisions = json.loads((HERE / 'decisions-v2.json').read_text())
    takes = []
    for sub in sorted(p for p in TAKES.iterdir() if p.is_dir()):
        for png in sorted(sub.glob('*.png')):
            side = json.loads(png.with_suffix('.json').read_text())
            dec = decisions.get(png.stem, {'status': 'unreviewed', 'notes': ''})
            takes.append((png, side, dec))
    cw, ch, pad, lab = 420, 236, 18, 150
    cols = 4
    rows = (len(takes) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (cw + pad) + pad, 80 + rows * (ch + lab + pad) + pad), BG)
    d = ImageDraw.Draw(sheet)
    d.text((pad, 24), f'Every v2 generation ({len(takes)} pictures; budget 40) with its verdict. Green: chosen. Pink: rejected.', font=font(22, True), fill=FG)
    for i, (png, side, dec) in enumerate(takes):
        x = pad + (i % cols) * (cw + pad)
        y = 80 + (i // cols) * (ch + lab + pad)
        t = thumb(png, cw, ch)
        sheet.paste(t, (x + (cw - t.width) // 2, y + (ch - t.height) // 2))
        col = OK if dec['status'] == 'chosen' else NO
        d.rectangle([x - 3, y - 3, x + cw + 2, y + ch + 2], outline=col, width=3)
        p = side['params']
        d.text((x, y + ch + 6), f"{png.stem}  {dec['status'].upper()}", font=font(16, True), fill=col)
        d.text((x, y + ch + 28), f"{side['model'].replace('gpt-image-2.6-', '')}, {p['quality']}, {p['size']}", font=font(14), fill=DIM)
        for j, line in enumerate(wrap(d, dec['notes'], font(14), cw)[:5]):
            d.text((x, y + ch + 48 + j * 18), line, font=font(14), fill=FG)
    sheet.save(OUT / 'contact-all-takes.png')


AVOID = [
    ('One wide soft key centred under the screen, with a separate clear key', 'Two soft keys, left and right'),
    ('Tall signal and battery bars down the left and right edges of the screen', 'Nothing on the dark screen; the film draws a top status row'),
    ('A hands start-up animation, a snake game, a famous ringtone or message alert', 'None; our own beeps and five-note motif'),
    ('Curved "smiling" key rows, teardrop or crescent keys, a joystick, a jog dial', 'A straight 3 x 4 grid of identical wide keys'),
    ('Slider, swivel or flip body', 'A plain bar'),
    ('Patterned, coloured or translucent exchangeable covers', 'One satin pewter grey'),
    ('A stub aerial at a top corner', 'A smooth top'),
    ('Hourglass waist, oval screen, curved "banana" body', 'A plain rounded rectangle'),
    ('A maker\'s logo, name plate or speaker-grille pattern', 'None: a plain earpiece slot, no marks anywhere'),
    ('Copied firmware fonts or icons', 'Screen and legends drawn by the film (OFL fonts, our own icons)'),
]


def lookalike_sheet():
    W, H = 2400, 1500
    sheet = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(sheet)
    d.text((40, 30), 'Look-alike check for the owner: our phone beside the makers\' signatures we avoid', font=font(34, True), fill=FG)
    d.text((40, 82), 'Compare with the well-known keypad phones of 1998 to 2006. If any picture could be taken for a real model, reject it: '
                     'the film then falls back to close-ups (research-v2/10-act1-old-world.md, 6.4).', font=font(20), fill=DIM)
    m = thumb(IMG / 'v2-p1-master.png', 540, 960)
    sheet.paste(m, (40, 140))
    dr = Image.open(IMG / 'v2-p5-drawer.png').convert('RGB')
    w, h = dr.size
    crop = dr.crop((int(0.36 * w), int(0.05 * h), int(0.64 * w), int(0.95 * h)))
    crop.thumbnail((440, 960), Image.LANCZOS)
    sheet.paste(crop, (600, 140))
    d.text((40, 1110), 'Master (straight on)', font=font(18, True), fill=FG)
    d.text((600, 1110), 'In the drawer (as filmed)', font=font(18, True), fill=FG)
    x0, y = 1090, 150
    d.text((x0, y), 'Signature of one maker or model (avoid)', font=font(20, True), fill=NO)
    d.text((x0 + 700, y), 'Our phone', font=font(20, True), fill=OK)
    y += 40
    for bad, ours in AVOID:
        bl = wrap(d, bad, font(18), 660)
        ol = wrap(d, ours, font(18), 560)
        for j, line in enumerate(bl):
            d.text((x0, y + j * 24), line, font=font(18), fill=FG)
        for j, line in enumerate(ol):
            d.text((x0 + 700, y + j * 24), line, font=font(18), fill=OK)
        y += 24 * max(len(bl), len(ol)) + 16
        d.line([x0, y - 8, x0 + 1270, y - 8], fill=(60, 45, 100), width=1)
    y += 10
    notes = ('Shared by many keypad phones of the time, so used here: an earpiece slot, a rectangular screen window with a black '
             'printed border, two soft keys and two call keys around a round four-way key, twelve keys, a microphone hole. '
             'Body 106 x 46 x 19 mm, from the median of bar phones announced 2002 to 2006. My own read: plain and generic, '
             'with no feature I know from one maker; this needs a person\'s check, not mine.')
    for j, line in enumerate(wrap(d, notes, font(18), 1270)):
        d.text((x0, y + j * 24), line, font=font(18), fill=DIM)
    sheet.save(OUT / 'lookalike-check.png')


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    finals_sheet()
    takes_sheet()
    lookalike_sheet()
    print('wrote', OUT / 'contact-finals.png', OUT / 'contact-all-takes.png', OUT / 'lookalike-check.png')

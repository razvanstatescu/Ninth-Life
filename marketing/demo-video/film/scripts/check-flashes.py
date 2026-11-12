"""
Flash screening for the rendered film (05-production-guide.md, section 9).

    python3 -I scripts/check-flashes.py out/film.mp4 [--json out/flash-report.json]

Method (a screening tool, not a certified broadcast test such as a Harding analysis):
- Each frame is scaled to 128x72 and split into a 4 x 4 grid (16 cells, each 1/16 of the picture).
- Each cell's mean relative luminance is computed in linear light (WCAG 2.x definition).
- A "transition" is a swing of at least 0.10 relative luminance between successive extremes of a
  cell's luminance over time, where the darker side is below 0.80 (WCAG 2.3.1 general flash).
  Two opposing transitions are one flash.
- In any one-second window, a cell with 7 or more transitions (more than 3 flashes) is "flashing".
- FAIL when 4 or more cells (a quarter of the picture) flash in the same window (ITU-R BT.1702 area
  rule); WARN when any single cell does. Fast cuts between dark and bright frames are counted too.
- Any cell whose mean colour is a saturated red (R / (R + G + B) >= 0.8, and bright enough to see)
  is reported as a red-flash risk.
Exit code 0 = pass (warnings possible), 1 = fail, 2 = usage or decode error.
"""
import json
import subprocess
import sys

import numpy as np

W, H, GX, GY = 128, 72, 4, 4
SWING = 0.10
DARK_MAX = 0.80
WINDOW_S = 1.0
MAX_TRANSITIONS = 6  # 3 flashes = 6 transitions; 7 or more fails


def probe_fps(path):
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', path],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    num, den = out.split('/')
    return float(num) / float(den)


def frames(path):
    proc = subprocess.Popen(
        ['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={W}:{H}:flags=area,format=rgb24', '-f', 'rawvideo', '-'],
        stdout=subprocess.PIPE,
    )
    size = W * H * 3
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, dtype=np.uint8).reshape(H, W, 3)
    proc.wait()


def linear(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def transitions(series):
    """Times (frame indices) of swings of at least SWING between successive extremes."""
    out = []
    ext = series[0]
    direction = 0
    for t in range(1, len(series)):
        v = series[t]
        if direction >= 0:
            if v > ext:
                ext = v
            elif ext - v >= SWING and min(ext, v) < DARK_MAX:
                out.append(t)
                direction = -1
                ext = v
                continue
        if direction <= 0:
            if v < ext:
                ext = v
            elif v - ext >= SWING and min(ext, v) < DARK_MAX:
                out.append(t)
                direction = 1
                ext = v
    return out


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    path = args[0]
    report_path = None
    if '--json' in args:
        report_path = args[args.index('--json') + 1]
    fps = probe_fps(path)
    lum = []
    red_hits = []
    for i, fr in enumerate(frames(path)):
        lin = linear(fr.astype(np.float64))
        L = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
        cells = L.reshape(GY, H // GY, GX, W // GX).mean(axis=(1, 3))
        lum.append(cells.flatten())
        rgb = fr.astype(np.float64).reshape(GY, H // GY, GX, W // GX, 3).mean(axis=(1, 3))
        s = rgb.sum(axis=-1)
        ratio = np.where(s > 0, rgb[..., 0] / np.maximum(s, 1e-9), 0)
        bright = rgb[..., 0] > 80
        if np.any((ratio >= 0.8) & bright):
            red_hits.append(i)
    if not lum:
        print('check-flashes: could not decode any frame')
        return 2
    lum = np.array(lum)  # (frames, 16)
    n = lum.shape[0]
    win = int(round(WINDOW_S * fps))
    per_cell = [transitions(lum[:, c]) for c in range(GX * GY)]
    # For each window start, which cells exceed the limit.
    worst = 0
    fails = []
    warns = []
    counts_max = []
    for c, ts in enumerate(per_cell):
        ts = np.array(ts)
        m = 0
        for t in ts:
            k = int(np.sum((ts >= t) & (ts < t + win)))
            m = max(m, k)
        counts_max.append(m)
    starts = sorted(set(t for ts in per_cell for t in ts))
    for t in starts:
        flashing = [c for c, ts in enumerate(per_cell) if sum(1 for x in ts if t <= x < t + win) > MAX_TRANSITIONS]
        if flashing:
            worst = max(worst, len(flashing))
            entry = {'frame': t, 'time': round(t / fps, 2), 'cells': flashing}
            (fails if len(flashing) >= (GX * GY) // 4 else warns).append(entry)
    result = {
        'file': path,
        'fps': fps,
        'frames': n,
        'maxTransitionsPerSecondPerCell': counts_max,
        'worstSimultaneousFlashingCells': worst,
        'fails': fails[:50],
        'warnings': warns[:50],
        'saturatedRedFrames': red_hits[:50],
        'verdict': 'FAIL' if fails or red_hits else ('WARN' if warns else 'PASS'),
        'note': 'Screening only: 4x4 grid, WCAG 2.3.1 general-flash thresholds, ITU-R BT.1702 area rule. Not a certified analysis.',
    }
    if report_path:
        with open(report_path, 'w') as f:
            json.dump(result, f, indent=2)
    print(f"check-flashes: {result['verdict']}  frames={n}  fps={fps:g}  worst simultaneous flashing cells={worst}/16  "
          f"max transitions/s in a cell={max(counts_max)}  saturated-red frames={len(red_hits)}")
    for e in fails[:10]:
        print(f"  FAIL at {e['time']}s (frame {e['frame']}): {len(e['cells'])} cells flashing")
    for e in warns[:10]:
        print(f"  warn at {e['time']}s (frame {e['frame']}): cells {e['cells']}")
    return 1 if result['verdict'] == 'FAIL' else 0


if __name__ == '__main__':
    sys.exit(main())

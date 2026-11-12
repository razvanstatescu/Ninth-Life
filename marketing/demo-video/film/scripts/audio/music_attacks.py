"""Beat-grid check by attack times measured in the waveform (no detector lag).

Usage (from film/): .venv/bin/python scripts/audio/music_attacks.py <file.wav> [--bpm 120] [--offset 0]
                    [--until 76] [--json out.json]

For each grid point g = offset + k * 60/bpm up to --until seconds: the 0.25 ms peak envelope (dB) of the
mono mix is read in [g-30 ms, g+30 ms]. The level before the beat (median of g-30..g-12 ms) and the peak
(max of g-12..g+30 ms) are taken; if the peak is less than 6 dB above the level before, the beat has no attack
and is skipped. Otherwise the attack time is the first bin after g-25 ms where the envelope reaches the
midpoint (in dB) between the two. Deviation = attack - g. A line fit of attack times gives the tempo.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, SR  # noqa: E402

BIN = 0.00025


def env_db(x):
    w = int(BIN * SR)
    n = len(x) // w
    m = np.max(np.abs(x[: n * w].reshape(n, w)), axis=1)
    return 20 * np.log10(np.maximum(m, 1e-9))


def attacks(x, grid):
    e = env_db(x)
    out = []
    for g in grid:
        c = g / BIN

        def sl(a_ms, b_ms):
            a = int(round(c + a_ms / 1000 / BIN))
            b = int(round(c + b_ms / 1000 / BIN))
            return max(a, 0), max(min(b, len(e)), 0)

        a, b = sl(-30, -12)
        pre = float(np.median(e[a:b])) if b > a else -90.0
        a2, b2 = sl(-12, 30)
        if b2 <= a2:
            out.append((g, None, None))
            continue
        pk = float(np.max(e[a2:b2]))
        if pk - pre < 9.0:
            out.append((g, None, pk - pre))
            continue
        mid = pre + 0.5 * (pk - pre)
        a3, b3 = sl(-25, 30)
        seg = e[a3:b3]
        idx = np.nonzero(seg >= mid)[0]
        # no clean rise inside the window (already loud at its start): not a measurable attack
        if not idx.size or idx[0] < 4:
            out.append((g, None, pk - pre))
            continue
        t = (a3 + idx[0]) * BIN
        out.append((g, t, pk - pre))
    return out


def run(path, bpm=120.0, offset=0.0, until=76.0):
    x = read(path).mean(axis=1)
    T = 60.0 / bpm
    k = np.arange(0, int((until - offset) / T) + 1)
    grid = offset + k * T
    grid = grid[grid < until - 1e-9]
    res = attacks(x, grid)
    devs = np.array([np.nan if t is None else t - g for g, t, _ in res])
    ok = ~np.isnan(devs)
    kk = np.arange(len(grid))[ok]
    tt = np.array([t for _, t, _ in res if t is not None])
    coef = np.polyfit(kk, tt, 1) if ok.sum() > 2 else [T, offset]
    worst = sorted([(round(float(grid[i]), 3), round(1000 * float(devs[i]), 2)) for i in np.where(ok)[0]],
                   key=lambda r: -abs(r[1]))[:10]
    return {
        "file": str(path), "bpm_grid": bpm, "offset": offset, "until": until,
        "beats": int(len(grid)), "with_attack": int(ok.sum()),
        "mean_abs_ms": round(1000 * float(np.nanmean(np.abs(devs))), 2),
        "max_abs_ms": round(1000 * float(np.nanmax(np.abs(devs))), 2),
        "p95_abs_ms": round(1000 * float(np.nanpercentile(np.abs(devs), 95)), 2),
        "mean_signed_ms": round(1000 * float(np.nanmean(devs)), 2),
        "fit_bpm": round(60.0 / float(coef[0]), 4),
        "fit_first_beat_s": round(float(coef[1]), 5),
        "worst": worst,
        "per_beat_ms": [None if np.isnan(d) else round(1000 * float(d), 2) for d in devs],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--bpm", type=float, default=120.0)
    ap.add_argument("--offset", type=float, default=0.0)
    ap.add_argument("--until", type=float, default=76.0)
    ap.add_argument("--json", default=None)
    a = ap.parse_args()
    r = run(a.file, a.bpm, a.offset, a.until)
    if a.json:
        Path(a.json).write_text(json.dumps(r, indent=1))
    print(json.dumps({k: v for k, v in r.items() if k != "per_beat_ms"}, indent=1))


if __name__ == "__main__":
    main()

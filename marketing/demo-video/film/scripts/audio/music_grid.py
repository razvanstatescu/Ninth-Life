"""Beat-grid stability of a music file by kick cross-correlation (and a calibrated onset check).

Usage (from film/): .venv/bin/python scripts/audio/music_grid.py <file.wav> [--bpm 120] [--offset 0]
                    [--until 76] [--json out.json]

Primary measure (kicks): the first kick of the file (40 ms from its attack) is the template. At every grid
point g = offset + k*60/bpm before --until, the normalized cross-correlation of the template with the music is
computed for lags of -30..+30 ms; where its peak is >= 0.6 a kick is present and the lag of the peak is the
deviation of that beat from the grid (sample precision, 0.02 ms).

Secondary measure (all beats, including hats and rims where there is no kick): onset-envelope peaks
(librosa, percussive part) within +-60 ms of each grid point, minus the detector's own lag measured on the
first kick.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import librosa
from scipy.signal import find_peaks

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, SR  # noqa: E402

HOP = 120


def first_attack(x, thr_rel=0.25):
    m = np.abs(x)
    pk = np.max(m[: int(2.0 * SR)])
    idx = np.nonzero(m > thr_rel * pk)[0]
    return int(idx[0]) if idx.size else 0


def xcorr_devs(x, grid, tpl_start, tpl_len_s=0.040, max_lag_s=0.030, min_ncc=0.6, tpl_src=None):
    L = int(tpl_len_s * SR)
    src = x if tpl_src is None else tpl_src
    tpl = src[tpl_start:tpl_start + L].copy()
    tpl -= tpl.mean()
    tn = np.linalg.norm(tpl) + 1e-12
    ml = int(max_lag_s * SR)
    out = []
    for g in grid:
        c = int(round(g * SR))
        a, b = c - ml, c + ml + L
        if a < 0:
            a_pad = -a
            seg = np.concatenate([np.zeros(a_pad), x[0:b]])
        else:
            seg = x[a:b]
        if len(seg) < 2 * ml + L:
            out.append((g, None, 0.0))
            continue
        # correlation for each lag
        corr = np.correlate(seg, tpl, mode="valid")  # len 2*ml+1
        # windowed energy for normalization
        cs = np.concatenate([[0.0], np.cumsum(seg ** 2)])
        en = np.sqrt(cs[L:] - cs[:-L])[: len(corr)] + 1e-12
        ncc = corr / (en * tn)
        i = int(np.argmax(ncc))
        if ncc[i] >= min_ncc:
            # parabolic refinement
            if 0 < i < len(ncc) - 1:
                y0, y1, y2 = ncc[i - 1], ncc[i], ncc[i + 1]
                d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2) if (y0 - 2 * y1 + y2) != 0 else 0.0
            else:
                d = 0.0
            lag = (i + d - ml) / SR
            out.append((g, lag, float(ncc[i])))
        else:
            out.append((g, None, float(ncc[i])))
    return out


def onset_devs(x, grid, first_attack_s):
    perc = librosa.effects.percussive(x.astype(np.float32), margin=2.0)
    env = librosa.onset.onset_strength(y=perc, sr=SR, hop_length=HOP, n_fft=2048, lag=1, max_size=3)
    env = env / (np.percentile(env, 99.5) + 1e-9)
    pk, _ = find_peaks(env, height=0.08, distance=int(0.05 * SR / HOP))
    t = []
    for p in pk:
        if 0 < p < len(env) - 1:
            a, b, c = env[p - 1], env[p], env[p + 1]
            d = 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) != 0 else 0.0
            t.append((p + d) * HOP / SR)
    t = np.array(t)
    # detector lag on the first kick
    j = int(np.argmin(np.abs(t - first_attack_s)))
    lag = float(t[j] - first_attack_s) if abs(t[j] - first_attack_s) < 0.03 else 0.0
    out = []
    for g in grid:
        k = np.searchsorted(t, g + lag)
        c = [t[i] for i in (k - 1, k) if 0 <= i < len(t) and abs(t[i] - lag - g) <= 0.06]
        out.append(None if not c else min(c, key=lambda v: abs(v - lag - g)) - lag - g)
    return out, lag


def summarize(devs):
    d = np.array([v for v in devs if v is not None])
    if not d.size:
        return {"n": 0}
    return {"n": int(d.size), "mean_abs_ms": round(1000 * float(np.mean(np.abs(d))), 2),
            "max_abs_ms": round(1000 * float(np.max(np.abs(d))), 2),
            "p95_abs_ms": round(1000 * float(np.percentile(np.abs(d), 95)), 2),
            "mean_signed_ms": round(1000 * float(np.mean(d)), 2)}


def run(path, bpm=120.0, offset=0.0, until=76.0, segments=None):
    """segments: list of (start_s, template_file) - beats from start_s on are matched against the first kick
    of template_file (whose attack time is measured there, after silence). Default: one segment, this file."""
    x = read(path).mean(axis=1)
    T = 60.0 / bpm
    grid = offset + np.arange(0, int((until - offset) / T) + 1) * T
    grid = grid[(grid >= 0) & (grid < until - 1e-9)]
    fa = first_attack(x)
    segs = segments or [(0.0, None)]
    kick_abs = [None] * len(grid)
    xs_all = [None] * len(grid)
    for si, (s0, tfile) in enumerate(segs):
        s1 = segs[si + 1][0] if si + 1 < len(segs) else 1e9
        idx = [i for i, g in enumerate(grid) if s0 - 1e-9 <= g < s1 - 1e-9]
        if not idx:
            continue
        src = x if tfile is None else read(tfile).mean(axis=1)
        tfa = first_attack(src)
        # the template's attack sits at tfa in its source; a lag of 0 means the beat's attack is at g + (tfa/SR
        # minus the grid point of that first kick, which is 0 in every take)
        res = xcorr_devs(x, grid[idx], tfa, tpl_src=src)
        for j, (g, lag, ncc) in zip(idx, res):
            xs_all[j] = (g, lag, ncc)
            kick_abs[j] = None if lag is None else lag + tfa / SR
    on_raw, _ = onset_devs(x, grid, fa / SR)
    # detector lag calibrated on beats that have both a kick match and an onset
    pairs = [(o - k) for o, k in zip(on_raw, kick_abs) if o is not None and k is not None]
    det_lag = float(np.median(pairs)) if pairs else 0.0
    on = [None if o is None else o - det_lag for o in on_raw]
    # fit tempo through kick attacks
    kk = np.array([i for i, v in enumerate(kick_abs) if v is not None])
    tt = np.array([grid[i] + kick_abs[i] for i in kk])
    fit = np.polyfit(kk, tt, 1) if len(kk) > 2 else [T, grid[0]]
    worst = sorted([(round(float(grid[i]), 2), round(1000 * kick_abs[i], 2)) for i in kk],
                   key=lambda r: -abs(r[1]))[:6]
    gaps = [round(float(grid[i]), 2) for i, v in enumerate(kick_abs) if v is None]
    return {
        "file": str(path), "grid_bpm": bpm, "grid_offset_s": offset, "until_s": until, "beats": int(len(grid)),
        "first_attack_s": round(fa / SR, 5),
        "kick_xcorr": {**summarize(kick_abs), "fit_bpm": round(60 / float(fit[0]), 4),
                        "fit_first_beat_s": round(float(fit[1]), 5), "worst": worst,
                        "beats_without_kick": gaps},
        "onset_calibrated": {**summarize(on), "detector_lag_ms": round(1000 * det_lag, 2)},
        "per_beat_kick_ms": [None if v is None else round(1000 * v, 2) for v in kick_abs],
        "per_beat_onset_ms": [None if v is None else round(1000 * v, 2) for v in on],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--bpm", type=float, default=120.0)
    ap.add_argument("--offset", type=float, default=0.0)
    ap.add_argument("--until", type=float, default=76.0)
    ap.add_argument("--json", default=None)
    ap.add_argument("--segment", action="append", default=[],
                    help="START:TEMPLATE_FILE - from START s, match kicks against TEMPLATE_FILE's first kick")
    a = ap.parse_args()
    segs = None
    if a.segment:
        segs = []
        for s in a.segment:
            st, f = s.split(":", 1)
            segs.append((float(st), f))
        segs.sort()
    r = run(a.file, a.bpm, a.offset, a.until, segs)
    if a.json:
        Path(a.json).write_text(json.dumps(r, indent=1))
    brief = {k: v for k, v in r.items() if not k.startswith("per_beat")}
    print(json.dumps(brief, indent=1))


if __name__ == "__main__":
    main()

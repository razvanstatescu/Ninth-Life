"""Per-bar arrangement features of a music file, to check the energy curve against the plan.

Usage (from film/): .venv/bin/python scripts/audio/music_sections.py <file.wav> [--offset 0.0] [--json out.json]

Per bar of 2.000 s starting at --offset: total RMS, band RMS (sub <90 Hz, low 90-250, mid 250-2k, high >4k, in
dBFS), spectral centroid (Hz), kick strength (mean low-band onset on the beats), hats (high-band onset density),
and the plan's expectation for the section.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfiltfilt

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, SR, db  # noqa: E402

PLAN = [  # (first bar, last bar, name, expectation)
    (1, 5, "build", "starts almost empty, rising"),
    (6, 8, "drop", "loud, full"),
    (9, 11, "breakdown", "quieter: hats and rims, long bass"),
    (12, 17, "groove", "full"),
    (18, 22, "groove-b", "full, 1 s drum gap near end"),
    (23, 26, "peak", "fullest"),
    (27, 31, "groove-c", "full, 2 s half time near end"),
    (32, 34, "lift", "brighter, wider"),
    (35, 38, "strip", "soft pad + bass"),
    (39, 43, "chord", "held chord fading, no rhythm"),
]


def band(x, lo, hi):
    if lo is None:
        sos = butter(4, hi, btype="low", fs=SR, output="sos")
    elif hi is None:
        sos = butter(4, lo, btype="high", fs=SR, output="sos")
    else:
        sos = butter(4, [lo, hi], btype="band", fs=SR, output="sos")
    return sosfiltfilt(sos, x)


def onset_series(x, hop=240):
    """Half-wave rectified first difference of the 5 ms RMS envelope (log)."""
    n = len(x) // hop
    e = np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    le = 20 * np.log10(e)
    d = np.diff(le, prepend=le[0])
    return np.maximum(d, 0), hop


def width_db(st):
    """Side/mid ratio in dB (stereo width)."""
    m = 0.5 * (st[:, 0] + st[:, 1])
    s = 0.5 * (st[:, 0] - st[:, 1])
    return db(np.sqrt(np.mean(s ** 2)) + 1e-12) - db(np.sqrt(np.mean(m ** 2)) + 1e-12)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--offset", type=float, default=0.0)
    ap.add_argument("--json", default=None)
    a = ap.parse_args()
    st = read(a.file)
    x = st.mean(axis=1)
    sub, low, mid, high = band(x, None, 90), band(x, 90, 250), band(x, 250, 2000), band(x, 4000, None)
    kick_on, hop = onset_series(band(x, 40, 120))
    hat_on, _ = onset_series(high)
    rows = []
    nbars = int((len(x) / SR - a.offset) // 2)
    for b in range(nbars):
        t0 = a.offset + 2 * b
        i0, i1 = int(t0 * SR), int((t0 + 2) * SR)
        seg = x[i0:i1]
        spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))
        f = np.fft.rfftfreq(len(seg), 1 / SR)
        cen = float(np.sum(f * spec) / (np.sum(spec) + 1e-12))
        # kick strength: max low-band onset within +-20 ms of each beat
        ks = []
        for k in range(4):
            c = int((t0 + 0.5 * k) * SR / hop)
            ks.append(float(np.max(kick_on[max(c - 4, 0):c + 5])) if c < len(kick_on) else 0.0)
        hb = hat_on[int(t0 * SR / hop):int((t0 + 2) * SR / hop)]
        rows.append({
            "bar": b + 1, "t0": round(t0, 2),
            "rms": round(db(np.sqrt(np.mean(seg ** 2))), 1),
            "sub": round(db(np.sqrt(np.mean(sub[i0:i1] ** 2))), 1),
            "low": round(db(np.sqrt(np.mean(low[i0:i1] ** 2))), 1),
            "mid": round(db(np.sqrt(np.mean(mid[i0:i1] ** 2))), 1),
            "high": round(db(np.sqrt(np.mean(high[i0:i1] ** 2))), 1),
            "centroid": round(cen),
            "kick": round(float(np.mean(ks)), 1),
            "hats": int(np.sum(hb > 3.0)),
            "width": round(width_db(st[i0:i1]), 1),
        })
    for (b0, b1, name, exp) in PLAN:
        print(f"-- bars {b0}-{b1} {name}: {exp}")
        for r in rows[b0 - 1:b1]:
            print(f"   {r['bar']:2d} t={r['t0']:5.1f} rms {r['rms']:6.1f} sub {r['sub']:6.1f} low {r['low']:6.1f} "
                  f"mid {r['mid']:6.1f} high {r['high']:6.1f} cen {r['centroid']:5d} kick {r['kick']:5.1f} "
                  f"hats {r['hats']:3d} width {r['width']:6.1f}")
    if a.json:
        Path(a.json).write_text(json.dumps(rows, indent=1))


if __name__ == "__main__":
    main()

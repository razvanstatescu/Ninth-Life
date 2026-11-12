"""K-weighted loudness (ITU-R BS.1770) per window, without gating: a perceptual energy curve.

Usage (from film/): .venv/bin/python scripts/audio/kloudness.py <file.wav> [--win 2.0] [--offset 0]
Prints LUFS-like values (-0.691 + 10 log10 of the K-weighted mean square, summed over channels) per window.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from scipy.signal import lfilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, SR  # noqa: E402

# BS.1770 K-weighting at 48 kHz
B1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]
A1 = [1.0, -1.69065929318241, 0.73248077421585]
B2 = [1.0, -2.0, 1.0]
A2 = [1.0, -1.99004745483398, 0.99007225036621]


def kweight(x):
    return lfilter(B2, A2, lfilter(B1, A1, x, axis=0), axis=0)


def curve(x, win=2.0, offset=0.0):
    y = kweight(x)
    out = []
    n = int(win * SR)
    i = int(offset * SR)
    while i + n <= len(y):
        ms = np.mean(y[i:i + n] ** 2, axis=0).sum()
        out.append(-0.691 + 10 * np.log10(ms + 1e-12))
        i += n
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--win", type=float, default=2.0)
    ap.add_argument("--offset", type=float, default=0.0)
    a = ap.parse_args()
    x = read(a.file)
    c = curve(x, a.win, a.offset)
    print(" ".join(f"{i + 1}:{v:.1f}" for i, v in enumerate(c)))


if __name__ == "__main__":
    main()

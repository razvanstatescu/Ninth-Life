"""Objective measures of speech takes.

Usage (from film/): .venv/bin/python scripts/audio/voice_measure.py <take.wav> [...]

first/last sound: 1 ms peak envelope above max(peak - 40 dB, -60 dBFS) (catches a breathy /h/).
speech_s = last - first. F0 by librosa pyin (60-400 Hz): median (Hz), range p5-p95 in semitones (low = calm, even),
voiced share. Centroid and the share of energy above 4 kHz (hiss, sibilance). Peak and clipped samples.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import librosa

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, SR, db  # noqa: E402


def speech_bounds(m, rel=40.0, floor=-60.0):
    w = int(0.001 * SR)
    n = len(m) // w
    e = 20 * np.log10(np.maximum(np.abs(m[: n * w]).reshape(n, w).max(axis=1), 1e-9))
    thr = max(e.max() - rel, floor)
    i = np.nonzero(e > thr)[0]
    if not i.size:
        return 0.0, 0.0
    return i[0] * 0.001, (i[-1] + 1) * 0.001


def measure(path):
    x = read(path)
    m = x.mean(axis=1)
    first, last = speech_bounds(m)
    seg = m[int(first * SR):int(last * SR)]
    y = librosa.resample(seg.astype(np.float32), orig_sr=SR, target_sr=16000)
    f0, vflag, vprob = librosa.pyin(y, fmin=60, fmax=400, sr=16000, frame_length=1024, hop_length=160)
    v = f0[~np.isnan(f0)]
    st = 12 * np.log2(v / np.median(v)) if v.size else np.array([0.0])
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2 if len(seg) > 64 else np.ones(4)
    f = np.fft.rfftfreq(len(seg), 1 / SR) if len(seg) > 64 else np.linspace(0, SR / 2, 4)
    return {
        "file": str(path), "dur": round(len(m) / SR, 3), "first_s": round(first, 3), "last_s": round(last, 3),
        "speech_s": round(last - first, 3), "peak_dbfs": round(db(np.max(np.abs(x))), 2),
        "clipped": int(np.sum(np.abs(x) >= 0.9999)),
        "f0_median_hz": round(float(np.median(v)), 1) if v.size else None,
        "f0_range_st": round(float(np.percentile(st, 95) - np.percentile(st, 5)), 2) if v.size else None,
        "f0_end_drop_st": round(float(np.mean(st[-5:]) - np.mean(st[:5])), 2) if v.size > 10 else None,
        "voiced_share": round(float(np.mean(~np.isnan(f0))), 2),
        "centroid_hz": int(np.sum(f * sp) / np.sum(sp)), "hf_share": round(float(sp[f > 4000].sum() / sp.sum()), 3),
    }


if __name__ == "__main__":
    for p in sys.argv[1:]:
        print(json.dumps(measure(p)))

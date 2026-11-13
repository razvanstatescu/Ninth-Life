"""Key and tuning of a music file (does it sit with the A minor pentatonic key tones at A = 440 Hz?).

Usage (from film/): .venv/bin/python scripts/audio/music_key.py <file.wav> [--from 0 --to 86]

- Tuning: librosa.estimate_tuning over the harmonic part (fraction of a semitone from A = 440; 0.1 = 10 cents).
- Key: chroma (CQT) of the harmonic part, correlated with the Krumhansl-Kessler major and minor profiles.
- Per-bar chroma: the three strongest pitch classes in each 2 s bar.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import librosa

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, SR  # noqa: E402

NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def key_scores(chroma_mean):
    out = []
    for i in range(12):
        out.append((float(np.corrcoef(chroma_mean, np.roll(MAJOR, i))[0, 1]), f"{NAMES[i]} major"))
        out.append((float(np.corrcoef(chroma_mean, np.roll(MINOR, i))[0, 1]), f"{NAMES[i]} minor"))
    return sorted(out, reverse=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--from", dest="t0", type=float, default=0.0)
    ap.add_argument("--to", dest="t1", type=float, default=None)
    a = ap.parse_args()
    x = read(a.file).mean(axis=1)
    t1 = a.t1 or len(x) / SR
    seg = x[int(a.t0 * SR):int(t1 * SR)].astype(np.float32)
    y = librosa.resample(seg, orig_sr=SR, target_sr=22050)
    h = librosa.effects.harmonic(y, margin=3.0)
    tuning = float(librosa.estimate_tuning(y=h, sr=22050, n_fft=4096))
    chroma = librosa.feature.chroma_cqt(y=h, sr=22050, hop_length=512, tuning=tuning, bins_per_octave=36)
    cm = chroma.mean(axis=1)
    ks = key_scores(cm)
    fr = 22050 / 512
    bars = []
    for b in range(int((t1 - a.t0) // 2)):
        c = chroma[:, int(b * 2 * fr):int((b + 1) * 2 * fr)].mean(axis=1)
        top = np.argsort(c)[::-1][:3]
        bars.append(f"{int(a.t0 // 2) + b + 1}:{'/'.join(NAMES[i] for i in top)}")
    print(json.dumps({
        "tuning_semitones_from_A440": round(tuning, 3),
        "tuning_cents": round(100 * tuning, 1),
        "key_best": ks[:4],
        "chroma_mean": {NAMES[i]: round(float(cm[i]), 3) for i in range(12)},
    }, indent=1))
    print("top pitch classes per bar:", " ".join(bars))


if __name__ == "__main__":
    main()

"""Conform the chosen music take(s) into public/audio/music/act2.wav (and optional stems).

Usage (from film/):
  .venv/bin/python scripts/audio/music_conform.py [--build t1] [--main t3] [--splice 10.0] [--xfade-ms 10]
        [--lift-db 10 --lift-from 72.0 --lift-to 75.5] [--fade-out 0.5] [--out public/audio/music/act2.wav]
        [--build-file F --main-file F]   (to conform stems with the identical edit)

Steps (all sample-exact at 48 kHz):
1. Tempo: both takes were measured at 120.000 BPM within 0.01% (kick cross-correlation, music_grid.py), under
   the 0.1% threshold, so no time-stretch is applied. The script refuses if --stretch is passed without need.
2. Shift: the first kick's attack is at sample 0 in both takes, so bar 1 beat 1 is already at t = 0.000.
3. Splice: bars 1-5 (0 to --splice s) from the build take, the rest from the main take. Equal-power crossfade
   of --xfade-ms that ENDS exactly at the splice point (the main take's downbeat is untouched). The film mutes
   bar 5 (8 to 10 s) for the first spoken line, so the splice point sits inside the film's own silence.
4. Lift: from --lift-from to --lift-to the gain rises (raised cosine) from 0 dB to --lift-db and stays there to the
   end. The film mutes bars 37-38 (72 to 76 s), so the ramp is never heard; it brings the final chord (bars 39-43)
   to a usable level, because a Remotion <Audio> volume cannot exceed 1.
5. Length exactly 86.000 s (4,128,000 samples), fade-out of --fade-out s at the end, 24-bit PCM stereo.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, write, SR, FILM, db, peak  # noqa: E402

LEN = 86 * SR


def conform(build: np.ndarray | None, main: np.ndarray, splice: float, xfade_ms: float, lift_db: float,
            lift_from: float, lift_to: float, fade_out: float) -> np.ndarray:
    def fit(x):
        x = x[:LEN]
        if len(x) < LEN:
            x = np.concatenate([x, np.zeros((LEN - len(x), x.shape[1]))])
        return x

    main = fit(main)
    if build is not None:
        build = fit(build)
        n = int(round(splice * SR))
        m = int(round(xfade_ms / 1000 * SR))
        out = main.copy()
        out[: n - m] = build[: n - m]
        t = (np.arange(m) + 0.5) / m
        g_out = np.cos(0.5 * np.pi * t)[:, None]
        g_in = np.sin(0.5 * np.pi * t)[:, None]
        out[n - m:n] = build[n - m:n] * g_out + main[n - m:n] * g_in
    else:
        out = main.copy()
    if lift_db:
        a, b = int(lift_from * SR), int(lift_to * SR)
        g = np.ones(LEN)
        ramp = 0.5 - 0.5 * np.cos(np.pi * np.arange(b - a) / (b - a))
        G = 10 ** (lift_db / 20)
        g[a:b] = 1 + (G - 1) * ramp
        g[b:] = G
        out = out * g[:, None]
    if fade_out:
        m = int(fade_out * SR)
        r = np.cos(0.5 * np.pi * np.arange(m) / (m - 1)) ** 2
        out[-m:] *= r[:, None]
    # 2 ms fade in: the first kick starts on sample 0, so the file would otherwise start on a non-zero sample
    m = int(0.002 * SR)
    out[:m] *= np.sin(0.5 * np.pi * np.arange(m) / m)[:, None]
    out[-1] = 0.0
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", default="t1")
    ap.add_argument("--main", default="t3")
    ap.add_argument("--build-file", default=None)
    ap.add_argument("--main-file", default=None)
    ap.add_argument("--no-splice", action="store_true")
    ap.add_argument("--splice", type=float, default=10.0)
    ap.add_argument("--xfade-ms", type=float, default=10.0)
    ap.add_argument("--lift-db", type=float, default=10.0)
    ap.add_argument("--lift-from", type=float, default=72.0)
    ap.add_argument("--lift-to", type=float, default=75.5)
    ap.add_argument("--fade-out", type=float, default=0.5)
    ap.add_argument("--out", default=str(FILM / "public/audio/music/act2.wav"))
    a = ap.parse_args()
    takes = FILM / "_takes/audio/music"
    main_x = read(a.main_file or takes / f"act2-{a.main}.wav")
    build_x = None if a.no_splice else read(a.build_file or takes / f"act2-{a.build}.wav")
    y = conform(build_x, main_x, a.splice, a.xfade_ms, a.lift_db, a.lift_from, a.lift_to, a.fade_out)
    p = peak(y)
    if p >= 0.999:
        raise SystemExit(f"would clip: peak {db(p):.2f} dBFS")
    write(a.out, y)
    print(f"wrote {a.out}: {len(y)} samples ({len(y) / SR:.3f} s), peak {db(p):.2f} dBFS, "
          f"peak after {a.lift_from}s {db(peak(y[int(a.lift_from * SR):])):.2f} dBFS")


if __name__ == "__main__":
    main()

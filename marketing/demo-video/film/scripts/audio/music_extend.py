"""Build the third cut's Act 2 music (act2-v3*, 55 bars = 110 s) from the second cut's bars (act2-v2*, 45 bars).

Run (from film/): .venv/bin/python -I -B scripts/audio/music_extend.py

The track is 120 BPM on a fixed grid (bar 1 beat 1 at 0 s, 2 s a bar), so whole bars can be repeated. BAR_MAP lists,
for each output bar, the v2 bar it plays. Where an output bar does not follow on from the one before (a splice), the
new bar fades in over the 20 ms before its bar line (its own lead-in from v2) while what v2 played after the earlier
bar fades out over 20 ms before to 60 ms after the line, so tails are not cut dead and the new downbeat is clean.
The same map is applied to the full mix and to both stems, so drums + other still sum to the full track.

Choices (scored by spectral and pitch-class continuity at each join; see 08-revision-v3.md, "Music"):
  - bars 33-37, the conversation reel: v2 bars 19-23 (the solution groove, already moving at the hard cut, then its
    breath and lift into access);
  - bars 38-39, access: v2 bars 33-34, as before;
  - bars 40-46, the Kiro chapter: v2 bars 35-36 (the lift), 33-34 (the access groove), 35, 35-36 (the lift again).
Writes public/audio/music/act2-v3-drive.wav, act2-v3-drive-drums.wav, act2-v3-other.wav (48 kHz, 24-bit, stereo)
and prints the peak of each.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import soundfile as sf

FILM = Path(__file__).resolve().parents[2]
MUSIC = FILM / "public/audio/music"
SR = 48000
BAR = 2 * SR

BAR_MAP = (
    list(range(1, 33))            # 1-32: as in v2
    + [19, 20, 21, 22, 23]        # 33-37: the conversation reel
    + [33, 34]                    # 38-39: access
    + [35, 36, 33, 34, 35, 35, 36]  # 40-46: the Kiro chapter
    + list(range(37, 46))         # 47-55: strip-back, I have something to say, the end
)
assert len(BAR_MAP) == 55, len(BAR_MAP)

PRE = int(0.030 * SR)   # the crossfade before each spliced bar line

FILES = {
    "act2-v2-drive.wav": "act2-v3-drive.wav",
    "act2-v2-drive-drums.wav": "act2-v3-drive-drums.wav",
    "act2-v2-other.wav": "act2-v3-other.wav",
}


def src_at(x: np.ndarray, start: int, n: int) -> np.ndarray:
    """n samples of x from `start`, zero-padded outside the file."""
    out = np.zeros((n, x.shape[1]), dtype=np.float64)
    a, b = max(0, start), min(len(x), start + n)
    if b > a:
        out[a - start : b - start] = x[a:b]
    return out


def build(x: np.ndarray) -> np.ndarray:
    out = np.zeros((len(BAR_MAP) * BAR, x.shape[1]), dtype=np.float64)
    fade_in = np.sin(np.linspace(0, np.pi / 2, PRE)) ** 2
    for i, src in enumerate(BAR_MAP):
        o = i * BAR
        s = (src - 1) * BAR
        out[o : o + BAR] = src_at(x, s, BAR)
        if i == 0 or BAR_MAP[i - 1] + 1 == src:
            continue
        # A splice: over the last PRE samples of the earlier bar, crossfade (equal power) from its own end to the new
        # bar's lead-in from v2. What v2 played after the earlier bar is not used: it starts with that bar's
        # successor's downbeat, which would double the new one.
        out[o - PRE : o] = out[o - PRE : o] * (1 - fade_in[:, None]) + src_at(x, s - PRE, PRE) * fade_in[:, None]
    return out


def main():
    for src, dst in FILES.items():
        x, sr = sf.read(MUSIC / src, always_2d=True)
        assert sr == SR, (src, sr)
        y = build(x)
        peak = float(np.abs(y).max())
        info = sf.info(MUSIC / src)
        sf.write(MUSIC / dst, y.astype(np.float32), SR, subtype=info.subtype)
        print(f"{dst}: {len(y) / SR:.1f} s, peak {20 * np.log10(peak + 1e-12):.2f} dBFS (v2 {20 * np.log10(np.abs(x).max()):.2f})")


if __name__ == "__main__":
    main()

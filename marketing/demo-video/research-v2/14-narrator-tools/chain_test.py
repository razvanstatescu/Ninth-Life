"""Try a narrator processing chain with ffmpeg and measure what it does (research-v2/14, section 4.3).

Run (isolated): film/.venv/bin/python -I chain_test.py <takesDir> <label/variant/line-takeN> [...]
Writes <takesDir>/chain-test/<label>-<variant>-<take>.wav (mono, 48 kHz, 24-bit, -19 LUFS) and prints, before and
after: integrated loudness, true peak, peak-to-loudness ratio (true peak minus loudness), and the share of energy
at 1-4 kHz. The chain is a starting point to be judged by ear, not a final setting.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from measure import read, SR, speech_bounds, loudness  # noqa: E402

TARGET = -19.0  # mono file; plays at about -16 LUFS in the stereo render (both channels)
# Stage 1 runs AFTER a plain gain that brings the raw take to TARGET (so its thresholds are relative to -19 LUFS).
# Stage 2 re-levels to TARGET and then limits; the limiter must be last, or a later gain undoes it.
# (A first try with the compressor at -24 dB took 8 dB off peaks and vowels alike: same peak-to-loudness ratio.)
CHAIN = ",".join([
    "highpass=f=80:poles=2",                                                    # rumble, plosive thump
    "acompressor=threshold=-16dB:ratio=2:attack=10:release=120:knee=6:makeup=1",  # 1-3 dB on loud syllables only
    "equalizer=f=3000:t=q:w=1.0:g=2",                                          # presence for small speakers
    "deesser=i=0.4:m=0.5:f=0.5:s=o",                                           # tame 5-8 kHz if the lift made it sharp
])
LIMIT = ",".join([
    "aresample=192000",                                                       # 4x oversampling so the limiter sees true peaks
    "alimiter=limit=0.473:attack=1:release=60:level=disabled",                # -6.5 dBFS at 192 kHz, about -6.5 dBTP
    "aresample=48000",
])


def presence(x):
    a, b = speech_bounds(x)
    seg = x[int(a * SR):int(b * SR)]
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
    f = np.fft.rfftfreq(len(seg), 1 / SR)
    return float(sp[(f >= 1000) & (f < 4000)].sum() / sp.sum())


def run(cmd):
    subprocess.run(cmd, check=True, capture_output=True)


def main():
    takes = Path(sys.argv[1])
    out = takes / "chain-test"
    out.mkdir(exist_ok=True)
    print(f"chain: gain to {TARGET} LUFS, {CHAIN}, gain to {TARGET} LUFS, {LIMIT}\n")
    print(f"{'take':30s} {'LUFS':>6s} {'TP':>6s} {'PLR':>5s} {'1-4k':>6s} -> {'LUFS':>6s} {'TP':>6s} {'PLR':>5s} {'1-4k':>6s}")
    for spec in sys.argv[2:]:
        src = takes / f"{spec}.wav"
        L0 = loudness(src)
        p0 = presence(read(src).mean(axis=1))
        stem = spec.replace("/", "-")
        tmp = out / f".{stem}.tmp.wav"
        pre = TARGET - L0["lufs"]
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src), "-af", f"volume={pre:.2f}dB," + CHAIN, "-ac", "1",
             "-c:a", "pcm_f32le", str(tmp)])
        L1 = loudness(tmp)["lufs"]
        gain = TARGET - L1
        dst = out / f"{stem}.wav"
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(tmp), "-af", f"volume={gain:.2f}dB," + LIMIT,
             "-c:a", "pcm_s24le", str(dst)])
        tmp.unlink()
        L2 = loudness(dst)
        p2 = presence(read(dst).mean(axis=1))
        print(f"{spec:30s} {L0['lufs']:6.1f} {L0['true_peak_dbtp']:6.1f} {L0['true_peak_dbtp'] - L0['lufs']:5.1f} {p0:6.3f} -> "
              f"{L2['lufs']:6.1f} {L2['true_peak_dbtp']:6.1f} {L2['true_peak_dbtp'] - L2['lufs']:5.1f} {p2:6.3f}")


if __name__ == "__main__":
    main()

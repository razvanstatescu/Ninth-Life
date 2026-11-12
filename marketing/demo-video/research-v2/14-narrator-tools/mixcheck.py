"""How deep must the Act 2 music duck under the narrator? A band-by-band check with the film's real music.

Run (isolated): film/.venv/bin/python -I mixcheck.py <narrator.wav> <film/public/audio/music>
Everything is measured as it plays in the stereo render: the mono narrator line is copied to both channels and set
to -16 LUFS (BS.1770 sums the two channels, so the mono file itself sits about 3 dB lower, near -19 LUFS). Music:
act2.wav and act2-other.wav (no drums), stereo, bars 13-19 (main groove, 24-38 s of the file) at the film's base
volume 0.85, then ducked by D dB, optionally with a -3 dB bell at 2.5 kHz (Q 1.0).
Per octave band (250 Hz-8 kHz): speech level minus music level (long-term power summed over both channels), and an approximate Speech
Intelligibility Index: sum of band importance x clamp((SNR + 15) / 30, 0, 1) with octave-band importance weights
0.0617, 0.1671, 0.2373, 0.2648, 0.2142, 0.0549 (the example weights in the R SII package's documentation of
ANSI S3.5-1997). SII was built for steady noise, not music, so read the numbers as a relative guide only.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt, lfilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from measure import read, SR, speech_bounds, loudness  # noqa: E402
import soundfile as sf  # noqa: E402

BANDS = [250, 500, 1000, 2000, 4000, 8000]
W = np.array([0.0617, 0.1671, 0.2373, 0.2648, 0.2142, 0.0549])


def band_levels(x):
    """x: (n, 2). Band power summed over the channels, in dB."""
    out = []
    for fc in BANDS:
        lo, hi = fc / np.sqrt(2), min(fc * np.sqrt(2), SR / 2 - 100)
        sos = butter(4, [lo, hi], btype="bandpass", fs=SR, output="sos")
        y = sosfilt(sos, x, axis=0)
        out.append(10 * np.log10(np.sum(np.mean(y ** 2, axis=0)) + 1e-20))
    return np.array(out)


def peaking(x, f0=2500.0, gain_db=-3.0, q=1.0):
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    alpha = np.sin(w0) / (2 * q)
    b = [1 + alpha * A, -2 * np.cos(w0), 1 - alpha * A]
    a = [1 + alpha / A, -2 * np.cos(w0), 1 - alpha / A]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)


TMP = None  # set in main(): next to the narrator take (inside _takes/narrator-tests)


def lufs_of(x):
    tmp = TMP
    sf.write(str(tmp), x, SR, subtype="FLOAT")
    v = loudness(tmp)["lufs"]
    tmp.unlink()
    return v


def main():
    global TMP
    TMP = Path(sys.argv[1]).parent / ".mixcheck-lufs.wav"
    mono = read(sys.argv[1]).mean(axis=1)
    a, b = speech_bounds(mono)
    mono = mono[int(a * SR):int(b * SR)]
    voice = np.stack([mono, mono], axis=1)
    g = 10 ** ((-16.0 - lufs_of(voice)) / 20)
    voice *= g
    print(f"mono file level for this: {lufs_of(mono * g):.1f} LUFS")
    music_dir = Path(sys.argv[2])
    print(f"narrator: {Path(sys.argv[1]).name}, speech {len(voice)/SR:.2f} s at -16.0 LUFS")
    for name in ("act2.wav", "act2-other.wav"):
        m = read(music_dir / name)[int(24 * SR):int(38 * SR)] * 0.85
        L0 = lufs_of(m)
        sp = band_levels(voice)
        print(f"\n{name} bars 13-19 at volume 0.85: {L0:.1f} LUFS (narrator - music = {-16.0 - L0:+.1f} LU before ducking)")
        print("  duck  EQ     music LUFS  LD(LU)  SNR per octave band 250/500/1k/2k/4k/8k (dB)          ~SII")
        for duck in (0, 6, 9, 12, 15, 18):
            for eq in (False, True):
                mm = m * 10 ** (-duck / 20)
                if eq:
                    mm = peaking(mm)
                snr = sp - band_levels(mm)
                sii = float(np.sum(W * np.clip((snr + 15) / 30, 0, 1)))
                Lm = lufs_of(mm)
                print(f"  {duck:3d}  {'-3@2.5k' if eq else 'none   '}  {Lm:7.1f}   {-16.0 - Lm:5.1f}   " + " ".join(f"{v:+6.1f}" for v in snr) + f"   {sii:.2f}")
    # stems ducked separately: drums by Dd dB, the rest by Do dB
    dr = read(music_dir / "act2-drums.wav")[int(24 * SR):int(38 * SR)] * 0.85
    ot = read(music_dir / "act2-other.wav")[int(24 * SR):int(38 * SR)] * 0.85
    sp = band_levels(voice)
    print("\nstems ducked separately (drums dB / rest dB):  music LUFS  LD(LU)  SNR 250/500/1k/2k/4k/8k  ~SII")
    for dd, do in ((6, 6), (9, 6), (12, 6), (12, 9), (15, 9), (18, 9), (18, 11), (18, 12), (99, 6), (99, 9), (99, 10), (99, 11)):
        mm = dr * 10 ** (-dd / 20) + ot * 10 ** (-do / 20)
        snr = sp - band_levels(mm)
        sii = float(np.sum(W * np.clip((snr + 15) / 30, 0, 1)))
        Lm = lufs_of(mm)
        print(f"  {'mute' if dd == 99 else dd:>4} / {do:<2}                                {Lm:7.1f}   {-16.0 - Lm:5.1f}   " + " ".join(f"{v:+6.1f}" for v in snr) + f"   {sii:.2f}")


if __name__ == "__main__":
    main()

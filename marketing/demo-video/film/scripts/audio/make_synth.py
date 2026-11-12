"""Synthesize the ambience loops and the two synthesized one-shots (no generation).

Run from film/: .venv/bin/python scripts/audio/make_synth.py

amb/hum.wav    10 s loop. ffmpeg aevalsrc: 55 Hz + 110 Hz (the note A) with weak overtones (165-550 Hz), a very
               slight wobble (amplitude LFOs at 0.3 and 0.7 Hz, +-1.6 cent pitch drift at 0.2 Hz).
amb/hiss.wav   10 s loop. Spectral synthesis (numpy): noise with random phases over exactly 10 s, so the
               loop is circular; shaped like a small muffled speaker (highpass 250 Hz, lowpass 4.5 kHz 4th order,
               +3 dB at 2.4 kHz), with a slow +-0.6 dB breathing. Nearly mono (a television is one speaker).
amb/room.wav   10 s loop. Spectral synthesis: very low, dark room air (1/f^1.3 from 25 Hz, rolled off above
               3 kHz), two independent channels.
amb/drone.wav  30 s loop. Additive synthesis on A1 (55 Hz): 24 harmonics of a soft saw through a slowly
               moving low-pass (cutoff 140-420 Hz, one cycle per 30 s), each partial doubled +-1/30 Hz
               (slow beating), a weak fifth (E, 165 Hz) and a dark filtered-noise layer that swells twice per loop.
               No rhythm.
sfx/rise.wav   0.5 s. Sine gliding exponentially from 55 to 110 Hz, with weak 2nd and 3rd harmonics so it is
               heard on small speakers; swells in over 0.35 s; 8 ms fade out.
sfx/chord-tail.wav 3 s. One soft warm synth note on E5 (659.25 Hz): partials 1-4 with long decays, two voices
               +-2 cents, 5 ms attack, a small hall (RT60 1.4 s) at -12 dB, fading to zero at 3.0 s.
Every loop has whole numbers of cycles of every component over its length, so it loops sample-exactly.
All files: 48 kHz, 24-bit, stereo, peak -3 dBFS.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.signal import fftconvolve

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import SR, FILM, write, normalize_peak, fade  # noqa: E402

AMB = FILM / "public/audio/amb"
SFX = FILM / "public/audio/sfx"
LOG: dict = {}


def ffmpeg_expr(exprs: str, dur: float, channels: int) -> np.ndarray:
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i",
           f"aevalsrc=exprs='{exprs}':s={SR}:d={dur}", "-f", "f32le", "-acodec", "pcm_f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64).reshape(-1, channels)
    return x[: int(round(dur * SR))]


# ---------------------------------------------------------------- hum
def hum() -> np.ndarray:
    parts = [(1, 1.0), (2, 0.8), (3, 0.12), (4, 0.10), (5, 0.05), (6, 0.05), (8, 0.025), (10, 0.015)]
    def ch(phase_off: float) -> str:
        am = f"(1+0.04*sin(2*PI*0.3*t+{phase_off})+0.02*sin(2*PI*0.7*t+{1.3 + phase_off}))"
        terms = [f"{a}*sin(2*PI*{55 * h}*t+{0.25 * h}*sin(2*PI*0.2*t))" for h, a in parts]
        return f"0.3*{am}*({'+'.join(terms)})"
    exprs = ch(0.0) + "|" + ch(0.5)
    LOG["amb/hum.wav"] = {"command": f"ffmpeg -f lavfi -i \"aevalsrc=exprs='{exprs}':s=48000:d=10\"",
                          "components": parts}
    return ffmpeg_expr(exprs, 10.0, 2)


# ---------------------------------------------------------------- spectral noise helpers
def spectral_noise(n: int, mag_fn, rng, channels=2, corr=0.0) -> np.ndarray:
    f = np.fft.rfftfreq(n, 1 / SR)
    mag = mag_fn(f)
    mag[0] = 0.0
    out = np.zeros((n, channels))
    base = None
    for c in range(channels):
        ph = rng.uniform(0, 2 * np.pi, len(f))
        spec = mag * np.exp(1j * ph)
        if base is None:
            base = spec
        elif corr:
            spec = corr * base + np.sqrt(1 - corr ** 2) * spec
        out[:, c] = np.fft.irfft(spec, n)
    return out


def butter_mag(f, fc, order, kind):
    r = (f / fc) if kind == "low" else (fc / np.maximum(f, 1e-9))
    return 1.0 / np.sqrt(1 + r ** (2 * order))


def peak_eq_mag(f, f0, gain_db, q):
    # smooth bell on a log-frequency axis
    g = 10 ** (gain_db / 20)
    bw = np.log2(f0 * (1 + 1 / (2 * q))) - np.log2(f0 * (1 - 1 / (2 * q)))
    x = (np.log2(np.maximum(f, 1)) - np.log2(f0)) / (bw / 2 + 1e-9)
    return 1 + (g - 1) * np.exp(-0.5 * x ** 2)


def hiss(rng) -> np.ndarray:
    n = 10 * SR
    def mag(f):
        return butter_mag(f, 250, 2, "high") * butter_mag(f, 4500, 4, "low") * peak_eq_mag(f, 2400, 3.0, 1.0)
    x = spectral_noise(n, mag, rng, 2, corr=0.92)
    t = np.arange(n) / SR
    breath = 10 ** ((0.6 * np.sin(2 * np.pi * 0.2 * t) + 0.3 * np.sin(2 * np.pi * 0.5 * t + 2.0)) / 20)
    LOG["amb/hiss.wav"] = {"method": "spectral noise, circular 10 s; HP 250 Hz (2nd), LP 4.5 kHz (4th), +3 dB "
                                     "bell at 2.4 kHz; channel correlation 0.92; +-0.6 dB breathing at 0.2/0.5 Hz",
                           "seed": "numpy default_rng(1009)"}
    return x * breath[:, None]


def room(rng) -> np.ndarray:
    n = 10 * SR
    def mag(f):
        return (np.maximum(f, 25) / 25) ** -0.65 * butter_mag(f, 25, 2, "high") * butter_mag(f, 3000, 2, "low")
    LOG["amb/room.wav"] = {"method": "spectral noise, circular 10 s; 1/f^1.3 power from 25 Hz, HP 25 Hz, "
                                     "LP 3 kHz; two independent channels", "seed": "numpy default_rng(1009)"}
    return spectral_noise(n, mag, rng, 2, corr=0.0)


# ---------------------------------------------------------------- drone
def drone(rng) -> np.ndarray:
    dur = 30.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    f0 = 55.0
    out = np.zeros((n, 2))
    # moving cutoff, one cycle per 30 s (seamless), 140..420 Hz on a log scale
    fc = 140 * 3 ** (0.5 - 0.5 * np.cos(2 * np.pi * t / dur))
    for h in range(1, 25):
        fh = f0 * h
        amp = (1.0 / h) * (1.0 / np.sqrt(1 + (fh / fc) ** 4))  # 2nd-order low-pass magnitude, time-varying
        if h == 1:
            amp = amp * 1.1
        for c, sgn in ((0, 1), (1, -1)):
            for det, g in ((0.0, 0.62), (sgn / dur, 0.27), (-2 * sgn / dur, 0.11)):  # +-1/30, 2/30 Hz beating
                ph = rng.uniform(0, 2 * np.pi)
                out[:, c] += g * amp * np.sin(2 * np.pi * (fh + det) * t + ph)
    # weak fifth (E3 = 3 x 55 = 165 Hz, already harmonic 3) reinforced softly with its own slow swell
    sw = 0.5 - 0.5 * np.cos(2 * np.pi * 2 * t / dur + 1.0)
    for c in range(2):
        out[:, c] += 0.05 * sw * np.sin(2 * np.pi * 165.0 * t + rng.uniform(0, 2 * np.pi))
    # dark noise layer: band 60-300 Hz, swelling twice per loop
    def mag(f):
        return butter_mag(f, 60, 2, "high") * butter_mag(f, 300, 3, "low")
    nz = spectral_noise(n, mag, rng, 2, corr=0.3)
    nz = nz / np.sqrt(np.mean(nz ** 2)) * 0.035
    nz *= (0.6 + 0.4 * np.sin(2 * np.pi * 2 * t / dur + 0.7))[:, None]
    out += nz
    LOG["amb/drone.wav"] = {"method": "additive: 24 harmonics of 55 Hz (soft saw 1/h) through a moving 2nd-order "
                                      "low-pass (140-420 Hz, period 30 s), 3 voices per partial detuned 0, +-1/30, "
                                      "-+2/30 Hz; fifth at 165 Hz swelling twice; noise 60-300 Hz swelling twice",
                            "seed": "numpy default_rng(1009)"}
    return out


# ---------------------------------------------------------------- rise
def rise() -> np.ndarray:
    d = 0.5
    # phase of an exponential glide 55 -> 110 Hz over 0.5 s: f(t) = 55 * 2^(t/d)
    ph = f"2*PI*55*{d}/log(2)*(pow(2,t/{d})-1)"
    # soft attack: starts at -30 dB (so the sound begins at the file start) and swells in over 0.35 s
    env = f"if(lt(t,0.35),0.03+0.97*(0.5-0.5*cos(PI*t/0.35)),1)"
    expr = f"{env}*(sin({ph})+0.25*sin(2*{ph})+0.1*sin(3*{ph}))"
    x = ffmpeg_expr(expr + "|" + expr, d, 2)
    x = fade(x, 0.005, 0.008)
    LOG["sfx/rise.wav"] = {"command": f"ffmpeg -f lavfi -i \"aevalsrc=exprs='{expr}|{expr}':s=48000:d=0.5\", "
                                      "then a 5 ms fade in and an 8 ms fade out"}
    return x


# ---------------------------------------------------------------- chord tail (E5)
def hall_ir(rng, rt60=1.4, length=3.0) -> np.ndarray:
    n = int(length * SR)
    t = np.arange(n) / SR
    env = np.exp(-6.9078 * t / rt60) * np.clip((t - 0.02) / 0.04, 0, 1)
    def mag(f):
        return butter_mag(f, 150, 1, "high") * butter_mag(f, 3500, 1, "low")
    nz = spectral_noise(n, mag, rng, 2, corr=0.0)
    nz /= np.sqrt(np.mean(nz ** 2))
    return nz * env[:, None]


def chord_tail(rng) -> np.ndarray:
    d = 3.0
    n = int(d * SR)
    t = np.arange(n) / SR
    f = 659.25
    parts = [(1, 1.0, 1.3), (2, 0.22, 2.2), (3, 0.07, 3.2), (4, 0.035, 4.5)]
    dry = np.zeros(n)
    for cents, g in ((-2.0, 0.5), (2.0, 0.5)):
        fd = f * 2 ** (cents / 1200)
        for h, a, k in parts:
            dry += g * a * np.exp(-k * t) * np.sin(2 * np.pi * h * fd * t)
    dry = fade(dry[:, None], 0.005, 0.0)[:, 0]
    ir = hall_ir(rng)
    wet = np.stack([fftconvolve(dry, ir[:, c])[:n] for c in range(2)], axis=1)
    g = 10 ** (-12 / 20) * np.sqrt(np.mean(dry ** 2)) / (np.sqrt(np.mean(wet ** 2)) + 1e-12)
    y = np.repeat(dry[:, None], 2, axis=1) + g * wet
    # gentle overall fade to exactly zero at 3.0 s (the last 0.8 s)
    m = int(0.8 * SR)
    y[-m:] *= (np.cos(0.5 * np.pi * np.arange(m) / (m - 1)) ** 2)[:, None]
    LOG["sfx/chord-tail.wav"] = {"method": "additive E5 659.25 Hz, partials 1-4 (1, .22, .07, .035) decaying "
                                           "exp(-1.3t..-4.5t), two voices -+2 cents, 5 ms attack; synthetic hall "
                                           "RT60 1.4 s at -12 dB RMS; 0.8 s cosine fade to zero at 3.0 s",
                                 "seed": "numpy default_rng(1009)"}
    return y


def finish(x: np.ndarray, path: Path, loop: bool) -> None:
    x = normalize_peak(x, -3.0)
    if not loop:
        x[0] = 0.0
        x[-1] = 0.0
    write(path, x)
    print(f"wrote {path.relative_to(FILM)}  {len(x) / SR:.3f} s")


def main():
    rng = np.random.default_rng(1009)
    finish(hum(), AMB / "hum.wav", loop=True)
    finish(hiss(rng), AMB / "hiss.wav", loop=True)
    finish(room(rng), AMB / "room.wav", loop=True)
    finish(drone(rng), AMB / "drone.wav", loop=True)
    finish(rise(), SFX / "rise.wav", loop=False)
    finish(chord_tail(rng), SFX / "chord-tail.wav", loop=False)
    (FILM / "_takes/audio/synth").mkdir(parents=True, exist_ok=True)
    (FILM / "_takes/audio/synth/make_synth.log.json").write_text(json.dumps(LOG, indent=1))


if __name__ == "__main__":
    main()

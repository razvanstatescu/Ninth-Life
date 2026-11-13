"""Synthesise the second cut's new effects (no generation, no credits). Run from film/:
    .venv/bin/python -I -B scripts/audio/make_sfx_v2.py

Writes 48 kHz 24-bit stereo WAV, each normalised to -3.0 dBFS peak, first and last sample 0:
  public/audio/sfx/v2/  wake-click, battery-low, power-down, hiss-riser (Act 1)
                        bubble, chip, wrong-key, delete, shimmer, signal-down, switch-press, lock-click (Act 2)
  public/audio/amb/hum-glide.wav  (Act 1; place it at film 26.000 s: it ends, dead, at 27.600 s)
and _takes/sfx-v2/recipes.json (every parameter, for the manifest). Deterministic (fixed seeds).
Pitches: the film's key, A minor pentatonic (A C D E G), as the key tones; the old key set (square wave through a
tiny speaker: highpass 900 Hz x2, lowpass 3200 Hz) for the battery beeps; the Act 1 hum recipe (scripts/audio/
make_synth.py: 55 Hz with partials 1-10) for the glide; the Act 1 hiss bed (public/audio/amb/hiss.wav) for the riser.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt, stft, istft

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, write, SR, FILM, db, peak, first_sound  # noqa: E402

OUT = FILM / "public/audio/sfx/v2"
AMB = FILM / "public/audio/amb"
REC: dict[str, dict] = {}
NOTE = {"A3": 220.0, "C4": 261.63, "D4": 293.66, "E4": 329.63, "G4": 392.0, "A4": 440.0, "C5": 523.25, "D5": 587.33,
        "E5": 659.25, "G5": 783.99, "A5": 880.0, "C6": 1046.5, "D6": 1174.66, "E6": 1318.51, "G6": 1567.98, "A6": 1760.0}


def t_of(dur):
    return np.arange(int(round(dur * SR))) / SR


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="bandpass", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype="lowpass", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype="highpass", fs=SR, output="sos"), x)


def place(dst, src, at):
    i = int(round(at * SR))
    n = min(len(src), len(dst) - i)
    dst[i:i + n] += src[:n]


def finish(name, x, folder=OUT, stereo=None, fade_in=0.001, fade_out=0.004, rec=None):
    """Mono (or given stereo) -> stereo, edge fades, -3 dBFS peak, edges at 0."""
    y = np.repeat(x[:, None], 2, axis=1) if stereo is None else stereo
    n_in, n_out = max(1, int(fade_in * SR)), max(1, int(fade_out * SR))
    y[:n_in] *= np.linspace(0, 1, n_in)[:, None]
    y[-n_out:] *= np.linspace(1, 0, n_out)[:, None]
    y = y * (10 ** (-3 / 20) / peak(y))
    y[0] = 0.0
    y[-1] = 0.0
    path = folder / f"{name}.wav"
    write(path, y)
    sp = np.abs(np.fft.rfft(y.mean(axis=1))) ** 2
    f = np.fft.rfftfreq(len(y), 1 / SR)
    REC[str(path.relative_to(FILM))] = {**(rec or {}), "duration_s": round(len(y) / SR, 3), "peak_dbfs": round(db(peak(y)), 2),
                                         "first_sound_ms": round(1000 * first_sound(y), 1),
                                         "centroid_hz": int(np.sum(f * sp) / np.sum(sp))}
    return path


def plastic_click(rng, ping=3200.0):
    t = t_of(0.03)
    n = rng.standard_normal(len(t)) * np.exp(-t / 0.0007)
    c = bp(n, 2000, 7000) * 0.7
    c += np.sin(2 * np.pi * ping * t) * np.exp(-t / 0.006) * 0.35
    c += np.sin(2 * np.pi * 700 * t) * np.exp(-t / 0.004) * 0.25
    return c


def whine(dur, f0, f1, rise, level, rng):
    t = t_of(dur)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / rise))
    flutter = 1 + 0.08 * np.sin(2 * np.pi * 11 * t) + 0.04 * rng.standard_normal(len(t)).cumsum() / np.sqrt(len(t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return level * flutter * (np.sin(ph) + 0.15 * np.sin(2 * ph))


def wake_click():
    rng = np.random.default_rng(101)
    x = np.zeros(int(0.6 * SR))
    place(x, plastic_click(rng), 0.002)
    w = whine(0.56, 6400, 7200, 0.08, 0.06, rng)
    t = t_of(0.56)
    w *= np.minimum(1, t / 0.06) * np.where(t > 0.46, np.cos(0.5 * np.pi * (t - 0.46) / 0.10), 1.0)
    place(x, w, 0.025)
    return finish("wake-click", x, rec={"recipe": "plastic click (noise burst 2-7 kHz, 3.2 kHz ping, 700 Hz tick) at 2 ms; backlight whine 6.4 -> 7.2 kHz "
                                                  "from 25 ms, 60 ms in, flutter, -24 dB under the click, faded by 0.6 s"})


def power_down():
    rng = np.random.default_rng(102)
    x = np.zeros(int(0.5 * SR))
    place(x, plastic_click(rng, ping=2900.0), 0.002)
    t = t_of(0.46)
    f = 7200 * (3000 / 7200) ** (t / 0.46)
    ph = 2 * np.pi * np.cumsum(f) / SR
    w = 0.06 * (np.sin(ph) + 0.15 * np.sin(2 * ph)) * np.exp(-t / 0.15) * np.minimum(1, t / 0.005)
    place(x, w, 0.012)
    return finish("power-down", x, rec={"recipe": "plastic click (2.9 kHz ping) at 2 ms; the whine falling 7.2 -> 3 kHz over 0.46 s, dying (decay 0.15 s)"})


def old_square(f, dur=0.090, fade_in=0.008, fade_out=0.040):
    t = t_of(dur)
    s = np.zeros(len(t))
    k = 1
    while k * f < 16000:
        s += np.sin(2 * np.pi * k * f * t) / k
        k += 2
    s *= 0.5 * 4 / np.pi
    s = lp(hp(hp(s, 900), 900), 3200)
    s[: int(fade_in * SR)] *= np.sin(0.5 * np.pi * np.linspace(0, 1, int(fade_in * SR)))
    s[-int(fade_out * SR):] *= np.sin(0.5 * np.pi * np.linspace(1, 0, int(fade_out * SR)))
    return s


def battery_low():
    x = np.zeros(int(0.30 * SR))
    place(x, old_square(NOTE["E4"]), 0.001)
    place(x, old_square(NOTE["C4"]) * 0.85, 0.161)
    return finish("battery-low", x, rec={"recipe": "two beeps of the old key set (band-limited square, highpass 900 Hz x2, lowpass 3.2 kHz), "
                                                   "key 4 = E4 329.63 Hz at 1 ms then key 2 = C4 261.63 Hz at 161 ms (-1.4 dB), 90 ms each, "
                                                   "softer edges than the keys (8 ms in, 40 ms out)"})


def hum_glide():
    """F1 (43.65 Hz) held 0.10 s, glide to A1 (55 Hz) by 1.45 s, A held to 1.60 s, stop dead. Film 26.000-27.600 s."""
    dur = 1.6
    t = t_of(dur)
    fF, fA = 43.654, 55.0
    u = np.clip((t - 0.10) / 1.35, 0, 1)
    u = u * u * (3 - 2 * u)  # smooth start and arrival
    f0 = fF * (fA / fF) ** u
    parts = [(1, 1.0), (2, 0.8), (3, 0.12), (4, 0.10), (5, 0.05), (6, 0.05), (8, 0.025), (10, 0.015)]
    chans = []
    for off in (0.0, 0.5):
        am = 1 + 0.04 * np.sin(2 * np.pi * 0.3 * t + off) + 0.02 * np.sin(2 * np.pi * 0.7 * t + 1.3 + off)
        ph = 2 * np.pi * np.cumsum(f0) / SR
        sig = sum(a * np.sin(h * ph + 0.25 * h * np.sin(2 * np.pi * 0.2 * t)) for h, a in parts)
        chans.append(0.3 * am * sig)
    y = np.stack(chans, axis=1)
    y *= (10 ** (4 / 20 * np.clip((t - 0.10) / 1.35, 0, 1)))[:, None]  # +4 dB as it rises
    return finish("hum-glide", None, folder=AMB, stereo=y, fade_in=0.010, fade_out=0.002,
                  rec={"recipe": "the Act 1 hum (make_synth.py: partials 1, 2, 3, 4, 5, 6, 8, 10 of the fundamental, slow AM and FM, "
                                 "two channels) with the fundamental at F1 43.65 Hz for 0.10 s, a smooth glide to A1 55 Hz by 1.45 s "
                                 "(+4 dB on the way), A held to 1.60 s, 2 ms end fade (dead stop)",
                       "place_at_film_s": 26.0, "ends_at_film_s": 27.6})


def hiss_riser():
    src = read(AMB / "hiss.wav")[: int(2.0 * SR)]
    t = t_of(2.0)
    out = []
    for c in range(2):
        f, tt, Z = stft(src[:, c], fs=SR, nperseg=2048, noverlap=2048 - 256)
        fc = 300 * (12000 / 300) ** np.clip(tt / 2.0, 0, 1)
        mag = 1 / np.sqrt(1 + (f[:, None] / fc[None, :]) ** 8)  # 4th-order low-pass magnitude, moving cutoff
        _, y = istft(Z * mag, fs=SR, nperseg=2048, noverlap=2048 - 256)
        out.append(y[: len(t)])
    y = np.stack(out, axis=1)
    y *= (10 ** (6 / 20 * t / 2.0))[:, None]  # +6 dB over the 2 s
    return finish("hiss-riser", None, stereo=y, fade_in=0.002, fade_out=0.002,
                  rec={"recipe": "the Act 1 hiss bed (amb/hiss.wav, first 2 s) through a 4th-order low-pass rising from 300 Hz to 12 kHz "
                                 "(exponential) over 2 s, +6 dB, 2 ms end fade (cut dead with the hum glide)",
                       "place_at_film_s": 25.6, "ends_at_film_s": 27.6})


def tone(f, dur, tau, attack=0.002, glide_cents=0.0):
    t = t_of(dur)
    ff = f * 2 ** (glide_cents / 1200 * np.clip(t / 0.03, 0, 1))
    ph = 2 * np.pi * np.cumsum(ff) / SR
    return np.sin(ph) * np.exp(-t / tau) * np.minimum(1, t / attack)


def bubble():
    x = np.zeros(int(0.25 * SR))
    place(x, tone(NOTE["E5"], 0.25, 0.035, glide_cents=-50) + 0.3 * tone(NOTE["E4"], 0.25, 0.025), 0.001)
    x = lp(x, 4000)
    return finish("bubble", x, rec={"recipe": "one soft round tick: E5 659 Hz sine (2 ms attack, 35 ms decay, drifting 50 cents down) plus E4 at -10 dB, "
                                              "low-pass 4 kHz; a single tone, no rising sweep and no second note"})


def chip():
    rng = np.random.default_rng(103)
    t = t_of(0.18)
    f = 500 + 700 * np.exp(-t / 0.006)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.02) * np.minimum(1, t / 0.0015)
    puff = bp(rng.standard_normal(len(t)) * np.exp(-t / 0.004), 300, 2000) * 0.25
    return finish("chip", lp(body + puff, 5000), rec={"recipe": "a soft pop: sine falling 1.2 kHz -> 500 Hz (6 ms), 20 ms decay, a 4 ms noise puff 300 Hz-2 kHz, low-pass 5 kHz"})


def wrong_key():
    rng = np.random.default_rng(104)
    t = t_of(0.15)
    x = 0.8 * np.sin(2 * np.pi * NOTE["A3"] * t) * np.exp(-t / 0.018) + 0.6 * np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.025)
    x *= np.minimum(1, t / 0.001)
    x += lp(rng.standard_normal(len(t)) * np.exp(-t / 0.003), 1200) * 0.3
    return finish("wrong-key", lp(x, 1500), rec={"recipe": "a dull small tap: A3 220 Hz (18 ms) and 140 Hz (25 ms) damped sines, a 3 ms noise knock low-passed at 1.2 kHz, all low-passed at 1.5 kHz"})


def delete():
    rng = np.random.default_rng(105)
    t = t_of(0.14)
    tick = tone(NOTE["A5"], 0.14, 0.03) * 0.8 + bp(rng.standard_normal(len(t)) * np.exp(-t / 0.002), 1500, 6000) * 0.3
    x = tick[::-1].copy()
    x = np.concatenate([x, np.zeros(int(0.01 * SR))])
    return finish("delete", lp(x, 6000), fade_out=0.003, rec={"recipe": "a tick (A5 880 Hz sine, 30 ms decay, with a 2 ms click 1.5-6 kHz) reversed: "
                                                                        "a 0.14 s swell that ends sharply, then 10 ms of silence"})


def shimmer():
    rng = np.random.default_rng(106)
    dur = 2.0
    t = t_of(dur)
    notes = [2637.02, 3135.96, 3520.0, 4186.01, 4698.64, 5274.04, 6271.93, 7040.0]  # E7 G7 A7 C8 D8 E8 G8 A8
    weights = np.array([0.5, 0.5, 0.7, 1, 1, 1, 0.8, 0.6])
    L = np.zeros(len(t))
    R = np.zeros(len(t))
    starts = np.sort(np.concatenate([[0.002], rng.uniform(0.0, dur - 0.25, 46)]))
    for s in starts:
        f = rng.choice(notes, p=weights / weights.sum())
        g = rng.uniform(0.3, 1.0) * tone(f, min(0.6, dur - s), rng.uniform(0.08, 0.2), attack=0.006)
        pan = rng.uniform(0.15, 0.85)
        place(L, g * np.sqrt(1 - pan), s)
        place(R, g * np.sqrt(pan), s)
    air = hp(rng.standard_normal((len(t), 2)).T, 7000).T * 0.04
    env = np.minimum(1, t / 0.35) * np.where(t > 1.4, np.cos(0.5 * np.pi * (t - 1.4) / 0.6), 1.0)
    y = (np.stack([L, R], axis=1) + air) * env[:, None]
    return finish("shimmer", None, stereo=y, fade_in=0.001, fade_out=0.004,
                  rec={"recipe": "47 short sine grains (6 ms attack, 80-200 ms decay) on A minor pentatonic notes E7-A8 (2.6-7 kHz, most above 4 kHz, "
                                 "clear of the narrator's 1-4 kHz), random pan, plus air (noise high-passed at 7 kHz); swell in over 0.35 s, out from 1.4 s"})


def signal_down():
    rng = np.random.default_rng(107)
    x = np.zeros(int(2.0 * SR))
    for i, n in enumerate(["E6", "D6", "C6", "A5"]):
        t = t_of(0.12)
        k = tone(NOTE[n], 0.12, 0.035) + bp(rng.standard_normal(len(t)) * np.exp(-t / 0.0015), 2000, 6000) * 0.15
        place(x, k * 10 ** (-2.5 * i / 20), 0.002 + 0.5 * i)
    return finish("signal-down", lp(x, 7000), rec={"recipe": "four soft ticks on beats at 120 BPM (0, 0.5, 1.0, 1.5 s, +2 ms), descending A minor pentatonic "
                                                             "E6 D6 C6 A5, each a sine with 35 ms decay and a faint 1.5 ms click, 2.5 dB softer each time; 2.0 s"})


def switch_press():
    rng = np.random.default_rng(108)
    t = t_of(0.3)
    f = 95 + 35 * np.exp(-t / 0.015)
    thud = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.06) * np.minimum(1, t / 0.002)
    squish = bp(rng.standard_normal(len(t)), 250, 900) * np.exp(-np.maximum(t - 0.003, 0) / 0.025) * (t > 0.003) * 0.35
    knock = np.sin(2 * np.pi * 400 * t) * np.exp(-t / 0.01) * 0.2
    return finish("switch-press", lp(thud + squish + knock, 2000), rec={"recipe": "a soft rubbery thud: a sine falling 130 -> 95 Hz (60 ms decay), a rubbery squish "
                                                                                  "(noise 250-900 Hz, 25 ms) from 3 ms, a 400 Hz knock (10 ms); low-pass 2 kHz, no click"})


def lock_click():
    rng = np.random.default_rng(109)
    x = np.zeros(int(0.08 * SR))
    t = t_of(0.05)
    c = hp(rng.standard_normal(len(t)) * np.exp(-t / 0.0006), 2000) * 0.6
    c += np.sin(2 * np.pi * 4200 * t) * np.exp(-t / 0.006) * 0.5 + np.sin(2 * np.pi * 2600 * t) * np.exp(-t / 0.009) * 0.3
    c += np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.004) * 0.3
    place(x, c, 0.001)
    place(x, c * 0.25, 0.013)
    return finish("lock-click", x, rec={"recipe": "a small mechanical click: a 0.6 ms noise burst above 2 kHz, pings at 4.2 kHz (6 ms) and 2.6 kHz (9 ms), "
                                                  "a 900 Hz body (4 ms), and a detent echo 12 ms later at -12 dB"})


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for fn in (wake_click, battery_low, power_down, hiss_riser, hum_glide, bubble, chip, wrong_key, delete, shimmer,
               signal_down, switch_press, lock_click):
        p = fn()
        r = REC[str(p.relative_to(FILM))]
        print(f"{str(p.relative_to(FILM)):38s} {r['duration_s']:6.3f} s  peak {r['peak_dbfs']:6.2f}  first {r['first_sound_ms']:5.1f} ms  centroid {r['centroid_hz']:5d} Hz")
    (FILM / "_takes/sfx-v2").mkdir(parents=True, exist_ok=True)
    (FILM / "_takes/sfx-v2/recipes.json").write_text(json.dumps(REC, indent=1))


if __name__ == "__main__":
    main()

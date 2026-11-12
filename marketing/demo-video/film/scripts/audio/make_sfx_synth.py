"""Synthesize the one-shots that generation could not deliver objectively (see sfx_measure.py results).

Run from film/: .venv/bin/python scripts/audio/make_sfx_synth.py
Writes public/audio/sfx/{tv-on,tv-off,riser,whoosh-1,whoosh-2,whoosh-3,whip}.wav and
_takes/audio/synth/sfx_synth.json (parameters and the measured peak time of each whoosh).

tv-on    2.0 s  relay click + low thunk at 0; a decaying 55 Hz degauss buzz; a thin whine rising 220 -> 2700 Hz
                (0.12 to 0.62 s) that settles on 2637 Hz (E7) and fades to a faint level; the 55/110 Hz hum rising in;
                a faint fizz; ends with a 0.25 s fade (the film's hum and hiss loops carry on).
tv-off   1.5 s  a thin whine falling 2637 -> 90 Hz over 0.75 s with a low buzz collapsing 110 -> 35 Hz, a few faint
                discharge ticks, one soft click at 0.78 s, then digital silence from about 0.95 s.
riser    2.0 s  a stack of saw voices on A (A2, E3, A3; two detuned voices each), gliding up one octave over 2 s
                through a low-pass opening 250 Hz -> 9 kHz, level rising 30 dB; cut at exactly 2.000 s (2 ms fade).
whoosh-* 0.5-0.7 s  noise through a time-varying band-pass (STFT) that sweeps up as it approaches, swelling into a
                soft dull thud near the end (pitch-dropping low sine + low noise knock). The thud is the loudest point.
whip     0.35 s fast band-pass noise swish 900 -> 7000 Hz, no thud.
Bandlimited additive synthesis for tones (no aliasing). Seeded noise. 48 kHz, 24-bit, stereo, peak -3 dBFS.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from scipy.signal import stft, istft, butter, sosfiltfilt

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import SR, FILM, write, normalize_peak, fade, db  # noqa: E402

OUT = FILM / "public/audio/sfx"
INFO: dict = {}


def t_axis(d):
    return np.arange(int(round(d * SR))) / SR


def damped(t, t0, f_fn, tau, amp, attack=0.002):
    """A damped sinusoid starting at t0 with instantaneous frequency f_fn(dt) (Hz)."""
    y = np.zeros_like(t)
    m = t >= t0
    dt = t[m] - t0
    f = f_fn(dt)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.exp(-dt / tau) * np.clip(dt / attack, 0, 1)
    y[m] = amp * env * np.sin(ph)
    return y


def noise_burst(t, t0, dur, tau, amp, band, rng):
    y = np.zeros_like(t)
    m = (t >= t0) & (t < t0 + dur + 8 * tau)
    n = int(m.sum())
    if n < 16:
        return y
    w = rng.standard_normal(n)
    lo, hi = band
    if lo and hi:
        sos = butter(2, [lo, hi], btype="band", fs=SR, output="sos")
    elif lo:
        sos = butter(2, lo, btype="high", fs=SR, output="sos")
    else:
        sos = butter(2, hi, btype="low", fs=SR, output="sos")
    w = sosfiltfilt(sos, w)
    w /= np.max(np.abs(w)) + 1e-12
    dt = t[m] - t0
    env = np.exp(-np.maximum(dt - dur, 0) / tau) * np.clip(dt / 0.0005, 0, 1)
    y[m] = amp * env * w
    return y


def buzz(t, f_fn, amp_fn, nharm=14, tilt=1.2, rng=None):
    """Harmonic buzz with time-varying fundamental, bandlimited below 16 kHz."""
    f0 = f_fn(t)
    ph = 2 * np.pi * np.cumsum(f0) / SR
    y = np.zeros_like(t)
    for h in range(1, nharm + 1):
        mask = (h * f0 < 16000).astype(float)
        y += mask * np.sin(h * ph + (rng.uniform(0, 2 * np.pi) if rng is not None else 0)) / h ** tilt
    return amp_fn(t) * y


def tone_glide(t, f_fn, amp_fn, partials=((1, 1.0), (2, 0.3), (3, 0.1)), vib=(0.0, 0.0)):
    f = f_fn(t)
    if vib[0]:
        f = f * (1 + vib[0] * np.sin(2 * np.pi * vib[1] * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.zeros_like(t)
    for h, a in partials:
        y += a * (h * f < 18000) * np.sin(h * ph)
    return amp_fn(t) * y


def bandnoise_stft(n, fc_fn, bw_fn, amp_fn, rng, corr=0.6, nper=1024, hop=128):
    """Stereo noise through a time-varying Gaussian band-pass (log frequency), shaped in the STFT domain."""
    pad = nper
    base = rng.standard_normal(n + 2 * pad)
    out = np.zeros((n, 2))
    for c in range(2):
        w = corr * base + np.sqrt(1 - corr ** 2) * rng.standard_normal(n + 2 * pad)
        f, tt, Z = stft(w, fs=SR, nperseg=nper, noverlap=nper - hop, boundary=None, padded=False)
        tt = tt - pad / SR
        fc = fc_fn(np.clip(tt, 0, None))[None, :]
        bw = bw_fn(np.clip(tt, 0, None))[None, :]
        a = amp_fn(tt)[None, :]
        lf = np.log2(np.maximum(f[:, None], 1.0) / fc)
        G = a * np.exp(-0.5 * (lf / (bw / 2)) ** 2)
        _, y = istft(Z * G, fs=SR, nperseg=nper, noverlap=nper - hop, boundary=False)
        out[:, c] = y[pad:pad + n] if len(y) >= pad + n else np.pad(y[pad:], (0, pad + n - len(y)))
    return out


# ------------------------------------------------------------------------------------------- tv-on
def tv_on(rng):
    d = 2.0
    t = t_axis(d)
    y = np.zeros_like(t)
    y += noise_burst(t, 0.002, 0.0015, 0.0006, 0.22, (2000, None), rng)                    # relay click
    y += damped(t, 0.004, lambda u: 70 + 50 * np.exp(-u / 0.015), 0.045, 0.9)              # low thunk
    y += damped(t, 0.004, lambda u: 380 + 0 * u, 0.012, 0.22)                              # knock body
    deg_env = lambda u: 0.32 * np.clip((u - 0.03) / 0.02, 0, 1) * np.exp(-np.maximum(u - 0.05, 0) / 0.32) \
        * (1 + 0.1 * np.sin(2 * np.pi * 11 * u))
    y += buzz(t, lambda u: 55 + 0 * u, deg_env, nharm=16, tilt=1.15, rng=rng)              # degauss buzz on A1

    def f_whine(u):
        a = np.clip((u - 0.12) / 0.50, 0, 1) ** 0.7
        rise = 220 * (2700 / 220) ** a
        settle = 2637 + (2700 - 2637) * np.exp(-np.maximum(u - 0.62, 0) / 0.08)
        return np.where(u < 0.62, rise, settle)

    def a_whine(u):
        fin = np.clip((u - 0.12) / 0.04, 0, 1)
        lvl = np.interp(u, [0.12, 0.6, 1.0, 1.6, 2.0], [0.02, 0.10, 0.05, 0.03, 0.025])
        return fin * lvl

    y += tone_glide(t, f_whine, a_whine, vib=(0.003, 5.3))                                  # rising whine
    hum_env = lambda u: np.interp(u, [0.0, 0.1, 0.8, 2.0], [0.0, 0.0, 0.12, 0.12])
    y += hum_env(t) * (np.sin(2 * np.pi * 55 * t) + 0.8 * np.sin(2 * np.pi * 110 * t) + 0.12 * np.sin(2 * np.pi * 165 * t))
    fz = rng.standard_normal(len(t))
    fz = sosfiltfilt(butter(2, [1000, 6000], btype="band", fs=SR, output="sos"), fz)
    y += np.interp(t, [0, 0.6, 2.0], [0, 0, 0.02]) * fz / (np.std(fz) + 1e-12) * 0.5
    y = fade(y[:, None], 0.0, 0.25)[:, 0]
    INFO["tv-on"] = {"design": "relay click 2 ms; thunk 120->70 Hz tau 45 ms; degauss buzz 55 Hz x16 harmonics tau 0.32 s; "
                               "whine 220->2700 Hz (0.12-0.62 s) settling on 2637 Hz; hum 55/110/165 Hz rising to 0.8 s; "
                               "fizz 1-6 kHz from 0.6 s; 0.25 s fade out"}
    return np.repeat(y[:, None], 2, axis=1)


# ------------------------------------------------------------------------------------------ tv-off
def tv_off(rng):
    d = 1.5
    t = t_axis(d)
    y = np.zeros_like(t)

    def f_fall(u):
        a = np.clip(u / 0.75, 0, 1) ** 0.8
        return 2637 * (90 / 2637) ** a

    a_fall = lambda u: 0.12 * np.clip(1 - (u / 0.80) ** 1.6, 0, 1) * np.clip(u / 0.01, 0, 1)
    y += tone_glide(t, f_fall, a_fall, partials=((1, 1.0), (2, 0.25), (3, 0.08)))           # falling whine
    f_buzz = lambda u: 110 * (35 / 110) ** np.clip(u / 0.8, 0, 1)
    a_buzz = lambda u: 0.30 * np.clip(1 - u / 0.85, 0, 1) ** 1.5 * np.clip(u / 0.01, 0, 1)
    y += buzz(t, f_buzz, a_buzz, nharm=12, tilt=1.3, rng=rng)                                # collapsing buzz
    for t0 in (0.06, 0.13, 0.21, 0.34):                                                       # discharge ticks
        y += noise_burst(t, t0, 0.0008, 0.0005, 0.035 * rng.uniform(0.6, 1.0), (2500, None), rng)
    y += noise_burst(t, 0.78, 0.0015, 0.0006, 0.12, (1500, None), rng)                        # soft click
    y += damped(t, 0.78, lambda u: 140 + 0 * u, 0.010, 0.15)
    # silence after the click's decay
    y *= np.clip((0.95 - t) / 0.08, 0, 1) ** 2 * (t < 0.95) + (t >= 0.95) * 0
    y[t >= 0.95] = 0.0
    INFO["tv-off"] = {"design": "whine 2637->90 Hz over 0.75 s; buzz 110->35 Hz decaying to 0.85 s; 4 faint discharge "
                                "ticks; soft click at 0.78 s; digital silence from 0.95 s"}
    return np.repeat(y[:, None], 2, axis=1)


# ------------------------------------------------------------------------------------------- riser
def riser(rng):
    d = 2.0
    t = t_axis(d)
    out = np.zeros((len(t), 2))
    glide = 2 ** (t / d)                                     # one octave up over 2 s
    integ = d / np.log(2) * (2 ** (t / d) - 1)               # integral of the glide factor
    fc = 250 * (9000 / 250) ** ((t / d) ** 1.3)
    level = 10 ** ((-30 + 30 * (t / d) ** 1.5) / 20)
    for f0 in (110.0, 164.81, 220.0):
        for c, cents in ((0, -6.0), (1, 6.0)):
            f = f0 * 2 ** (cents / 1200)
            ph0 = rng.uniform(0, 2 * np.pi)
            for h in range(1, 120):
                fh = h * f * glide
                if h * f > 16000:
                    break
                mag = (1.0 / h) * (1.0 / np.sqrt(1 + (fh / fc) ** 4)) * (fh < 18000)
                out[:, c] += mag * np.sin(2 * np.pi * h * f * integ + h * ph0)
    out *= level[:, None]
    out = fade(out, 0.005, 0.002)
    INFO["riser"] = {"design": "saw stack A2/E3/A3, voices -+6 cents L/R, glide x2 over 2 s, 2nd-order low-pass "
                               "250 Hz->9 kHz, level -30->0 dB; ends at its loudest point, cut at 2.000 s (2 ms fade)"}
    return out


# ------------------------------------------------------------------------------------------ whoosh
def thud(t, t0, rng, level=1.0):
    y = damped(t, t0, lambda u: 48 + 42 * np.exp(-u / 0.03), 0.065, 1.0 * level, attack=0.003)
    y += damped(t, t0, lambda u: 175 + 0 * u, 0.035, 0.22 * level, attack=0.003)
    y += noise_burst(t, t0, 0.004, 0.022, 0.30 * level, (None, 420), rng)
    return y


def whoosh(rng, d, t_hit, f_lo, f_hi, bw, pan, thud_level, air_level):
    n = int(round(d * SR))
    t = t_axis(d)

    def amp(tt):
        tt = np.asarray(tt)
        # the swell starts from a low floor (-26 dB under the air's peak), so the sound begins at the file start
        rise = 0.05 + 0.95 * np.clip(tt / (t_hit - 0.01), 0, 1) ** 2.2
        after = np.exp(-np.maximum(tt - t_hit, 0) / 0.025)
        return rise * after * (tt >= 0)

    fc = lambda tt: f_lo * (f_hi / f_lo) ** np.clip(tt / t_hit, 0, 1) ** 1.4
    bwf = lambda tt: bw + 0 * tt
    air = bandnoise_stft(n, fc, bwf, amp, rng)
    air = air / (np.max(np.abs(air)) + 1e-12) * air_level
    p0, p1 = pan
    th = (p0 + (p1 - p0) * np.clip(t / t_hit, 0, 1)) * np.pi / 2
    air[:, 0] *= np.cos(th) * np.sqrt(2)
    air[:, 1] *= np.sin(th) * np.sqrt(2)
    th_sig = thud(t, t_hit, rng, thud_level)
    y = air + th_sig[:, None]
    y = fade(y, 0.003, 0.012)
    return y


def whip(rng):
    d = 0.35
    n = int(round(d * SR))

    def amp(tt):
        tt = np.asarray(tt)
        return (0.06 + 0.94 * np.clip(tt / 0.13, 0, 1) ** 1.8) * np.exp(-np.maximum(tt - 0.13, 0) / 0.045) * (tt >= 0)

    fc = lambda tt: 900 * (7000 / 900) ** np.clip(tt / 0.18, 0, 1)
    y = bandnoise_stft(n, fc, lambda tt: 1.1 + 0 * tt, amp, rng, corr=0.7)
    t = t_axis(d)
    th = (0.35 + 0.3 * np.clip(t / 0.2, 0, 1)) * np.pi / 2
    y[:, 0] *= np.cos(th) * np.sqrt(2)
    y[:, 1] *= np.sin(th) * np.sqrt(2)
    y = fade(y, 0.003, 0.02)
    INFO["whip"] = {"design": "noise band-pass 900->7000 Hz over 0.18 s, 1.1 octave wide, swell to 0.13 s then "
                              "decay tau 45 ms, slight left-to-right; no thud"}
    return y


def loudest_time(x, win=0.010):
    m = x.mean(axis=1)
    w = int(win * SR)
    e = np.array([np.sqrt(np.mean(m[i:i + w] ** 2)) for i in range(0, len(m) - w, int(0.001 * SR))])
    return (int(np.argmax(e)) * 0.001 + win / 2)


def main():
    rng = np.random.default_rng(4356)
    files = {
        "tv-on": tv_on(rng),
        "tv-off": tv_off(rng),
        "riser": riser(rng),
        "whoosh-1": whoosh(rng, 0.60, 0.47, 700, 3000, 1.4, (0.5, 0.5), 1.0, 0.55),
        "whoosh-2": whoosh(rng, 0.70, 0.55, 400, 1800, 1.6, (0.15, 0.85), 1.0, 0.60),
        "whoosh-3": whoosh(rng, 0.50, 0.40, 1500, 6000, 1.2, (0.6, 0.4), 0.6, 0.50),
        "whip": whip(rng),
    }
    for k, (d, th, flo, fhi) in {"whoosh-1": (0.60, 0.47, 700, 3000), "whoosh-2": (0.70, 0.55, 400, 1800),
                                  "whoosh-3": (0.50, 0.40, 1500, 6000)}.items():
        INFO[k] = {"design": f"noise band-pass sweeping {flo}->{fhi} Hz, swelling into a soft dull thud at {th} s "
                             f"(48+42 Hz pitch drop, 175 Hz body, low noise knock); length {d} s"}
    for name, x in files.items():
        x = normalize_peak(x, -3.0)
        x[0] = 0.0
        x[-1] = 0.0
        write(OUT / f"{name}.wav", x)
        if name.startswith("whoosh"):
            INFO[name]["peak_time_s"] = round(loudest_time(x), 3)
        print(f"wrote sfx/{name}.wav {len(x) / SR:.3f} s" + (f"  loudest at {INFO[name].get('peak_time_s')} s" if name.startswith('whoosh') else ""))
    (FILM / "_takes/audio/synth").mkdir(parents=True, exist_ok=True)
    (FILM / "_takes/audio/synth/sfx_synth.json").write_text(json.dumps(INFO, indent=1))


if __name__ == "__main__":
    main()

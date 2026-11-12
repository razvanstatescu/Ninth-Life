"""Conform music v2: public/audio/music/act2-v2.wav, act2-v2-drums.wav, act2-v2-other.wav (90.000 s each), and the
"drive" variant for the owner to compare: act2-v2-drive.wav and act2-v2-drive-drums.wav (its other stem is
act2-v2-other.wav). The drive files stay out of MUSIC_FILES until the owner chooses.

Run (from film/): .venv/bin/python -I -B scripts/audio/music_v2_conform.py [--take i2] [--no-kick]

Source: take i2 (_takes/music-v2/act2-v2-i2.wav: i1's rebirth plus v2c's body, the drop and the access bars
regenerated; music_v2_5) and its six stems (six_stems_v1). The separation found no drums at all (drums stem at
-128 dB, vocals and guitar silent): the music is bass plus synths. So:
  other = bass + other + piano + guitar + vocals stems (+ our edits below);   drums = the (silent) drums stem + our kick;
  full  = the take + the same edits + our kick.   (drums + other = full within the separation residual.)
Steps, sample-exact at 48 kHz:
1. Shift: the bar-1 hit's attack (the low band, 30-150 Hz, first reaching 20 dB under its peak) moves to 0.000 s.
2. Rebirth rise (bars 1-4, the lead's fix of 2026-11-10): the take's bass holds one level through bars 1-4, so the
   bar-1 hit keeps its level (0-0.15 s), the bass then eases 7.5 dB down by 0.45 s and climbs back to 0 dB at 7.5 s
   (linear in dB); a soft noise riser made here is layered in (pink noise through a band-pass whose centre rises from
   250 Hz to 3 kHz, its level rising 30 dB, 0.3-7.6 s, ending 3 dB under the music). Measured: bar 1 beat 2 to the end
   of bar 4, see conform.json.
3. Rebuild (bars 31-33, the lead's fix): the take thins to -45 LUFS in bar 32 and its access groove only enters at bar
   33 beat 3. The take's own access groove (bar 34, the other stem, tiled on the bar lines with 20 ms crossfades) is
   faded in from -10 dB at bar 31 beat 1 to -1 dB at bar 33 beat 1 and 0 dB at bar 33 beat 3, where the take's own
   groove takes over (60 ms crossfade). Bars 30 (the signal drops) and everything else stay as they were.
4. Kick: a soft kick synthesised here (a sine falling from 100 Hz to 55 Hz = A1, a 1 ms attack, 0.12 s decay, light
   saturation, a faint beater click, low-pass 3 kHz) in the drop (bars 6-8, not bar 8 beat 4), the solution groove
   (18-22), access (33-34, the scan clock) and the lift (35-36), on the take's own pulse in each section (the circular
   mean of its onsets modulo a 16th note, measured without the rebuild layer, so the kicks sit exactly where they did
   before the fixes). Level: the kick-only track is 5 dB under the music over bars 6-8.
5. Drive variant: a soft shaker synthesised here (noise through resonances tuned to E8 and A8, 5.3 and 7 kHz, above
   the narrator's 1-4 kHz; 4 ms attack, 35 ms decay; the off-beat eighths 4 dB louder) on every eighth in the drop
   (6-8), the groove from bar 18 (18-21), access (33-34) and the lift (35-36), on the same pulse as the kick; its track
   sits 14 dB under the music in those bars.
6. Mutes (hard, 5 ms ramps): 7.6-10.0 s (the riser stops dead 24 f before bar 5; bar 5 silent), 33.5-34.0 (bar 17
   beat 4), 53.5-54.5 (the proof's two beats out), 76.0-80.0 (bars 39-40). Kick and shaker are added after the mutes.
7. End: a raised-cosine fade from 87.0 s, silent at 90.0 s. Length exactly 4,320,000 samples, 24-bit stereo, peak
   at most -1 dBFS (the same gain on every file).
Writes the five files, _takes/music-v2/act2-v2-nokick.wav (for comparison) and _takes/music-v2/conform.json.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt, stft, istft

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, write, SR, FILM, db, peak  # noqa: E402
from kloudness import kweight  # noqa: E402
from music_analyze import onset_envelope, HOP  # noqa: E402

M = FILM / "_takes/music-v2"
N = 90 * SR
MUTES = [(7.6, 10.0), (33.5, 34.0), (53.5, 54.5), (76.0, 80.0)]
KICK_BARS = {"drop": ([6, 7, 8], (10.0, 16.0)), "solution": ([18, 19, 20, 21, 22], (34.0, 44.0)),
             "access": ([33, 34], (64.0, 68.0)), "lift": ([35, 36], (68.0, 72.0))}
SKIP = {(8, 4)}  # bar 8 beat 4: the short lift into the dive
BASS_DIP = -7.5      # dB, bars 1-4 after the hit (step 2)
RISER_UNDER = 3.0    # dB under the music at the end of bar 4 (step 2)
REBUILD_DB = (-10.0, -1.0)  # rebuild layer gain at bar 31 beat 1 and bar 33 beat 1 (step 3)
HAT_BARS = {"drop": [6, 7, 8], "solution": [18, 19, 20, 21], "access": [33, 34], "lift": [35, 36]}


def load_pcm(p: Path) -> np.ndarray:
    return np.frombuffer(p.read_bytes(), dtype="<i2").astype(np.float64).reshape(-1, 2) / 32768.0


def bar_start(bar: int) -> float:
    return (bar - 1) * 2.0


def soft_kick() -> np.ndarray:
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 55.0 + 45.0 * np.exp(-t / 0.025)
    ph = 2 * np.pi * np.cumsum(f) / SR
    amp = np.exp(-t / 0.12) * np.minimum(1.0, t / 0.001)
    body = np.sin(ph) * amp
    body = np.tanh(1.8 * body) / np.tanh(1.8)  # a few harmonics so it reads on small speakers
    rng = np.random.default_rng(55)
    click = rng.standard_normal(n) * np.exp(-t / 0.0012)
    click = sosfilt(butter(2, [1500, 3500], btype="bandpass", fs=SR, output="sos"), click)
    k = body + 0.05 * click / (np.max(np.abs(click)) + 1e-12)
    k = sosfilt(butter(2, 3000, btype="lowpass", fs=SR, output="sos"), k)
    k[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    return k / np.max(np.abs(k))


def shaker(seed: int) -> np.ndarray:
    """One soft shaker hit, stereo, tuned resonances at E8 (5274 Hz) and A8 (7040 Hz)."""
    rng = np.random.default_rng(seed)
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    env = np.minimum(1.0, t / 0.004) * np.exp(-t / 0.035)
    out = []
    for c in range(2):
        nz = rng.standard_normal(n)
        r = sosfilt(butter(2, [4900, 5650], btype="bandpass", fs=SR, output="sos"), nz)
        r += 0.8 * sosfilt(butter(2, [6600, 7500], btype="bandpass", fs=SR, output="sos"), nz)
        r += 0.25 * sosfilt(butter(2, 9000, btype="highpass", fs=SR, output="sos"), nz)
        out.append(r * env)
    y = np.stack(out, axis=1)
    y[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))[:, None]
    return y / np.max(np.abs(y))


def section_offset(other: np.ndarray, t0: float, t1: float) -> float:
    """Phase of the take's pulse in [t0, t1): circular mean of onset times modulo 125 ms, weighted by strength."""
    seg = other[int(t0 * SR):int(t1 * SR)].mean(axis=1)
    env, _ = onset_envelope(seg)
    pk = [i for i in range(1, len(env) - 1) if env[i] > env[i - 1] and env[i] >= env[i + 1] and env[i] > 0.25]
    if not pk:
        return 0.0
    tt = np.array(pk) * HOP / SR
    w = env[pk]
    ang = 2 * np.pi * (tt % 0.125) / 0.125
    c = np.sum(w * np.exp(1j * ang))
    off = (np.angle(c) / (2 * np.pi)) * 0.125
    return float(((off + 0.0625) % 0.125) - 0.0625)


def bar1_attack(x: np.ndarray) -> float:
    low = np.abs(sosfilt(butter(4, [30, 150], btype="bandpass", fs=SR, output="sos"), x[: int(0.3 * SR)].mean(axis=1)))
    e = 20 * np.log10(np.maximum(low, 1e-9))
    i = int(np.argmax(e > e.max() - 20))
    return i / SR


def kloud(x: np.ndarray) -> float:
    y = kweight(x)
    return float(-0.691 + 10 * np.log10(np.mean(y ** 2, axis=0).sum() + 1e-12))


def ramp_mute(x: np.ndarray, a: float, b: float, r: float = 0.005) -> np.ndarray:
    g = np.ones(len(x))
    ia, ib, n = int(round(a * SR)), int(round(b * SR)), int(r * SR)
    g[ia:ib] = 0.0
    if ia > 0:
        g[max(0, ia - n):ia] = np.linspace(1, 0, n)[-(ia - max(0, ia - n)):]
    if ib < len(x):
        g[ib:ib + n] = np.linspace(0, 1, n)[: len(g[ib:ib + n])]
    return x * g[:, None]


def rebirth_bass_gain() -> np.ndarray:
    """dB curve for the bass in bars 1-4: 0 dB for the hit (0-0.15 s), eased to BASS_DIP by 0.45 s, back to 0 dB at 7.5 s."""
    t = np.arange(N) / SR
    g = np.zeros(N)
    a = (t >= 0.15) & (t < 0.45)
    g[a] = BASS_DIP * 0.5 * (1 - np.cos(np.pi * (t[a] - 0.15) / 0.30))
    b = (t >= 0.45) & (t < 7.5)
    g[b] = BASS_DIP * (1 - (t[b] - 0.45) / 7.05)
    return 10 ** (g / 20)


def noise_riser() -> np.ndarray:
    """Pink-ish noise through a moving band-pass (centre 250 Hz -> 3 kHz, about an octave wide), level +30 dB, 0.3-7.6 s."""
    rng = np.random.default_rng(31)
    dur = 7.6
    n = int(dur * SR)
    t = np.arange(n) / SR
    white = rng.standard_normal((n, 2))
    pink = np.cumsum(white, axis=0)  # brown, then tilt back up a little: a darker noise than white
    pink = sosfilt(butter(1, 40, btype="highpass", fs=SR, output="sos"), pink, axis=0)
    out = []
    for c in range(2):
        f, tt, Z = stft(pink[:, c], fs=SR, nperseg=4096, noverlap=4096 - 512)
        fc = 250 * (3000 / 250) ** np.clip((tt - 0.3) / 7.3, 0, 1)
        lf = np.log2(np.maximum(f, 1.0))[:, None]
        mag = np.exp(-0.5 * ((lf - np.log2(fc)[None, :]) / 0.5) ** 2)
        _, y = istft(Z * mag, fs=SR, nperseg=4096, noverlap=4096 - 512)
        out.append(y[:n])
    y = np.stack(out, axis=1)
    y /= np.max(np.abs(y)) + 1e-12
    lvl = np.where(t < 0.3, 0.0, 10 ** ((-30 + 30 * np.clip((t - 0.3) / 7.3, 0, 1)) / 20) * np.minimum(1, (t - 0.3) / 0.3))
    y *= lvl[:, None]
    full = np.zeros((N, 2))
    full[:n] = y
    return full


def rebuild_layer(other: np.ndarray) -> np.ndarray:
    """The take's bar 34 groove (other stem) tiled over bars 31-33a with a rising gain; see step 3."""
    src0, src1 = 66.0, 68.0
    xf = int(0.020 * SR)
    lay = np.zeros((N, 2))
    for k, start in enumerate((60.0, 62.0, 64.0)):
        a = int(round(start * SR)) - (xf if k else 0)
        s0 = int(round(src0 * SR)) - (xf if k else 0)
        seg = other[s0:int(round(src1 * SR))].copy()
        if k == 2:  # the third tile only to bar 33 beat 3 (65.0 s) + 60 ms
            seg = seg[: int(round(65.06 * SR)) - a]
        w = np.ones(len(seg))
        if k:
            w[:xf] = np.sin(0.5 * np.pi * np.linspace(0, 1, xf))
        else:
            w[: int(0.05 * SR)] = np.linspace(0, 1, int(0.05 * SR))
        if k < 2:
            w[-xf:] = np.cos(0.5 * np.pi * np.linspace(0, 1, xf))
        else:
            n60 = int(0.06 * SR)
            w[-n60:] = np.cos(0.5 * np.pi * np.linspace(0, 1, n60))
        lay[a:a + len(seg)] += seg * w[:, None]
    t = np.arange(N) / SR
    gdb = np.full(N, -120.0)
    r1 = (t >= 60.0) & (t < 64.0)
    gdb[r1] = REBUILD_DB[0] + (REBUILD_DB[1] - REBUILD_DB[0]) * (t[r1] - 60.0) / 4.0
    r2 = (t >= 64.0) & (t < 65.06)
    gdb[r2] = REBUILD_DB[1] - REBUILD_DB[1] * np.clip((t[r2] - 64.0) / 1.0, 0, 1)
    return lay * (10 ** (gdb / 20))[:, None]


def place_track(hit: np.ndarray, times: list[float], gains: list[float] | None = None) -> np.ndarray:
    tr = np.zeros((N, 2))
    h = hit if hit.ndim == 2 else np.repeat(hit[:, None], 2, axis=1)
    for j, t in enumerate(times):
        i = int(round(t * SR))
        n = max(0, min(len(h), N - i))
        tr[i:i + n] += h[:n] * (gains[j] if gains else 1.0)
    return tr


def st_loud(x: np.ndarray, a: float, b: float) -> float:
    return kloud(x[int(a * SR):int(b * SR)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--take", default="i2")
    ap.add_argument("--no-kick", action="store_true")
    a = ap.parse_args()
    full = read(M / f"act2-v2-{a.take}.wav")[:N]
    st = {n: load_pcm(M / f"stems-{a.take}" / f"{n}.pcm")[:N] for n in ("bass", "drums", "guitar", "other", "piano", "vocals")}
    sep_residual = 20 * np.log10(np.sqrt(np.mean((full - sum(st.values())) ** 2)) + 1e-12)
    # 1. shift
    att = bar1_attack(full)
    s = int(round(att * SR))
    shift = lambda x: np.concatenate([x[s:], np.zeros((s, 2))])[:N]
    full = shift(full)
    st = {k: shift(v) for k, v in st.items()}
    drums = st["drums"]
    rest = st["other"] + st["piano"] + st["guitar"] + st["vocals"]
    bass = st["bass"]
    before_rise = {"bar1_beat2": round(st_loud(full, 0.5, 1.0), 1), "end_bar4": round(st_loud(full, 7.1, 7.5), 1)}
    # 2. rebirth: bass automation and the noise riser
    gb = rebirth_bass_gain()[:, None]
    full = full + bass * (gb - 1.0)
    bass = bass * gb
    riser = noise_riser()
    other = bass + rest
    rlev = st_loud(other, 6.6, 7.5)
    riser *= 10 ** (((rlev - RISER_UNDER) - st_loud(riser, 6.6, 7.5)) / 20)  # the riser ends RISER_UNDER dB under the music
    other = other + riser
    full = full + riser
    # 3. rebuild bars 31-33a from the take's own bar 34
    grid_ref = other.copy()  # the kick and shaker keep following the take's own pulse (the grid before the rebuild)
    lay = rebuild_layer(other)
    other = other + lay
    full = full + lay
    # start fade, mutes, end fade on the music
    n_in = int(0.001 * SR)
    for x in (full, drums, other, grid_ref):
        x[:n_in] *= np.linspace(0, 1, n_in)[:, None]
    for (ma, mb) in MUTES:
        full, drums, other = ramp_mute(full, ma, mb), ramp_mute(drums, ma, mb), ramp_mute(other, ma, mb)
        grid_ref = ramp_mute(grid_ref, ma, mb)
    fade = np.ones(N)
    f0 = int(87.0 * SR)
    fade[f0:] = 0.5 * (1 + np.cos(np.pi * np.arange(N - f0) / (N - f0)))
    full, drums, other = full * fade[:, None], drums * fade[:, None], other * fade[:, None]
    grid_ref = grid_ref * fade[:, None]
    nokick = full.copy()
    # 4. kick and 5. shaker, on each section's pulse
    offsets, kt, ht, hg = {}, [], [], []
    for name, (bars, (t0, t1)) in KICK_BARS.items():
        off = section_offset(grid_ref, t0, t1)
        offsets[name] = round(1000 * off, 1)
        for b in bars:
            for q in range(4):
                if (b, q + 1) not in SKIP:
                    kt.append(round(bar_start(b) + 0.5 * q + off, 4))
        for b in HAT_BARS[name]:
            for e in range(8):
                ht.append(round(bar_start(b) + 0.25 * e + off, 4))
                hg.append(1.0 if e % 2 else 10 ** (-4 / 20))
    kick = place_track(soft_kick(), kt)
    drop = slice(int(10.0 * SR), int(16.0 * SR))
    gain_db = (kloud(nokick[drop]) - 5.0) - kloud(kick[drop])
    kick *= 10 ** (gain_db / 20)
    if a.no_kick:
        kick[:] = 0.0
    hats = sum(place_track(shaker(1000 + i), [t], [g]) for i, (t, g) in enumerate(zip(ht, hg)))
    hat_bars = [b for v in HAT_BARS.values() for b in v]
    hat_mask = np.zeros(N, dtype=bool)
    for b in hat_bars:
        hat_mask[int(bar_start(b) * SR):int((bar_start(b) + 2) * SR)] = True
    hat_db = (kloud(nokick[hat_mask]) - 14.0) - kloud(hats[hat_mask])
    hats *= 10 ** (hat_db / 20)
    full_d = full + kick + hats
    drums_d = drums + kick + hats
    full = full + kick
    drums = drums + kick
    g = min(1.0, 10 ** (-1.0 / 20) / max(peak(full), peak(drums), peak(other), peak(full_d), peak(drums_d)))
    outs = {"act2-v2.wav": full * g, "act2-v2-drums.wav": drums * g, "act2-v2-other.wav": other * g,
            "act2-v2-drive.wav": full_d * g, "act2-v2-drive-drums.wav": drums_d * g}
    for x in list(outs.values()) + [nokick]:
        x[0] = 0.0
        x[-1] = 0.0
    out = FILM / "public/audio/music"
    for name, x in outs.items():
        write(out / name, x)
    write(M / "act2-v2-nokick.wav", nokick * g)
    F = outs["act2-v2.wav"]
    res = 20 * np.log10(np.sqrt(np.mean((F - outs["act2-v2-drums.wav"] - outs["act2-v2-other.wav"]) ** 2)) + 1e-12)
    res_d = 20 * np.log10(np.sqrt(np.mean((outs["act2-v2-drive.wav"] - outs["act2-v2-drive-drums.wav"] - outs["act2-v2-other.wav"]) ** 2)) + 1e-12)
    per_bar = [round(st_loud(F, 2 * b, 2 * b + 2), 1) for b in range(45)]
    info = {"take": a.take, "bar1_attack_s": round(att, 5), "shift_samples": s, "kick": not a.no_kick,
            "rebirth": {"before": before_rise, "after": {"bar1_beat2": round(st_loud(F, 0.5, 1.0), 1), "end_bar4": round(st_loud(F, 7.1, 7.5), 1)},
                        "rise_db": round(st_loud(F, 7.1, 7.5) - st_loud(F, 0.5, 1.0), 1), "bars_1_4": per_bar[:4],
                        "bass_dip_db": BASS_DIP, "riser_under_music_db": RISER_UNDER, "riser_band_hz": [250, 3000]},
            "rebuild": {"bars_29_34": per_bar[28:34], "source": "the take's bar 34 (66-68 s), other stem", "gain_db": [REBUILD_DB[0], REBUILD_DB[1], 0.0]},
            "kick_offsets_ms": offsets, "kick_times_s": kt, "kick_gain_db": round(gain_db, 2),
            "drive": {"shaker_times_s": len(ht), "shaker_gain_db": round(hat_db, 2), "bars": HAT_BARS, "tuned_hz": [5274, 7040],
                      "residual_db": round(res_d, 1)},
            "output_gain_db": round(20 * np.log10(g), 2), "mutes_s": MUTES, "fade_out_s": [87.0, 90.0],
            "separation_residual_db": round(sep_residual, 1), "full_minus_stems_residual_db": round(res, 1),
            "peaks_dbfs": {k: round(db(peak(v)), 2) for k, v in outs.items()},
            "loudness_kweighted_ungated": {k: round(kloud(v), 1) for k, v in outs.items()}, "per_bar_lufs": per_bar}
    (M / "conform.json").write_text(json.dumps(info, indent=1))
    print(json.dumps({k: v for k, v in info.items() if k not in ("kick_times_s", "per_bar_lufs")}, indent=1))
    print("per bar:", " ".join(f"{b + 1}:{v:.0f}" for b, v in enumerate(per_bar)))


if __name__ == "__main__":
    main()

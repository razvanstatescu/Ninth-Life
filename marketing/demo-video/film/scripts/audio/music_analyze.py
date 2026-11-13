"""Measure a music take: tempo, first downbeat, beat-grid stability, energy per bar.

Usage (from film/):  .venv/bin/python scripts/audio/music_analyze.py <file.wav> [--grid-bpm 120 --grid-offset 0]
                     [--json out.json]

Method
1. Onset envelope from the percussive part (librosa HPSS + spectral flux), hop 2.5 ms.
2. Tempo and phase by a fine comb search: for every period T (0.490..0.510 s, 0.01 ms steps) and phase, the
   score is the onset envelope summed at the grid points (Gaussian-weighted, 6 ms). The best pair wins.
3. Beat deviations: for each grid point in the first 76 s, the nearest onset peak within +-60 ms. Reported as
   mean and max of |deviation| in ms, for the fitted grid and (when --grid-bpm is given) a fixed grid.
4. Attack time of the first kick from the low band (< 150 Hz) envelope's steepest rise, to place beat 1.
5. Downbeat phase: which beat of four carries the bar-level energy jumps at the planned section starts.
6. Energy per bar (RMS dBFS over 2 s bars of the fitted grid) and onset density per bar.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import librosa
from scipy.signal import butter, sosfiltfilt, find_peaks

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, SR, db  # noqa: E402

HOP = 120  # 2.5 ms at 48 kHz
SECTION_STARTS = [0, 10, 16, 22, 34, 44, 52, 62, 68, 76]


def onset_envelope(mono: np.ndarray) -> np.ndarray:
    perc = librosa.effects.percussive(mono.astype(np.float32), margin=2.0)
    env = librosa.onset.onset_strength(y=perc, sr=SR, hop_length=HOP, n_fft=2048, lag=1, max_size=3)
    env = env / (np.percentile(env, 99.5) + 1e-9)
    return env, perc


def env_at(env: np.ndarray, t: np.ndarray, sigma_s: float = 0.006) -> np.ndarray:
    """Gaussian-weighted envelope value around times t."""
    fr = t * SR / HOP
    width = int(np.ceil(3 * sigma_s * SR / HOP))
    offs = np.arange(-width, width + 1)
    w = np.exp(-0.5 * (offs * HOP / SR / sigma_s) ** 2)
    idx = np.round(fr).astype(int)[:, None] + offs[None, :]
    valid = (idx >= 0) & (idx < len(env))
    vals = np.where(valid, env[np.clip(idx, 0, len(env) - 1)], 0.0)
    return (vals * w[None, :]).sum(axis=1)


def comb_search(env: np.ndarray, t_max: float, bpm_lo=117.6, bpm_hi=122.4):
    best = (-1, None, None)
    periods = np.arange(60 / bpm_hi, 60 / bpm_lo, 0.00001)
    for T in periods:
        # coarse phases every 2.5 ms
        phases = np.arange(0, T, HOP / SR)
        k = np.arange(int(t_max / T))
        grid = phases[:, None] + k[None, :] * T
        sc = env_at(env, grid.ravel(), 0.006).reshape(grid.shape).sum(axis=1)
        i = int(np.argmax(sc))
        if sc[i] > best[0]:
            best = (float(sc[i]), float(T), float(phases[i]))
    # refine phase at 0.1 ms around the best
    _, T, ph = best
    phases = np.arange(ph - 0.004, ph + 0.004, 0.0001)
    k = np.arange(int(t_max / T))
    grid = phases[:, None] + k[None, :] * T
    sc = env_at(env, grid.ravel(), 0.004).reshape(grid.shape).sum(axis=1)
    ph = float(phases[int(np.argmax(sc))])
    return T, ph


def onset_peaks(env: np.ndarray) -> np.ndarray:
    pk, _ = find_peaks(env, height=0.08, distance=int(0.05 * SR / HOP))
    # parabolic interpolation for sub-hop precision
    t = []
    for p in pk:
        if 0 < p < len(env) - 1:
            a, b, c = env[p - 1], env[p], env[p + 1]
            d = 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) != 0 else 0.0
            t.append((p + d) * HOP / SR)
        else:
            t.append(p * HOP / SR)
    return np.array(t), env[pk]


def deviations(peaks_t: np.ndarray, grid: np.ndarray, win: float = 0.06):
    devs = []
    for g in grid:
        j = np.searchsorted(peaks_t, g)
        cands = [peaks_t[i] for i in (j - 1, j) if 0 <= i < len(peaks_t)]
        cands = [c for c in cands if abs(c - g) <= win]
        if cands:
            c = min(cands, key=lambda c: abs(c - g))
            devs.append(c - g)
        else:
            devs.append(np.nan)
    return np.array(devs)


def kick_attack(mono: np.ndarray, around: float, search: float = 0.06) -> float:
    """Steepest rise of the low band (<150 Hz) envelope near `around` (s)."""
    sos = butter(4, 150, btype="low", fs=SR, output="sos")
    low = sosfiltfilt(sos, mono)
    a = max(0, int((around - search) * SR))
    b = min(len(low), int((around + search) * SR))
    seg = np.abs(low[a:b])
    # 1 ms smoothing
    k = int(0.001 * SR)
    sm = np.convolve(seg, np.ones(k) / k, mode="same")
    slope = np.diff(sm)
    return (a + int(np.argmax(slope))) / SR


def broadband_attack(mono: np.ndarray, around: float, search: float = 0.03) -> float:
    a = max(0, int((around - search) * SR))
    b = min(len(mono), int((around + search) * SR))
    seg = np.abs(mono[a:b])
    k = int(0.0005 * SR)
    sm = np.convolve(seg, np.ones(k) / k, mode="same")
    pk = int(np.argmax(sm))
    thr = 0.2 * sm[pk]
    i = pk
    while i > 0 and sm[i] > thr:
        i -= 1
    return (a + i) / SR


def analyze(path: str, grid_bpm: float | None = None, grid_offset: float = 0.0, t_eval: float = 76.0):
    x = read(path)
    mono = x.mean(axis=1)
    dur = len(mono) / SR
    env, perc = onset_envelope(mono)
    T, ph = comb_search(env, min(t_eval, dur))
    bpm = 60.0 / T
    peaks_t, peaks_v = onset_peaks(env)

    # fitted grid deviations over the first t_eval seconds
    k = np.arange(0, int((min(t_eval, dur) - ph) / T) + 1)
    grid = ph + k * T
    dv = deviations(peaks_t, grid)
    ok = ~np.isnan(dv)
    # robust line fit through matched onsets (refines tempo/phase)
    A = np.vstack([np.ones(ok.sum()), k[ok]]).T
    coef, *_ = np.linalg.lstsq(A, grid[ok] + dv[ok], rcond=None)
    ph_fit, T_fit = float(coef[0]), float(coef[1])
    resid = (grid[ok] + dv[ok]) - (ph_fit + k[ok] * T_fit)
    # one pass of outlier rejection (> 3x MAD)
    mad = np.median(np.abs(resid - np.median(resid))) + 1e-6
    keep = np.abs(resid) < max(0.015, 4 * mad)
    A2 = A[keep]
    coef2, *_ = np.linalg.lstsq(A2, (grid[ok] + dv[ok])[keep], rcond=None)
    ph_fit, T_fit = float(coef2[0]), float(coef2[1])
    grid_fit = ph_fit + k * T_fit
    dv_fit = deviations(peaks_t, grid_fit)
    okf = ~np.isnan(dv_fit)

    # attack-based placement of beat 1: the first grid point with a kick
    first_beat_grid = None
    for g in grid_fit:
        if g >= -0.01 and env_at(env, np.array([max(g, 0.0)]))[0] > 0.15:
            first_beat_grid = g
            break
    if first_beat_grid is None:
        first_beat_grid = grid_fit[0]
    attack_low = kick_attack(mono, max(first_beat_grid, 0.0))
    attack_bb = broadband_attack(mono, max(first_beat_grid, 0.0))

    # downbeat phase: energy jumps at section starts, per beat-of-four
    hop_s = 0.05
    frame = int(hop_s * SR)
    nfr = len(mono) // frame
    rms_db = np.array([db(np.sqrt(np.mean(mono[i * frame:(i + 1) * frame] ** 2)) + 1e-12) for i in range(nfr)])

    def rms_between(t0, t1):
        a, b = int(t0 * SR), int(t1 * SR)
        seg = mono[max(a, 0):max(b, 0)]
        return db(np.sqrt(np.mean(seg ** 2)) + 1e-12) if len(seg) else -120.0

    # bars of the fitted grid. bar 1 beat 1 = the grid point nearest 0 among candidates of each phase
    phase_scores = []
    for p4 in range(4):
        # candidate downbeats: grid indices with k % 4 == p4
        db_times = ph_fit + np.arange(p4, len(k) + 200, 4) * T_fit
        # score: mean bass-onset strength at those times, plus energy jumps at planned section starts
        s_env = float(np.mean(env_at(env, db_times[db_times < min(t_eval, dur)])))
        phase_scores.append(s_env)
    p4_best = int(np.argmax(phase_scores))
    downbeat0 = ph_fit + p4_best * T_fit
    while downbeat0 - 4 * T_fit > -0.25:
        downbeat0 -= 4 * T_fit

    bars = []
    for b in range(43):
        t0 = downbeat0 + b * 4 * T_fit
        t1 = t0 + 4 * T_fit
        n_on = int(np.sum((peaks_t >= t0) & (peaks_t < t1)))
        bars.append({"bar": b + 1, "t0": round(t0, 3), "rms_db": round(rms_between(t0, t1), 1), "onsets": n_on})

    # energy jump at each planned section start (rms of next 2 s minus previous 2 s)
    jumps = []
    for s in SECTION_STARTS[1:]:
        t = downbeat0 + s * (T_fit / 0.5)
        jumps.append({"section_start_s": s, "at": round(t, 3),
                      "jump_db": round(rms_between(t, t + 1.0) - rms_between(t - 1.0, t), 1)})

    out = {
        "file": str(path),
        "duration": round(dur, 4),
        "comb": {"bpm": round(bpm, 4), "period_s": round(T, 6), "phase_s": round(ph, 4)},
        "fit": {"bpm": round(60 / T_fit, 4), "period_s": round(T_fit, 6), "phase_s": round(ph_fit, 4),
                "tempo_error_pct": round(100 * (60 / T_fit - 120) / 120, 4)},
        "beats_in_window": int(len(k)),
        "beats_matched": int(okf.sum()),
        "dev_fit_ms": {"mean_abs": round(1000 * float(np.nanmean(np.abs(dv_fit))), 2),
                       "max_abs": round(1000 * float(np.nanmax(np.abs(dv_fit))), 2),
                       "p95_abs": round(1000 * float(np.nanpercentile(np.abs(dv_fit), 95)), 2),
                       "mean_signed": round(1000 * float(np.nanmean(dv_fit)), 2)},
        "first_beat": {"grid": round(first_beat_grid, 4), "kick_attack_low": round(attack_low, 4),
                       "attack_broadband": round(attack_bb, 4)},
        "downbeat": {"phase_scores": [round(s, 3) for s in phase_scores], "best_beat_of_four": p4_best,
                     "bar1_beat1_s": round(downbeat0, 4)},
        "section_jumps": jumps,
        "bars": bars,
    }

    if grid_bpm:
        Tg = 60.0 / grid_bpm
        kg = np.arange(0, int((min(t_eval, dur) - grid_offset) / Tg) + 1)
        gg = grid_offset + kg * Tg
        dg = deviations(peaks_t, gg)
        okg = ~np.isnan(dg)
        out["dev_fixed_grid_ms"] = {
            "grid_bpm": grid_bpm, "grid_offset": grid_offset,
            "matched": int(okg.sum()), "of": int(len(kg)),
            "mean_abs": round(1000 * float(np.nanmean(np.abs(dg))), 2),
            "max_abs": round(1000 * float(np.nanmax(np.abs(dg))), 2),
            "p95_abs": round(1000 * float(np.nanpercentile(np.abs(dg), 95)), 2),
            "mean_signed": round(1000 * float(np.nanmean(dg)), 2),
            "worst": sorted([[round(float(gg[i]), 3), round(1000 * float(dg[i]), 1)] for i in np.where(okg)[0]],
                            key=lambda r: -abs(r[1]))[:8],
        }
        out["dev_fixed_grid_ms"]["per_beat"] = [None if np.isnan(d) else round(1000 * float(d), 1) for d in dg]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--grid-bpm", type=float, default=None)
    ap.add_argument("--grid-offset", type=float, default=0.0)
    ap.add_argument("--json", default=None)
    a = ap.parse_args()
    r = analyze(a.file, a.grid_bpm, a.grid_offset)
    if a.json:
        Path(a.json).parent.mkdir(parents=True, exist_ok=True)
        Path(a.json).write_text(json.dumps(r, indent=2))
    brief = {k: v for k, v in r.items() if k not in ("bars",)}
    if "dev_fixed_grid_ms" in brief:
        brief["dev_fixed_grid_ms"] = {k: v for k, v in brief["dev_fixed_grid_ms"].items() if k != "per_beat"}
    print(json.dumps(brief, indent=1))
    print("bars (rms dB / onsets):")
    print(" ".join(f"{b['bar']}:{b['rms_db']}/{b['onsets']}" for b in r["bars"]))


if __name__ == "__main__":
    main()

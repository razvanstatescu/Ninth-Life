"""Check music v2 takes against the bar map (prompts/music-v2.json, the lead's map of 2026-11-10).

Run (from film/): .venv/bin/python -I -B scripts/audio/music_v2_check.py <take.wav> [...] [--json out.json]
Per take:
  grid    - kick cross-correlation against a fixed 0.500 s grid from t = 0 (music_grid.run, until 90 s): mean / max
            deviation, fitted tempo and first beat, attack of the first kick.
  key     - harmonic chroma against Krumhansl-Kessler profiles (music_key.key_scores), tuning in cents from A = 440.
  bars    - per 2 s bar: K-weighted loudness (LUFS-like, ungated), band levels (sub < 90 Hz, low 90-250, mid 250-1k,
            presence 1-4 kHz, high > 4 kHz) and kick strength (low-band onset on the beats).
  map     - Spearman correlation of bar loudness with the map's target energy (muted bars left out), and the map's
            key moments: drop at bar 6, breakdown 9-17 well under the drop, groove back at 18, bar 22 down, the lift
            (35-36) among the loudest bars, the strip-back (37-38) well under it, the end chord present at 41 and fading.
  room    - mean presence-band (1-4 kHz) level relative to the bar's total in the narrated bars: lower leaves more
            room for the narrator.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt
from scipy.stats import spearmanr

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, SR  # noqa: E402
from kloudness import kweight  # noqa: E402
import music_grid  # noqa: E402
from music_key import key_scores  # noqa: E402
import librosa  # noqa: E402

TARGET = {**{b: e for b, e in zip(range(1, 5), (3, 4, 5, 6))}, 5: 0, 6: 8, 7: 8, 8: 8,
          **{b: e for b, e in zip(range(9, 18), (3, 3, 3, 3.5, 3.5, 4, 4, 4.5, 5))},
          18: 7, 19: 6.5, 20: 6.5, 21: 6.5, 22: 3, 23: 5, 24: 4, 25: 4, 26: 4.5, 27: 4.5, 28: 4.5, 29: 4.5,
          30: 3, 31: 4.5, 32: 6, 33: 7, 34: 7, 35: 9, 36: 9, 37: 4, 38: 4, 39: 0, 40: 0,
          41: 3, 42: 2.5, 43: 2, 44: 1, 45: 0.5}
MUTED = {5, 39, 40}
NARRATED = set(range(6, 9)) | set(range(9, 17)) | set(range(18, 22)) | set(range(24, 30)) | {30, 31, 32, 33, 34, 37, 38, 41, 42}
BANDS = {"sub": (20, 90), "low": (90, 250), "mid": (250, 1000), "presence": (1000, 4000), "high": (4000, 16000)}


def band(x, lo, hi):
    sos = butter(4, [lo, min(hi, SR / 2 - 100)], btype="bandpass", fs=SR, output="sos")
    return sosfilt(sos, x)


def db_rms(v):
    return float(10 * np.log10(np.mean(v ** 2) + 1e-20))


def analyze(path: Path) -> dict:
    st = read(path)
    m = st.mean(axis=1)
    nb = int(len(m) / SR // 2)
    kw = kweight(st)
    bands = {k: band(m, *v) for k, v in BANDS.items()}
    low_env = np.abs(band(m, 30, 150))
    bars = []
    for b in range(nb):
        s, e = b * 2 * SR, (b + 1) * 2 * SR
        lufs = -0.691 + 10 * np.log10(np.mean(kw[s:e] ** 2, axis=0).sum() + 1e-12)
        tot = db_rms(m[s:e])
        row = {"bar": b + 1, "lufs": round(lufs, 1)}
        for k, v in bands.items():
            row[k] = round(db_rms(v[s:e]), 1)
        row["presence_rel"] = round(row["presence"] - tot, 1)
        # kick strength: low-band peak in the 60 ms after each beat over the level just before it (dB), mean of 4
        ks = []
        for q in range(4):
            g = s + int(q * 0.5 * SR)
            pre = np.max(low_env[max(0, g - int(0.05 * SR)):g - int(0.01 * SR)] + 1e-9) if g > int(0.05 * SR) else 1e-9
            pk = np.max(low_env[g:g + int(0.06 * SR)] + 1e-9)
            ks.append(20 * np.log10(pk / pre))
        row["kick_db"] = round(float(np.mean(ks)), 1)
        bars.append(row)
    L = {r["bar"]: r["lufs"] for r in bars}
    keep = [b for b in TARGET if b not in MUTED and b in L]
    rho = float(spearmanr([TARGET[b] for b in keep], [L[b] for b in keep]).correlation)
    avg = lambda bs: float(np.mean([L[b] for b in bs]))
    checks = {
        "drop_bar6_minus_bar4_db": round(L[6] - L[4], 1),
        "breakdown_9_12_under_drop_db": round(avg([6, 7, 8]) - avg([9, 10, 11, 12]), 1),
        "groove_back_bar18_minus_17_db": round(L[18] - L[17], 1),
        "bar22_under_bar21_db": round(L[21] - L[22], 1),
        "lift_rank_35_36": sorted(keep, key=lambda b: -L[b]).index(35) + 1,
        "lift_minus_groove_18_21_db": round(avg([35, 36]) - avg([18, 19, 20, 21]), 1),
        "strip_under_lift_db": round(avg([35, 36]) - avg([37, 38]), 1),
        "end_bar41_lufs": L[41], "end_bar45_lufs": L[45],
        "kick_in_breakdown_db": round(float(np.mean([bars[b - 1]["kick_db"] for b in range(9, 18)])), 1),
        "kick_in_access_33_34_db": round(float(np.mean([bars[b - 1]["kick_db"] for b in (33, 34)])), 1),
    }
    room = round(float(np.mean([bars[b - 1]["presence_rel"] for b in NARRATED if b <= nb])), 1)
    g = music_grid.run(str(path), bpm=120.0, offset=0.0, until=90.0)
    y = librosa.resample(m.astype(np.float32), orig_sr=SR, target_sr=22050)
    h = librosa.effects.harmonic(y, margin=3.0)
    tuning = float(librosa.estimate_tuning(y=h, sr=22050, n_fft=4096))
    chroma = librosa.feature.chroma_cqt(y=h, sr=22050, hop_length=512, tuning=tuning, bins_per_octave=36)
    ks = key_scores(chroma.mean(axis=1))
    return {"file": str(path), "map_spearman": round(rho, 3), "checks": checks, "narrated_presence_rel_db": room,
            "grid": {"first_attack_s": g["first_attack_s"], **{k: g["kick_xcorr"].get(k) for k in ("n", "mean_abs_ms", "max_abs_ms", "fit_bpm", "fit_first_beat_s")},
                     "beats_without_kick": len(g["kick_xcorr"]["beats_without_kick"]), "onset_mean_abs_ms": g["onset_calibrated"].get("mean_abs_ms"),
                     "onset_max_abs_ms": g["onset_calibrated"].get("max_abs_ms")},
            "key": {"best": [(round(s, 3), n) for s, n in ks[:3]], "tuning_cents": round(100 * tuning, 1)},
            "bars": bars}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--json", default=None)
    a = ap.parse_args()
    res = [analyze(Path(f)) for f in a.files]
    if a.json:
        Path(a.json).write_text(json.dumps(res, indent=1))
    for r in res:
        print(f"\n== {Path(r['file']).name}: map rho {r['map_spearman']}, narrated presence {r['narrated_presence_rel_db']} dB re total, "
              f"key {r['key']['best'][:2]} tuning {r['key']['tuning_cents']} c")
        print("   grid:", r["grid"])
        print("   checks:", r["checks"])
        print("   bar  " + " ".join(f"{b['bar']:>5d}" for b in r["bars"]))
        print("   LUFS " + " ".join(f"{b['lufs']:5.0f}" for b in r["bars"]))
        print("   kick " + " ".join(f"{b['kick_db']:5.0f}" for b in r["bars"]))
        print("   pres " + " ".join(f"{b['presence_rel']:5.0f}" for b in r["bars"]))
        print("   tgt  " + " ".join(f"{TARGET.get(b['bar'], 0):5.1f}" for b in r["bars"]))


if __name__ == "__main__":
    main()

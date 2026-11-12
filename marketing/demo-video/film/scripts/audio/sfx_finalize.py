"""Cut the chosen generated sound-effect takes into public/audio/sfx/<id>.wav.

Run from film/: .venv/bin/python scripts/audio/sfx_finalize.py
Writes the files and _takes/audio/sfx/choices.json (take, reason, cut points, measures after cutting).

Every cut: DC removed (15 Hz high-pass, zero phase); start 4 ms before the first sound (1 ms peak envelope above
max(peak - 40 dB, -62 dBFS)); exactly the target length; 5 ms sine fade in; fade out 5 ms, or longer when the cut
falls on sound louder than -30 dB under the peak; peak -3 dBFS; stereo; first and last samples zero.
Measures that chose each take are in _takes/audio/sfx/measures.json (scripts/audio/sfx_measure.py).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfiltfilt

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, write, SR, FILM, db, normalize_peak, fade, to_stereo, report  # noqa: E402

TAKES = FILM / "_takes/audio/sfx"
OUT = FILM / "public/audio/sfx"

CHOICES = {
    "static-burst": {"src": "static-burst", "take": 2, "length": 0.5, "shape": "burst", "offset": 0.08,
                     "reason": "steady static, loudest clean take (raw peak -4.6 dBFS, no clipping); take 3 clips "
                               "(3 samples at 0 dBFS); takes 1 and 4 are 11-15 dB quieter. No take has a burst shape, "
                               "so the burst envelope (30 ms gentle attack, decay over the last 45%) and a 300 Hz-7 kHz "
                               "band-pass (filtered, as the creative direction asks) are applied here"},
    "static-burst-2": {"src": "static-burst", "take": 1, "length": 0.4, "shape": "burst", "offset": 0.20,
                       "reason": "second distinct static take (raw peak -13.4 dBFS, no clipping), a different texture "
                                 "from take 2; same burst envelope and band-pass"},
    "crackle": {"src": "crackle", "take": 3, "length": 0.5,
                "reason": "round-2 take: a cluster of small pops over 0.4 s, then quiet (natural length 0.53 s); "
                          "round-1 takes are steady low noise with energy only at the file end; take 4 is end-loaded"},
    "ember": {"src": "ember", "take": 2, "length": 1.2,
              "reason": "strike transient then a crackling burn of about 1.1 s (natural 1.13 s); take 1 is 17 dB "
                        "quieter with the same shape"},
    "sub-hit": {"src": "sub-hit", "take": 1, "length": 1.5,
                "reason": "immediate attack (on the beat), energy all below 120 Hz, harmonics 31 dB under the "
                          "fundamental (clean), no flat-topping; take 2 swells in over ~100 ms (would land late) and "
                          "settles on F#1, off-key against A minor; take 1 is unpitched (glides 37-47 Hz)"},
    "reverse-swell": {"src": "reverse-swell", "take": None, "length": 0.5, "shape": "end-peak",
                      "reason": "both takes rise steadily into a peak in their last 5 ms; the one whose last 0.5 s "
                                "rises most consistently (envelope-vs-time correlation) is chosen"},
    "tick": {"src": "tick", "take": 4, "length": 0.15,
             "reason": "round-2 take: one onset, natural length 0.14 s, centroid 2.4 kHz (woody); round-1 takes are "
                       "near silent (-53 dBFS) or digital silence; take 3 is brighter (4.4 kHz)"},
    "thump": {"src": "thump", "take": 3, "length": 0.4,
              "reason": "round-2 take: soft knock with low body and some mid (half the energy above 120 Hz, so it "
                        "reads on small speakers), natural 0.21 s; round-1 takes are sub-only at -35 to -40 dBFS"},
    "no": {"src": "no", "take": 1, "length": 0.5,
           "reason": "two onsets 100 ms apart (a double tap), energy 120-500 Hz (low, muted), no clipping; natural "
                     "length 0.17 s, the rest of the 0.5 s is silence; take 2 is sub-only without two clear taps"},
    "button": {"src": "button", "take": 2, "length": 0.4,
               "reason": "thud plus click: more low body (37% at 120-500 Hz) and more click (16% at 2-6 kHz) than "
                         "take 1; natural 0.28 s"},
    "flip": {"src": "flip", "take": 2, "length": 0.5,
             "reason": "natural length 0.51 s (target 0.5), quick swish peaking at 0.15 s, centroid 2.6 kHz; take 1 is "
                       "0.33 s with more low energy"},
}

HP = butter(2, 15, btype="high", fs=SR, output="sos")


def env1(x):
    m = np.max(np.abs(x), axis=1)
    w = int(0.001 * SR)
    n = len(m) // w
    return 20 * np.log10(np.maximum(m[: n * w].reshape(n, w).max(axis=1), 1e-9))


def first_sound_s(x):
    e = env1(x)
    thr = max(e.max() - 40, -62)
    i = np.nonzero(e > thr)[0]
    return i[0] * 0.001 if i.size else 0.0


def rms_db_at(x, t, win=0.01):
    a = int(max(t - win / 2, 0) * SR)
    seg = x[a:a + int(win * SR)]
    return db(np.sqrt(np.mean(seg ** 2))) if len(seg) else -120.0


def cut_tail(x, length):
    t0 = max(first_sound_s(x) - 0.004, 0.0)
    a = int(round(t0 * SR))
    n = int(round(length * SR))
    y = x[a:a + n]
    if len(y) < n:
        y = np.concatenate([y, np.zeros((n - len(y), y.shape[1]))])
    # fade-out length: longer if the cut falls on loud sound
    peak_rms = max(rms_db_at(y, t) for t in np.arange(0.005, length, 0.005))
    at_cut = rms_db_at(x, t0 + length)
    rel = at_cut - peak_rms
    fo = 0.005 if rel < -30 else (0.03 if rel < -20 else 0.06)
    y = fade(y, 0.005, fo)
    return y, {"start_s": round(t0, 4), "fade_out_s": fo, "level_at_cut_rel_db": round(rel, 1)}


def cut_burst(x, length, offset, band=(300, 7000)):
    sos = butter(2, list(band), btype="band", fs=SR, output="sos")
    x = sosfiltfilt(sos, x, axis=0)
    a = int(offset * SR)
    n = int(round(length * SR))
    y = x[a:a + n].copy()
    t = np.arange(n) / SR
    att = np.sin(0.5 * np.pi * np.clip(t / 0.030, 0, 1))
    d0 = 0.55 * length
    dec = np.where(t < d0, 1.0, np.cos(0.5 * np.pi * np.clip((t - d0) / (length - d0), 0, 1)) ** 2)
    y *= (att * dec)[:, None]
    return y, {"segment_start_s": offset, "band_hz": list(band), "attack_s": 0.03, "decay_from_s": round(d0, 3)}


def cut_end_peak(x, length):
    m = x.mean(axis=1)
    w = int(0.005 * SR)
    e = np.array([np.sqrt(np.mean(m[i:i + w] ** 2)) for i in range(0, len(m) - w, int(0.001 * SR))])
    ipk = int(np.argmax(e))
    t_end = min(ipk * 0.001 + w / SR, len(m) / SR)
    b = int(round(t_end * SR))
    n = int(round(length * SR))
    a = max(b - n, 0)
    y = x[a:b]
    if len(y) < n:
        y = np.concatenate([np.zeros((n - len(y), y.shape[1])), y])
    y = fade(y, 0.005, 0.003)
    # rise consistency over the kept part
    ee = np.array([db(np.sqrt(np.mean(y[i:i + w].mean(axis=1) ** 2)) + 1e-12) for i in range(0, len(y) - w, w)])
    corr = float(np.corrcoef(np.arange(len(ee)), ee)[0, 1])
    return y, {"end_s": round(t_end, 4), "rise_corr": round(corr, 3)}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    log = {}
    for fid, c in CHOICES.items():
        if c.get("shape") == "end-peak" and c["take"] is None:
            best = None
            for k in (1, 2):
                x = to_stereo(sosfiltfilt(HP, read(TAKES / c["src"] / f"take-{k}.wav"), axis=0))
                y, info = cut_end_peak(x, c["length"])
                if best is None or info["rise_corr"] > best[2]["rise_corr"]:
                    best = (k, y, info)
            k, y, info = best
            c = {**c, "take": k}
        else:
            x = to_stereo(sosfiltfilt(HP, read(TAKES / c["src"] / f"take-{c['take']}.wav"), axis=0))
            raw_clip = int(np.sum(np.abs(read(TAKES / c["src"] / f"take-{c['take']}.wav")) >= 0.9999))
            if raw_clip:
                raise SystemExit(f"{fid}: chosen take clips ({raw_clip} samples)")
            if c.get("shape") == "burst":
                y, info = cut_burst(x, c["length"], c["offset"])
            else:
                y, info = cut_tail(x, c["length"])
        y = normalize_peak(y, -3.0)
        y[0] = 0.0
        y[-1] = 0.0
        path = OUT / f"{fid}.wav"
        write(path, y)
        r = report(path)
        req = json.loads((TAKES / c["src"] / f"take-{c['take']}.json").read_text())["request"]
        log[fid] = {"take": f"{c['src']}/take-{c['take']}", "reason": c["reason"], "cut": info, "request": req,
                    "after": r}
        print(f"{fid:15s} <- {c['src']}/take-{c['take']}  {r['duration']} s  peak {r['peak_dbfs']}  first "
              f"{r['first_sound_ms']} ms  last {r['last_sound_s']} s  {info}")
    (TAKES / "choices.json").write_text(json.dumps(log, indent=1))


if __name__ == "__main__":
    main()

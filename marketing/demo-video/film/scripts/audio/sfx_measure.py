"""Objective measures of sound-effect takes (raw, before trimming).

Usage (from film/): .venv/bin/python scripts/audio/sfx_measure.py [id ...] [--json out.json]

Per take: raw peak and clipped samples; first and last sound (envelope above max(peak - 40 dB, -62 dBFS));
natural length; level before the first sound; attack (first sound to within 6 dB of the peak); loudest point
(10 ms RMS) relative to the first sound and as a fraction of the natural length; onsets (envelope rises of
more than 12 dB within 30 ms, at least 60 ms apart); spectral centroid; share of energy below 120 Hz and
above 4 kHz; level at the target cut point relative to the peak; a whine pitch trend (strongest component
between 800 Hz and 16 kHz, start vs end) for the television sounds.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, SR, FILM, db  # noqa: E402

CFG = json.loads((Path(__file__).resolve().parent / "prompts/sfx.json").read_text())


def env_rms(x, win=0.010, hop=0.001):
    m = x.mean(axis=1) if x.ndim == 2 else x
    w, h = int(win * SR), int(hop * SR)
    n = max(1, (len(m) - w) // h + 1)
    e = np.array([np.sqrt(np.mean(m[i * h:i * h + w] ** 2)) for i in range(n)])
    return 20 * np.log10(np.maximum(e, 1e-9)), h / SR, w / SR


def env_peak_1ms(x):
    m = np.max(np.abs(x), axis=1) if x.ndim == 2 else np.abs(x)
    w = int(0.001 * SR)
    n = len(m) // w
    return 20 * np.log10(np.maximum(m[: n * w].reshape(n, w).max(axis=1), 1e-9))


def measure(x, target, kind):
    pk = float(np.max(np.abs(x)))
    clipped = int(np.sum(np.abs(x) >= 0.9999))
    e1 = env_peak_1ms(x)
    thr = max(db(pk) - 40, -62)
    above = np.nonzero(e1 > thr)[0]
    first = above[0] * 0.001 if above.size else 0.0
    last = (above[-1] + 1) * 0.001 if above.size else 0.0
    pre = e1[: max(1, above[0] - 1)].max() if above.size and above[0] > 1 else -120.0
    er, hop, win = env_rms(x)
    ipk = int(np.argmax(er))
    t_loud = ipk * hop + win / 2
    a_idx = np.nonzero(e1 >= db(pk) - 6)[0]
    attack = (a_idx[0] * 0.001 - first) if a_idx.size else 0.0
    # onsets: rises > 12 dB within 30 ms on the 1 ms peak envelope, 60 ms apart
    ons = []
    for i in range(30, len(e1)):
        if e1[i] > thr and e1[i] - e1[i - 30:i].min() > 12 and (not ons or i - ons[-1] > 60):
            ons.append(i)
    m = x.mean(axis=1)
    seg = m[int(first * SR):int(last * SR)] if last > first else m
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2 if len(seg) > 64 else np.ones(10)
    f = np.fft.rfftfreq(len(seg), 1 / SR) if len(seg) > 64 else np.linspace(0, SR / 2, 10)
    tot = sp.sum() + 1e-12
    cen = float(np.sum(f * sp) / tot)
    low = float(sp[f < 120].sum() / tot)
    high = float(sp[f > 4000].sum() / tot)
    # level at the cut point first + target (relative to the peak), using 10 ms RMS
    cut = first + target
    ic = int(min(max((cut - win / 2) / hop, 0), len(er) - 1))
    cut_rel = float(er[ic] - er.max()) if cut < len(m) / SR else -120.0
    # whine trend: strongest component 800-16k in the first vs last third of the natural sound
    def strongest(a, b):
        s = m[int(a * SR):int(b * SR)]
        if len(s) < 2048:
            return None
        spec = np.abs(np.fft.rfft(s * np.hanning(len(s))))
        ff = np.fft.rfftfreq(len(s), 1 / SR)
        sel = (ff > 800) & (ff < 16000)
        return float(ff[sel][np.argmax(spec[sel])])
    L = last - first
    w0 = strongest(first + 0.15 * L, first + 0.4 * L) if L > 0.3 else None
    w1 = strongest(first + 0.6 * L, first + 0.85 * L) if L > 0.3 else None
    return {
        "dur_raw": round(len(m) / SR, 3), "peak_dbfs": round(db(pk), 2), "clipped": clipped,
        "first_s": round(first, 3), "last_s": round(last, 3), "natural_len": round(L, 3),
        "pre_db": round(float(pre), 1), "attack_ms": round(1000 * attack, 1),
        "loudest_from_first_s": round(t_loud - first, 3), "loudest_frac": round((t_loud - first) / L, 2) if L else 0,
        "onsets_ms": [int(o - first * 1000) for o in ons][:6], "centroid_hz": int(cen),
        "low_share": round(low, 3), "high_share": round(high, 3), "cut_rel_db": round(cut_rel, 1),
        "whine_hz": [w0 and int(w0), w1 and int(w1)],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--json", default=None)
    a = ap.parse_args()
    out = {}
    for e in CFG["effects"]:
        if a.ids and e["id"] not in a.ids:
            continue
        d = FILM / "_takes/audio/sfx" / e["id"]
        for p in sorted(d.glob("take-*.wav")):
            x = read(p)
            r = measure(x, e["target"], e["kind"])
            out[f"{e['id']}/{p.stem}"] = r
            print(f"{e['id']:13s} {p.stem}: len {r['natural_len']:.3f}/{e['target']} first {r['first_s']:.3f} "
                  f"pk {r['peak_dbfs']:6.2f} clip {r['clipped']} pre {r['pre_db']:6.1f} att {r['attack_ms']:5.1f}ms "
                  f"loud@{r['loudest_from_first_s']:.3f}({r['loudest_frac']}) ons {r['onsets_ms']} cen {r['centroid_hz']} "
                  f"low {r['low_share']} hi {r['high_share']} cut {r['cut_rel_db']} whine {r['whine_hz']}")
    if a.json:
        Path(a.json).write_text(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()

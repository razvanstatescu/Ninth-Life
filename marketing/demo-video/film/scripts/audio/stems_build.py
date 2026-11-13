"""Build public/audio/music/act2-drums.wav and act2-other.wav from the separated stems, conformed exactly like
act2.wav (same splice at 10.000 s with the same crossfade, same lift from 72 s, same end fade, same length).

Run from film/: .venv/bin/python scripts/audio/stems_build.py
Stems: _takes/audio/music/stems-t1 (take 1, first 12 s) and stems-t3 (take 3), six_stems_v1, raw 16-bit 48 kHz
stereo. drums = the drums stem; other = bass + guitar + other + piano + vocals (the vocals stem is reported; it
should be near silent).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, write, SR, FILM, db, peak  # noqa: E402
from music_conform import conform  # noqa: E402

M = FILM / "_takes/audio/music"
NAMES = ["bass", "drums", "guitar", "other", "piano", "vocals"]


def load_pcm(p: Path) -> np.ndarray:
    a = np.frombuffer(p.read_bytes(), dtype="<i2").astype(np.float64) / 32768.0
    return a.reshape(-1, 2)


def rms_db(x):
    return db(np.sqrt(np.mean(x ** 2)) + 1e-12)


def main():
    st = {k: {n: load_pcm(M / f"stems-{k}" / f"{n}.pcm") for n in NAMES} for k in ("t1", "t3")}
    src = {"t1": read(M / "act2-t1.wav")[: 12 * SR], "t3": read(M / "act2-t3.wav")}
    info = {}
    for k in ("t1", "t3"):
        s = sum(st[k].values())
        n = min(len(s), len(src[k]))
        info[k] = {"stem_rms_db": {nm: round(rms_db(v), 1) for nm, v in st[k].items()},
                   "mix_rms_db": round(rms_db(src[k][:n]), 1),
                   "residual_rms_db": round(rms_db(src[k][:n] - s[:n]), 1)}
    drums = {k: st[k]["drums"] for k in st}
    other = {k: sum(v for nm, v in st[k].items() if nm != "drums") for k in st}
    args = dict(splice=10.0, xfade_ms=10.0, lift_db=10.0, lift_from=72.0, lift_to=75.5, fade_out=0.5)
    d = conform(drums["t1"], drums["t3"], **args)
    o = conform(other["t1"], other["t3"], **args)
    for name, y in (("act2-drums.wav", d), ("act2-other.wav", o)):
        if peak(y) >= 0.999:
            raise SystemExit(f"{name} would clip")
        write(FILM / "public/audio/music" / name, y)
    full = read(FILM / "public/audio/music/act2.wav")
    recon = d + o
    info["final"] = {"act2_rms_db": round(rms_db(full), 1), "drums_rms_db": round(rms_db(d), 1),
                     "other_rms_db": round(rms_db(o), 1),
                     "residual_act2_minus_sum_rms_db": round(rms_db(full - recon), 1),
                     "drums_peak_dbfs": round(db(peak(d)), 2), "other_peak_dbfs": round(db(peak(o)), 2)}
    (M / "stems-info.json").write_text(json.dumps(info, indent=1))
    print(json.dumps(info, indent=1))


if __name__ == "__main__":
    main()

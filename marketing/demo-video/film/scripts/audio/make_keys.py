"""Make the 24 key tones with ffmpeg (no generation). Run from film/: .venv/bin/python scripts/audio/make_keys.py

old-*.wav  thin square wave through a tiny speaker, 90 ms, mono:
           ffmpeg aevalsrc band-limited square (odd harmonics up to 16 kHz, so no aliasing) at the note,
           highpass 900 Hz twice (4th order, a tiny speaker has no low end), lowpass 3200 Hz,
           5 ms fade in, 30 ms fade out; peak -3 dBFS.
new-*.wav  soft pluck, 500 ms, stereo:
           ffmpeg aevalsrc 0.5*sin(2*PI*f*t)*exp(-9*t) + 0.15*sin(2*PI*2*f*t)*exp(-14*t), 4 ms fade in;
           then a short synthetic small-room reverb (stereo impulse response, RT60 0.28 s, wet -15 dB below
           the dry, early reflections 7-31 ms, darkened tail) applied by ffmpeg afir; 40 ms fade out
           so the file ends at zero; peak -3 dBFS.
The motif "hello" is keys 4 3 5 5 6 = E4 D4 G4 G4 A4.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import SR, FILM, write, normalize_peak, fade, db, peak  # noqa: E402

KEYS = {  # file suffix: (note, Hz)
    "1": ("A3", 220.00), "2": ("C4", 261.63), "3": ("D4", 293.66), "4": ("E4", 329.63),
    "5": ("G4", 392.00), "6": ("A4", 440.00), "7": ("C5", 523.25), "8": ("D5", 587.33),
    "9": ("E5", 659.25), "0": ("A2", 110.00), "star": ("G3", 196.00), "hash": ("G5", 783.99),
}
OUT = FILM / "public" / "audio" / "keys"
OLD_DUR, NEW_DUR = 0.090, 0.500


def ffmpeg_render(lavfi: str, channels: int, extra_inputs: list[str] | None = None, fc: str | None = None) -> np.ndarray:
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error"]
    if fc is None:
        cmd += ["-f", "lavfi", "-i", lavfi]
    else:
        cmd += ["-f", "lavfi", "-i", lavfi]
        for p in extra_inputs or []:
            cmd += ["-i", p]
        cmd += ["-filter_complex", fc]
    cmd += ["-ac", str(channels), "-ar", str(SR), "-f", "f32le", "-acodec", "pcm_f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64).reshape(-1, channels)


def old_expr(f: float) -> str:
    terms = []
    k = 1
    while k * f < 16000:
        terms.append(f"sin(2*PI*{k * f:.4f}*t)/{k}")
        k += 2
    return f"0.5*4/PI*({'+'.join(terms)})"


def old_chain(f: float) -> str:
    return (f"aevalsrc=exprs='{old_expr(f)}':s={SR}:d={OLD_DUR},"
            "highpass=f=900,highpass=f=900,lowpass=f=3200,"
            f"afade=t=in:st=0:d=0.005:curve=qsin,afade=t=out:st={OLD_DUR - 0.030:.3f}:d=0.030:curve=qsin")


def new_expr(f: float) -> str:
    return f"0.5*sin(2*PI*{f}*t)*exp(-9*t)+0.15*sin(2*PI*{2 * f}*t)*exp(-14*t)"


def room_ir(seed: int = 9) -> np.ndarray:
    """Stereo small-room impulse response, wet only (no direct sound)."""
    rng = np.random.default_rng(seed)
    n = int(0.40 * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    # early reflections (ms, gain) per channel
    early = {0: [(7.1, 0.32), (13.3, 0.22), (19.7, 0.18), (29.3, 0.12)],
             1: [(8.9, 0.30), (11.9, 0.24), (23.1, 0.16), (31.1, 0.11)]}
    for ch, taps in early.items():
        for ms, g in taps:
            ir[int(ms / 1000 * SR), ch] += g * (1 if rng.random() > 0.5 else -1)
    rt60 = 0.28
    env = np.exp(-6.9078 * t / rt60) * np.clip((t - 0.012) / 0.020, 0, 1)
    tail = rng.standard_normal((n, 2)) * env[:, None] * 0.09
    # darken the tail: one-pole lowpass at ~3.5 kHz, gentle highpass at ~180 Hz
    a = np.exp(-2 * np.pi * 3500 / SR)
    for ch in range(2):
        y = np.zeros(n)
        acc = 0.0
        for i in range(n):
            acc = (1 - a) * tail[i, ch] + a * acc
            y[i] = acc
        hp = np.exp(-2 * np.pi * 180 / SR)
        z = np.zeros(n)
        prev_x = prev_y = 0.0
        for i in range(n):
            z[i] = hp * (prev_y + y[i] - prev_x)
            prev_x, prev_y = y[i], z[i]
        tail[:, ch] = z
    ir += tail
    return ir


def make_old(key: str, f: float) -> Path:
    x = ffmpeg_render(old_chain(f), 1)
    x = x[: int(round(OLD_DUR * SR))]
    x = normalize_peak(x, -3.0)
    x[0] = 0.0
    x[-1] = 0.0
    p = OUT / f"old-{key}.wav"
    write(p, x)
    return p


WET_INFO: dict = {}


def make_new(key: str, f: float, ir_path: str, wet_db: float = -15.0) -> Path:
    n = int(round(NEW_DUR * SR))
    src = f"aevalsrc=exprs='{new_expr(f)}':s={SR}:d={NEW_DUR + 0.4},afade=t=in:st=0:d=0.004:curve=qsin"
    dry = ffmpeg_render(src, 1)
    dry2 = np.repeat(dry, 2, axis=1)
    # wet only, through ffmpeg afir with the stereo room IR (no IR normalization, sample-aligned)
    fc = "[0:a]pan=stereo|c0=c0|c1=c0[s];[s][1:a]afir=irnorm=-1:minp=256:maxp=8192"
    wet = ffmpeg_render(src, 2, [ir_path], fc)
    m = min(len(dry2), len(wet))
    dry2, wet = dry2[:m], wet[:m]
    # wet level: RMS over the file length, wet_db below the dry
    r_dry = np.sqrt(np.mean(dry2[:n] ** 2))
    r_wet = np.sqrt(np.mean(wet[:n] ** 2)) + 1e-12
    g = 10 ** (wet_db / 20) * r_dry / r_wet
    WET_INFO[key] = round(20 * np.log10(g * r_wet / r_dry), 2)
    y = (dry2 + g * wet)[:n]
    y = fade(y, 0.0, 0.040, shape="sine")
    y = normalize_peak(y, -3.0)
    y[0] = 0.0
    y[-1] = 0.0
    p = OUT / f"new-{key}.wav"
    write(p, y)
    # keep a copy of the dry render for comparison
    return p


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ir = room_ir()
    tmp = Path(tempfile.mkdtemp())
    ir_path = str(tmp / "room-ir.wav")
    sf.write(ir_path, ir / (np.max(np.abs(ir)) * 1.01), SR, subtype="FLOAT")
    (FILM / "_takes/audio/keys").mkdir(parents=True, exist_ok=True)
    sf.write(str(FILM / "_takes/audio/keys/room-ir.wav"), ir / (np.max(np.abs(ir)) * 1.01), SR, subtype="FLOAT")
    log = []
    for key, (note, f) in KEYS.items():
        po = make_old(key, f)
        pn = make_new(key, f, ir_path)
        log.append({"key": key, "note": note, "hz": f, "old": str(po.relative_to(FILM)), "new": str(pn.relative_to(FILM)),
                    "old_cmd": "ffmpeg -f lavfi -i \"" + old_chain(f)[:120] + "...\"",
                    "new_expr": new_expr(f)})
        print(f"{key:>4} {note} {f:7.2f} Hz  -> {po.name}, {pn.name}")
    (FILM / "_takes/audio/keys/make_keys.log.json").write_text(json.dumps(log, indent=1))


if __name__ == "__main__":
    main()

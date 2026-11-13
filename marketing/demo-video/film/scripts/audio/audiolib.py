"""Shared helpers for the film's audio scripts (run with film/.venv/bin/python).

Reading, writing, measuring, trimming and normalizing WAV files. Everything at 48 kHz.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 48000
FILM = Path(__file__).resolve().parents[2]
PUBLIC_AUDIO = FILM / "public" / "audio"
TAKES = FILM / "_takes" / "audio"


def db(x: float) -> float:
    return float(20 * np.log10(max(float(x), 1e-12)))


def undb(d: float) -> float:
    return float(10 ** (d / 20))


def read(path: str | Path, sr: int = SR) -> np.ndarray:
    """Read any audio file as float64, shape (n, ch), resampled to `sr` with ffmpeg (soxr) if needed."""
    path = Path(path)
    try:
        info = sf.info(str(path))
        if info.samplerate == sr:
            x, _ = sf.read(str(path), dtype="float64", always_2d=True)
            return x
    except Exception:
        pass
    # decode / resample through ffmpeg to float32
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(path),
           "-af", f"aresample={sr}:resampler=soxr:precision=28", "-f", "f32le", "-acodec", "pcm_f32le", "-"]
    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries",
                            "stream=channels", "-of", "json", str(path)], capture_output=True, text=True, check=True)
    ch = json.loads(probe.stdout)["streams"][0]["channels"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64).reshape(-1, ch)
    return x


def write(path: str | Path, x: np.ndarray, sr: int = SR, subtype: str = "PCM_24") -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if x.ndim == 1:
        x = x[:, None]
    if np.max(np.abs(x)) > 1.0:
        raise ValueError(f"{path}: would clip (peak {np.max(np.abs(x)):.4f})")
    sf.write(str(path), x, sr, subtype=subtype)


def to_stereo(x: np.ndarray) -> np.ndarray:
    if x.ndim == 1:
        x = x[:, None]
    if x.shape[1] == 1:
        return np.repeat(x, 2, axis=1)
    return x[:, :2]


def peak(x: np.ndarray) -> float:
    return float(np.max(np.abs(x))) if x.size else 0.0


def normalize_peak(x: np.ndarray, target_db: float = -3.0) -> np.ndarray:
    p = peak(x)
    if p <= 0:
        return x
    return x * (undb(target_db) / p)


def fade(x: np.ndarray, fade_in_s: float = 0.005, fade_out_s: float = 0.005, sr: int = SR,
         shape: str = "sine") -> np.ndarray:
    """Apply fades (in place on a copy). shape 'sine' = quarter-sine (smooth), 'lin' = linear."""
    y = x.copy()
    n = y.shape[0]

    def ramp(m: int) -> np.ndarray:
        t = np.linspace(0.0, 1.0, m, endpoint=True)
        return np.sin(0.5 * np.pi * t) if shape == "sine" else t

    if fade_in_s > 0:
        m = min(n, max(1, int(round(fade_in_s * sr))))
        r = ramp(m)
        y[:m] *= r[:, None] if y.ndim == 2 else r
    if fade_out_s > 0:
        m = min(n, max(1, int(round(fade_out_s * sr))))
        r = ramp(m)[::-1]
        y[n - m:] *= r[:, None] if y.ndim == 2 else r
    return y


def envelope_db(x: np.ndarray, win_s: float = 0.005, sr: int = SR) -> np.ndarray:
    """Peak envelope in dBFS over windows of win_s (mono sum of abs)."""
    m = np.max(np.abs(x), axis=1) if x.ndim == 2 else np.abs(x)
    w = max(1, int(win_s * sr))
    nwin = int(np.ceil(len(m) / w))
    pad = np.zeros(nwin * w)
    pad[: len(m)] = m
    return 20 * np.log10(np.maximum(pad.reshape(nwin, w).max(axis=1), 1e-12))


def first_sound(x: np.ndarray, rel_db: float = -45.0, abs_db: float = -60.0, sr: int = SR) -> float:
    """Time (s) of the first sample above max(peak+rel_db, abs_db)."""
    m = np.max(np.abs(x), axis=1) if x.ndim == 2 else np.abs(x)
    thr = max(undb(db(m.max()) + rel_db), undb(abs_db))
    idx = np.nonzero(m > thr)[0]
    return float(idx[0] / sr) if idx.size else 0.0


def last_sound(x: np.ndarray, rel_db: float = -45.0, abs_db: float = -60.0, sr: int = SR) -> float:
    m = np.max(np.abs(x), axis=1) if x.ndim == 2 else np.abs(x)
    thr = max(undb(db(m.max()) + rel_db), undb(abs_db))
    idx = np.nonzero(m > thr)[0]
    return float((idx[-1] + 1) / sr) if idx.size else 0.0


def edge_jump(x: np.ndarray) -> dict:
    """Absolute sample values at the very start and end (a click check: both should be ~0)."""
    a = np.max(np.abs(x[0])) if x.ndim == 2 else abs(x[0])
    b = np.max(np.abs(x[-1])) if x.ndim == 2 else abs(x[-1])
    return {"start_abs": float(a), "end_abs": float(b)}


def click_score(x: np.ndarray, sr: int = SR) -> float:
    """Largest sample-to-sample jump in the high-passed signal relative to the RMS (high = clicks)."""
    m = x.mean(axis=1) if x.ndim == 2 else x
    d = np.diff(m)
    rms = np.sqrt(np.mean(d ** 2)) + 1e-12
    return float(np.max(np.abs(d)) / rms)


def clipped_samples(x: np.ndarray, thr: float = 0.999) -> int:
    return int(np.sum(np.abs(x) >= thr))


def sha256(path: str | Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def probe(path: str | Path) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                          "stream=sample_rate,channels,bits_per_sample,codec_name:format=duration",
                          "-of", "json", str(path)], capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    s = j["streams"][0]
    return {"sample_rate": int(s["sample_rate"]), "channels": int(s["channels"]),
            "bits": int(s.get("bits_per_sample") or 0), "codec": s["codec_name"],
            "duration": float(j["format"]["duration"])}


def loudness(path: str | Path) -> dict:
    """Integrated loudness (LUFS), loudness range and true peak via ffmpeg ebur128."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af",
                        "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    txt = r.stderr
    out = {}
    tail = txt[txt.rfind("Summary:"):]
    for line in tail.splitlines():
        line = line.strip()
        if line.startswith("I:"):
            out["lufs"] = float(line.split()[1])
        elif line.startswith("LRA:"):
            out["lra"] = float(line.split()[1])
        elif line.startswith("Peak:"):
            out["true_peak_dbtp"] = float(line.split()[1])
    return out


def synth_ffmpeg(expr: str, dur: float, filters: str | None = None, channels: int = 1, sr: int = SR) -> np.ndarray:
    """Render an ffmpeg aevalsrc expression (optionally through a filter chain) to a float64 array."""
    src = f"aevalsrc=exprs='{expr}':s={sr}:d={dur}"
    chain = src + ("," + filters if filters else "")
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", chain,
           "-f", "f32le", "-acodec", "pcm_f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64).reshape(-1, channels)


def report(path: str | Path) -> dict:
    """Objective measures of a finished file."""
    x = read(path)
    p = probe(path)
    out = {
        "path": str(Path(path).relative_to(FILM)) if str(path).startswith(str(FILM)) else str(path),
        "duration": round(x.shape[0] / SR, 4),
        "channels": p["channels"],
        "sample_rate": p["sample_rate"],
        "bits": p["bits"],
        "peak_dbfs": round(db(peak(x)), 2),
        "first_sound_ms": round(1000 * first_sound(x), 1),
        "last_sound_s": round(last_sound(x), 3),
        "start_abs": round(edge_jump(x)["start_abs"], 5),
        "end_abs": round(edge_jump(x)["end_abs"], 5),
        "clipped": clipped_samples(x),
    }
    return out

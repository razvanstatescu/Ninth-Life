"""Measurement helpers for the narrator's lines (see research-v2/14-narrator-voice-and-mix.md).

Shared by narration_select.py and narration_finish.py. Run those with film/.venv/bin/python -I -B.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, SR, db, FILM  # noqa: E402,F401
import librosa  # noqa: E402

PLAN = FILM / "scripts/audio/prompts/narration.json"
TAKES = FILM / "_takes/narration-v2"
THIRD_OCT = [100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000]


def plan():
    return json.loads(PLAN.read_text())


def words_of(text: str) -> list[str]:
    """Normalised words of a line (tags in [ ] dropped, punctuation dropped, lower case)."""
    out = []
    for w in re.sub(r"\[[^\]]*\]", " ", text).split():
        w = re.sub(r"[^a-z0-9']", "", w.lower())
        if w:
            out.append(w)
    return out


# Speech to text writes some words differently from the script although they sound the same.
STT_SPELLINGS = {"9th": "ninth"}
HOMOPHONES = {("wait", "weight")}  # (script, heard): the same sound, so not a reading error


def stt_matches(stt_text: str, line_text: str) -> tuple[bool, list[str]]:
    """True if the transcript has the line's words. Returns the accepted differences (spellings, homophones)."""
    heard = [STT_SPELLINGS.get(w, w) for w in words_of(stt_text)]
    want = words_of(line_text)
    if len(heard) != len(want):
        return False, []
    notes = []
    for h, w in zip(heard, want):
        if h == w:
            continue
        if (w, h) in HOMOPHONES:
            notes.append(f"heard '{h}' for '{w}' (homophone)")
            continue
        return False, []
    notes += [f"'{w}' written as '{s}'" for w in words_of(stt_text) for s in [STT_SPELLINGS.get(w)] if s]
    return True, notes


def envelope_1ms(m: np.ndarray) -> np.ndarray:
    w = int(0.001 * SR)
    n = len(m) // w
    return 20 * np.log10(np.maximum(np.abs(m[: n * w]).reshape(n, w).max(axis=1), 1e-9))


def speech_bounds(m: np.ndarray, rel: float = 40.0, floor: float = -60.0) -> tuple[float, float]:
    """First and last sound: 1 ms peak envelope above max(peak - rel dB, floor dBFS)."""
    e = envelope_1ms(m)
    thr = max(e.max() - rel, floor)
    i = np.nonzero(e > thr)[0]
    if not i.size:
        return 0.0, 0.0
    return i[0] * 0.001, (i[-1] + 1) * 0.001


def rms_frames(m: np.ndarray, win: float = 0.010) -> np.ndarray:
    w = int(win * SR)
    n = len(m) // w
    return 20 * np.log10(np.sqrt(np.mean(m[: n * w].reshape(n, w) ** 2, axis=1)) + 1e-12)


def silences(m: np.ndarray, a: float, b: float, rel: float = 35.0, floor: float = -65.0, min_len: float = 0.12):
    """Runs of 10 ms frames at least `rel` dB under the loudest frame (or under `floor`), inside [a, b), >= min_len.
    Returns [[start_s, end_s], ...] in the file's time."""
    seg = m[int(a * SR):int(b * SR)]
    r = rms_frames(seg)
    if not r.size:
        return []
    thr = max(r.max() - rel, floor)
    quiet = r < thr
    out, i, n = [], 0, len(r)
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            if (j - i) * 0.010 >= min_len - 1e-9:
                out.append([round(a + i * 0.010, 3), round(a + j * 0.010, 3)])
            i = j
        else:
            i += 1
    return out


def loudness(path) -> dict:
    """Integrated loudness (LUFS), loudness range and true peak via ffmpeg ebur128."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True)
    tail = r.stderr[r.stderr.rfind("Summary:"):]
    out = {}
    for line in tail.splitlines():
        line = line.strip()
        if line.startswith("I:"):
            out["lufs"] = float(line.split()[1])
        elif line.startswith("LRA:"):
            out["lra"] = float(line.split()[1])
        elif line.startswith("Peak:"):
            out["true_peak_dbtp"] = float(line.split()[1])
    return out


def ltas(seg: np.ndarray) -> np.ndarray:
    """Long-term average spectrum in 1/3-octave bands 100 Hz-8 kHz, normalised to its own mean (dB)."""
    nfft, hop = 4096, 1024
    if len(seg) < nfft:
        seg = np.pad(seg, (0, nfft - len(seg)))
    frames = librosa.util.frame(seg, frame_length=nfft, hop_length=hop)
    spec = np.mean(np.abs(np.fft.rfft(frames * np.hanning(nfft)[:, None], axis=0)) ** 2, axis=1)
    f = np.fft.rfftfreq(nfft, 1 / SR)
    bands = []
    for fc in THIRD_OCT:
        lo, hi = fc / 2 ** (1 / 6), fc * 2 ** (1 / 6)
        bands.append(10 * np.log10(spec[(f >= lo) & (f < hi)].mean() + 1e-20))
    bands = np.array(bands)
    return bands - bands.mean()


VOICED_BANDS = [100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000]


def voiced_ltas(seg: np.ndarray) -> np.ndarray:
    """Spectrum of the voiced frames only, 1/3-octave bands 100 Hz-4 kHz, normalised to its own mean (dB).
    The voice's timbre without the line's fricatives (s, f, th), which change the full-band spectrum a lot."""
    y = librosa.resample(seg.astype(np.float32), orig_sr=SR, target_sr=16000)
    _, vf, _ = librosa.pyin(y, fmin=50, fmax=420, sr=16000, frame_length=2048, hop_length=512)
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=512)) ** 2
    n = min(S.shape[1], len(vf))
    spec = S[:, :n][:, vf[:n]].mean(axis=1)
    f = librosa.fft_frequencies(sr=16000, n_fft=2048)
    bands = np.array([10 * np.log10(spec[(f >= fc / 2 ** (1 / 6)) & (f < fc * 2 ** (1 / 6))].mean() + 1e-20)
                      for fc in VOICED_BANDS])
    return bands - bands.mean()


def ltas_dist(a, b) -> float:
    return float(np.sqrt(np.mean((np.asarray(a) - np.asarray(b)) ** 2)))


def pitch(seg: np.ndarray):
    """pYIN 50-420 Hz, 128 ms window at 16 kHz, voiced frames within 25 dB of the loudest frame."""
    y = librosa.resample(seg.astype(np.float32), orig_sr=SR, target_sr=16000)
    f0, _, _ = librosa.pyin(y, fmin=50, fmax=420, sr=16000, frame_length=2048, hop_length=160)
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=160)[0]
    n = min(len(f0), len(rms))
    f0, rms = f0[:n], rms[:n]
    loud = 20 * np.log10(rms + 1e-9) > 20 * np.log10(rms.max() + 1e-9) - 25
    v = f0[~np.isnan(f0) & loud]
    if not v.size:
        return None
    st = 12 * np.log2(v / np.median(v))
    return {"f0_median_hz": round(float(np.median(v)), 1),
            "f0_range_st": round(float(np.percentile(st, 90) - np.percentile(st, 10)), 2)}


def click_score(m: np.ndarray) -> float:
    """Largest sample-to-sample jump relative to the RMS of the differences (high = a click)."""
    d = np.diff(m)
    return float(np.max(np.abs(d)) / (np.sqrt(np.mean(d ** 2)) + 1e-12))


def st(a: float, b: float) -> float:
    """Semitones from b to a."""
    return float(12 * np.log2(a / b))


# ---- processing (research-v2/14, section 4.3) ------------------------------------------------------------------
NARRATOR_CHAIN = ",".join([
    "highpass=f=80:poles=2",
    "acompressor=threshold=-16dB:ratio=2:attack=10:release=120:knee=6:makeup=1",
    "equalizer=f=3000:t=q:w=1.0:g=2",
    "deesser=i=0.4:m=0.5:f=0.5:s=o",
])


def _ff(src: Path, dst: Path, af: str) -> None:
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src), "-af", af, "-ac", "1",
                    "-c:a", "pcm_f32le", str(dst)], check=True)


def write_f32(path: Path, x: np.ndarray) -> None:
    import soundfile as sf
    sf.write(str(path), x, SR, subtype="FLOAT")


def level_and_limit(x: np.ndarray, target: float, ceiling_dbtp: float, tmp: Path, chain: str | None = None,
                    tol: float = 0.05) -> tuple[np.ndarray, dict]:
    """Optionally run `chain` at the target level, then set the level and limit true peaks (4x oversampled alimiter)
    so the result sits at `target` LUFS integrated with true peak <= ceiling. The limiter is the last stage, and the
    gain in front of it is iterated, because limiting lowers the loudness a little."""
    tmp.mkdir(parents=True, exist_ok=True)
    a, b, c = tmp / "lv-in.wav", tmp / "lv-mid.wav", tmp / "lv-out.wav"
    write_f32(a, x)
    pre = target - loudness(a)["lufs"]
    if chain:
        _ff(a, b, f"volume={pre:.3f}dB,{chain}")
        g = target - loudness(b)["lufs"]
    else:
        b = a
        g = pre
    limit = 10 ** ((ceiling_dbtp - 0.05) / 20)  # a hair under the ceiling at 192 kHz
    lim = f"aresample=192000,alimiter=limit={limit:.4f}:attack=1:release=60:level=disabled:latency=1,aresample=48000"
    hist = []
    for _ in range(8):
        _ff(b, c, f"volume={g:.3f}dB,{lim}")
        L = loudness(c)
        hist.append({"gain_db": round(g, 3), "lufs": L["lufs"], "true_peak_dbtp": L["true_peak_dbtp"]})
        if abs(L["lufs"] - target) <= tol:
            break
        g += target - L["lufs"]
    y = read(c).mean(axis=1)
    for p in (a, c) + ((b,) if chain else ()):
        p.unlink(missing_ok=True)
    return y, {"pre_gain_db": round(pre, 3), "chain": chain, "limit_dbtp": ceiling_dbtp, "iterations": hist}


def fades(y: np.ndarray, fade_in: float, fade_out: float) -> np.ndarray:
    y = y.copy()
    n_in, n_out = max(1, int(fade_in * SR)), max(1, int(fade_out * SR))
    y[:n_in] *= np.sin(0.5 * np.pi * np.linspace(0, 1, n_in))
    y[-n_out:] *= np.sin(0.5 * np.pi * np.linspace(1, 0, n_out))
    y[0] = 0.0
    y[-1] = 0.0
    return y

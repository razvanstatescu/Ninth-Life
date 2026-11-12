"""Objective measures of the narrator test takes (research-v2/14-narrator-voice-and-mix.md).

Run (isolated): film/.venv/bin/python -I measure.py <takesDir> <angelaVoiceDir>
Reads <takesDir>/<label>/<variant>/<line>-take<k>.wav with its .json (TTS request + alignment) and .stt.json.
Writes <takesDir>/metrics.json and prints one row per take.

Speech span: 1 ms peak envelope above max(peak - 40 dB, -60 dBFS), as in film/scripts/audio/voice_measure.py.
Pauses: runs of 10 ms frames whose RMS is 35 dB or more under the take's loudest 10 ms frame (floor -65 dBFS),
  at least 120 ms long, inside the speech span. Also the gaps between speech-to-text words (>= 120 ms).
Loudness: ffmpeg ebur128 (integrated LUFS, LRA, true peak dBTP).
Pitch: librosa pyin 50-420 Hz, 128 ms window, voiced frames within 25 dB of the loudest: median (Hz), p10-p90
  range and standard deviation (semitones).
Timbre: long-term average spectrum in 1/3-octave bands 100 Hz-8 kHz, normalised to its own mean, so a distance
  between two takes is the RMS difference in dB across bands (a rough "how different does it sound" number).
Alignment: TTS character times grouped into words (the [tag] dropped) against speech-to-text word starts.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

FILM = Path(__file__).resolve().parents[2] / "film"
sys.path.insert(0, str(FILM / "scripts" / "audio"))
from audiolib import read, SR, db  # noqa: E402
import librosa  # noqa: E402

SYLLABLES = {"A": 13, "B": 14}  # Nine keys. One press per let-ter. And the phone guessed the word. / Some peo-ple type to talk. For an af-ter-noon, or for good.
THIRD_OCT = [100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000]


def words_of(text):
    return [re.sub(r"[^a-z']", "", w.lower()) for w in re.sub(r"\[[^\]]*\]", " ", text).split() if re.sub(r"[^a-z']", "", w.lower())]


def speech_bounds(m, rel=40.0, floor=-60.0):
    w = int(0.001 * SR)
    n = len(m) // w
    e = 20 * np.log10(np.maximum(np.abs(m[: n * w]).reshape(n, w).max(axis=1), 1e-9))
    thr = max(e.max() - rel, floor)
    i = np.nonzero(e > thr)[0]
    if not i.size:
        return 0.0, 0.0
    return i[0] * 0.001, (i[-1] + 1) * 0.001


def energy_pauses(m, a, b, rel=35.0, floor=-65.0, min_len=0.12):
    w = int(0.010 * SR)
    seg = m[int(a * SR):int(b * SR)]
    n = len(seg) // w
    rms = 20 * np.log10(np.sqrt(np.mean(seg[: n * w].reshape(n, w) ** 2, axis=1)) + 1e-12)
    thr = max(rms.max() - rel, floor)
    quiet = rms < thr
    out, i = [], 0
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            if (j - i) * 0.010 >= min_len:
                out.append([round(a + i * 0.010, 2), round((j - i) * 0.010, 2)])
            i = j
        else:
            i += 1
    return out


def loudness(path):
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


def ltas(seg):
    f, pxx = None, None
    nfft = 4096
    hop = 1024
    if len(seg) < nfft:
        seg = np.pad(seg, (0, nfft - len(seg)))
    frames = librosa.util.frame(seg, frame_length=nfft, hop_length=hop)
    win = np.hanning(nfft)[:, None]
    spec = np.mean(np.abs(np.fft.rfft(frames * win, axis=0)) ** 2, axis=1)
    f = np.fft.rfftfreq(nfft, 1 / SR)
    bands = []
    for fc in THIRD_OCT:
        lo, hi = fc / 2 ** (1 / 6), fc * 2 ** (1 / 6)
        sel = (f >= lo) & (f < hi)
        bands.append(10 * np.log10(spec[sel].mean() + 1e-20))
    bands = np.array(bands)
    return bands - bands.mean()


def pitch(seg):
    """pyin 50-420 Hz, 128 ms window at 16 kHz, on voiced frames within 25 dB of the loudest frame.
    (A 64 ms window and all voiced frames gave medians up to 6 semitones apart between two settings; with this
    gate pyin and librosa.yin agree within 0.5 Hz on every take.)"""
    y = librosa.resample(seg.astype(np.float32), orig_sr=SR, target_sr=16000)
    f0, vflag, vprob = librosa.pyin(y, fmin=50, fmax=420, sr=16000, frame_length=2048, hop_length=160)
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=160)[0]
    n = min(len(f0), len(rms))
    f0, rms = f0[:n], rms[:n]
    loud = 20 * np.log10(rms + 1e-9) > 20 * np.log10(rms.max() + 1e-9) - 25
    v = f0[~np.isnan(f0) & loud]
    if not v.size:
        return None
    st = 12 * np.log2(v / np.median(v))
    return {"f0_median_hz": round(float(np.median(v)), 1),
            "f0_range_st": round(float(np.percentile(st, 90) - np.percentile(st, 10)), 2),
            "f0_sd_st": round(float(np.std(st)), 2),
            "voiced_share": round(float(np.mean(~np.isnan(f0[:n]))), 2)}


def tts_words(al):
    """Group TTS character times into words; drop a leading [tag]."""
    chars, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    out, cur, in_tag = [], None, False
    for c, a, b in zip(chars, st, en):
        if c == "[":
            in_tag = True
            continue
        if in_tag:
            if c == "]":
                in_tag = False
            continue
        if c.isspace():
            if cur:
                out.append(cur)
                cur = None
            continue
        if cur is None:
            cur = {"text": "", "start": a, "end": b, "letters": []}
        cur["text"] += c
        if c.isalnum() or c == "'":
            cur["end"] = b
            cur["letters"].append(b - a)
    if cur:
        out.append(cur)
    return out


def measure(wav: Path, angela_ltas=None, angela_f0=None):
    meta = json.loads(wav.with_suffix(".json").read_text())
    stt_path = wav.with_suffix(".stt.json")
    stt = json.loads(stt_path.read_text()) if stt_path.exists() else None
    x = read(wav)
    m = x.mean(axis=1)
    a, b = speech_bounds(m)
    seg = m[int(a * SR):int(b * SR)]
    span = b - a
    line = meta["line"]
    nwords = len(words_of(meta["line_text"]))
    lead = m[: max(int((a - 0.02) * SR), 0)]
    noise = db(np.sqrt(np.mean(lead ** 2))) if lead.size > SR * 0.02 else None
    pk = db(np.max(np.abs(x)))
    row = {
        "file": str(wav.relative_to(wav.parents[2])), "label": meta["label"], "variant": meta["variant"], "line": line,
        "take": meta["take"], "model_id": meta["model_id"], "voice_id": meta["voice_id"],
        "file_s": round(len(m) / SR, 3), "first_s": round(a, 3), "last_s": round(b, 3), "speech_s": round(span, 3),
        "tail_silence_s": round(len(m) / SR - b, 3),
        "words": nwords, "wps": round(nwords / span, 2), "syl_per_s": round(SYLLABLES[line] / span, 2),
        "peak_dbfs": round(pk, 2), "clipped": int(np.sum(np.abs(x) >= 0.9999)),
        "lead_noise_dbfs": round(noise, 1) if noise is not None else None,
        "pauses_energy": energy_pauses(m, a, b),
        **loudness(wav),
    }
    p = pitch(seg)
    if p:
        row.update(p)
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
    f = np.fft.rfftfreq(len(seg), 1 / SR)
    row["centroid_hz"] = int(np.sum(f * sp) / np.sum(sp))
    row["hf_share_4k"] = round(float(sp[f > 4000].sum() / sp.sum()), 4)
    row["low_share_100_300"] = round(float(sp[(f >= 100) & (f < 300)].sum() / sp.sum()), 3)
    row["presence_share_1k_4k"] = round(float(sp[(f >= 1000) & (f < 4000)].sum() / sp.sum()), 3)
    L = ltas(seg)
    row["_ltas"] = [round(float(v), 2) for v in L]
    if angela_ltas is not None:
        row["ltas_dist_angela_db"] = round(float(np.sqrt(np.mean((L - angela_ltas) ** 2))), 2)
    if angela_f0 and p:
        row["f0_vs_angela_st"] = round(float(12 * np.log2(p["f0_median_hz"] / angela_f0)), 1)
    # transcript and pauses from speech to text
    if stt:
        row["stt_text"] = stt["text"]
        row["stt_model"] = stt["model"]
        row["stt_match"] = words_of(stt["text"]) == words_of(meta["line_text"])
        sw = stt["words"]
        row["pauses_stt"] = [[w0["text"], round(w1["start"] - w0["end"], 2)] for w0, w1 in zip(sw, sw[1:]) if w1["start"] - w0["end"] >= 0.12]
        row["stt_min_logprob"] = round(min(w["logprob"] for w in sw), 3) if sw else None
    # TTS alignment quality
    if meta.get("alignment"):
        tw = tts_words(meta["alignment"])
        letters = [d for w in tw for d in w["letters"]]
        row["align_letter_ms_sd"] = round(1000 * float(np.std(letters)), 1) if letters else None
        row["align_end_s"] = round(tw[-1]["end"], 3) if tw else None
        if stt and len(tw) == len(stt["words"]):
            d = [abs(t["start"] - s["start"]) for t, s in zip(tw, stt["words"])]
            row["align_vs_stt_ms_mean"] = round(1000 * float(np.mean(d)), 0)
            row["align_vs_stt_ms_max"] = round(1000 * float(np.max(d)), 0)
    return row


def main():
    takes = Path(sys.argv[1])
    angela_dir = Path(sys.argv[2])
    # Angela reference: her three film lines, joined
    segs, f0s = [], []
    for w in sorted(angela_dir.glob("*.wav")):
        y = read(w).mean(axis=1)
        a, b = speech_bounds(y)
        segs.append(y[int(a * SR):int(b * SR)])
    ang = np.concatenate(segs)
    angela_ltas = ltas(ang)
    ap = pitch(ang)
    angela = {"files": [p.name for p in sorted(angela_dir.glob('*.wav'))], **ap, "centroid_note": "joined speech of the three lines"}
    rows = []
    for wav in sorted(takes.glob("*/*/*-take*.wav")):
        rows.append(measure(wav, angela_ltas, ap["f0_median_hz"]))
    # A vs B per voice and variant (same take number): timbre and pitch distance
    by = {}
    for r in rows:
        by.setdefault((r["label"], r["variant"], r["take"]), {})[r["line"]] = r
    pairs = []
    for (lab, var, k), d in sorted(by.items()):
        if "A" in d and "B" in d:
            la, lb = np.array(d["A"]["_ltas"]), np.array(d["B"]["_ltas"])
            pairs.append({"label": lab, "variant": var, "take": k,
                          "ltas_dist_A_B_db": round(float(np.sqrt(np.mean((la - lb) ** 2))), 2),
                          "f0_A_minus_B_st": round(float(12 * np.log2(d["A"]["f0_median_hz"] / d["B"]["f0_median_hz"])), 1)})
    # take-to-take (same voice, variant and line, different takes)
    t2t = []
    groups = {}
    for r in rows:
        groups.setdefault((r["label"], r["variant"], r["line"]), []).append(r)
    for (lab, var, line), g in sorted(groups.items()):
        if len(g) > 1:
            g = sorted(g, key=lambda r: r["take"])
            for r0, r1 in zip(g, g[1:]):
                t2t.append({"label": lab, "variant": var, "line": line, "takes": [r0["take"], r1["take"]],
                            "ltas_dist_db": round(float(np.sqrt(np.mean((np.array(r0["_ltas"]) - np.array(r1["_ltas"])) ** 2))), 2),
                            "f0_diff_st": round(float(12 * np.log2(r1["f0_median_hz"] / r0["f0_median_hz"])), 1),
                            "speech_s": [r0["speech_s"], r1["speech_s"]], "lufs": [r0.get("lufs"), r1.get("lufs")]})
    out = {"angela_reference": angela, "takes": rows, "a_vs_b": pairs, "take_to_take": t2t}
    (takes / "metrics.json").write_text(json.dumps(out, indent=2))
    print(f"Angela (app voice) reference: F0 median {ap['f0_median_hz']} Hz, range {ap['f0_range_st']} st")
    hdr = f"{'take':28s} {'spch':>5s} {'wps':>5s} {'syl/s':>5s} {'LUFS':>6s} {'TP':>6s} {'LRA':>4s} {'F0':>6s} {'rng':>5s} {'sd':>4s} {'cent':>5s} {'vsAng':>5s} {'LTd':>5s} {'noise':>6s} {'algn':>5s} stt pauses(energy)"
    print(hdr)
    for r in rows:
        print(f"{r['label']+'/'+r['variant']+'/'+r['line']+str(r['take']):28s} {r['speech_s']:5.2f} {r['wps']:5.2f} {r['syl_per_s']:5.2f} "
              f"{r.get('lufs', 0):6.1f} {r.get('true_peak_dbtp', 0):6.1f} {r.get('lra', 0):4.1f} {r.get('f0_median_hz', 0):6.1f} {r.get('f0_range_st', 0):5.1f} "
              f"{r.get('f0_sd_st', 0):4.1f} {r['centroid_hz']:5d} {r.get('f0_vs_angela_st', 0):5.1f} {r.get('ltas_dist_angela_db', 0):5.1f} "
              f"{(r['lead_noise_dbfs'] if r['lead_noise_dbfs'] is not None else float('nan')):6.1f} {r.get('align_vs_stt_ms_mean', float('nan')):5.0f} "
              f"{'ok' if r.get('stt_match') else 'NO'} {r['pauses_energy']}")
    print("\nA vs B:", json.dumps(pairs))
    print("take to take:", json.dumps(t2t))


if __name__ == "__main__":
    main()

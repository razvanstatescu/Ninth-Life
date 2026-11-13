"""Choose, trim and level the spoken lines; write public/audio/voice/<id>.wav and src/data/voice.json.

Run from film/: .venv/bin/python scripts/audio/voice_finalize.py [--voice angela --variant v2s75]

Choice per line, from the takes of every variant given (default v2s70 and v2s75) in
_takes/audio/voice/<voice>/<variant>/<line>/:
  must: the speech-to-text words equal the line's words; speech (first to last sound) inside the target range
        both when sound is measured at -30 dB and at -40 dB under the peak; no clipped samples.
  then: lowest score = pitch range (semitones, p5-p95) / 6 + distance of the median pitch from the median of all
        takes (semitones) / 2 + distance from the middle of the target range / half the range * 0.5.
  A line that already has a choice in _takes/audio/voice/choices.json keeps that take (so adding a line does not
  move the others); pass --rechoose to choose every line again.
Trim: start 15 ms before the first sound (1 ms peak envelope above max(peak - 40 dB, -60 dBFS)), 5 ms fade in; end
      120 ms after the last sound with a 60 ms fade out; mono, 48 kHz, 24-bit.
Level (2026-11-10, second cut): every line at -17 LUFS integrated, true peak at most -4.5 dBTP (a 4x oversampled
      limiter after the gain, which only acts on a line whose peaks would pass the ceiling). In the stereo render a
      mono clip on both channels reads about -14 LUFS: 2 LU above the narrator (narration_finish.py, -19 LUFS).
      Before this, each line was set to a -3 dBFS peak, which left the three lines 4 LU apart.
Words: the TTS character alignment grouped into words (punctuation stays with its word), start = first character,
       end = last letter; the first start is clamped to the first sound and the last end to the last sound; all
       times are from the start of the trimmed file. Each word is compared with the speech-to-text word times.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, write, SR, FILM, db, normalize_peak, fade, report  # noqa: E402,F401
from voice_measure import measure, speech_bounds  # noqa: E402
from narration_lib import level_and_limit, fades  # noqa: E402

CFG = json.loads((Path(__file__).resolve().parent / "prompts/voice.json").read_text())
APP_LUFS = -17.0
APP_TP = -4.5
CHOICES = FILM / "_takes/audio/voice/choices.json"


def words_of(text):
    return [re.sub(r"[^a-z']", "", w.lower()) for w in text.split()]


def align_words(al, text):
    chars = al["characters"]
    st = al["character_start_times_seconds"]
    en = al["character_end_times_seconds"]
    out, cur = [], None
    for c, a, b in zip(chars, st, en):
        if c.isspace():
            if cur:
                out.append(cur)
                cur = None
            continue
        if cur is None:
            cur = {"text": "", "start": a, "end": None}
        cur["text"] += c
        if c.isalnum() or c == "'":
            cur["end"] = b
    if cur:
        out.append(cur)
    for w in out:
        if w["end"] is None:
            w["end"] = w["start"]
    # the line's own words (with punctuation), in order
    line_words = text.split()
    if [w["text"] for w in out] != line_words:
        raise ValueError(f"alignment words {[w['text'] for w in out]} != line {line_words}")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default=CFG.get("chosen", {}).get("voice", "angela"))
    ap.add_argument("--variants", default=",".join(CFG.get("chosen", {}).get("variants", ["v2s70", "v2s75"])))
    ap.add_argument("--rechoose", action="store_true", help="choose every line again, ignoring choices.json")
    a = ap.parse_args()
    kept = {} if a.rechoose or not CHOICES.exists() else {k: v["chosen"] for k, v in json.loads(CHOICES.read_text()).items()}
    cand = {}
    for line in CFG["lines"]:
        rows = []
        for variant in a.variants.split(","):
            base = FILM / "_takes/audio/voice" / a.voice / variant
            for wav in sorted((base / line["id"]).glob("take-*.wav")):
                meta = json.loads(wav.with_suffix(".json").read_text())
                stt = json.loads(wav.with_suffix(".stt.json").read_text())
                m = measure(wav)
                stt_ok = words_of(stt["text"]) == words_of(line["text"])
                lo, hi = line["target_s"]
                mono = read(wav).mean(axis=1)
                a30, b30 = speech_bounds(mono, rel=30.0, floor=-70.0)
                # strict: inside the range whether the sound is measured at -30 dB or at -40 dB under the peak
                in_range = lo <= (b30 - a30) and m["speech_s"] <= hi
                rows.append({"wav": wav, "variant": variant, "meta": meta, "stt": stt, "m": m, "stt_ok": stt_ok,
                             "span30": round(b30 - a30, 3), "in_range": in_range, "clip_ok": m["clipped"] == 0})
        cand[line["id"]] = rows
    all_f0 = [r["m"]["f0_median_hz"] for rows in cand.values() for r in rows if r["m"]["f0_median_hz"]]
    f0_ref = float(np.median(all_f0))

    voice_json, log = {}, {}
    for line in CFG["lines"]:
        lo, hi = line["target_s"]
        mid, half = (lo + hi) / 2, (hi - lo) / 2
        rows = cand[line["id"]]
        for r in rows:
            m = r["m"]
            r["score"] = round((m["f0_range_st"] or 9) / 6 + abs(12 * np.log2((m["f0_median_hz"] or f0_ref) / f0_ref)) / 2
                               + abs(m["speech_s"] - mid) / half * 0.5, 3)
        ok = [r for r in rows if r["stt_ok"] and r["in_range"] and r["clip_ok"]]
        pool = ok or [r for r in rows if r["stt_ok"] and r["clip_ok"]]
        if not pool:
            raise SystemExit(f"{line['id']}: no take passes the transcript and clipping checks")
        best = min(pool, key=lambda r: r["score"] if r in ok else 99 + abs(r["m"]["speech_s"] - mid))
        keep = kept.get(line["id"])
        if keep:
            match = [r for r in rows if f"{r['variant']}/{r['wav'].name}" == keep]
            if not match:
                raise SystemExit(f"{line['id']}: recorded choice {keep} not found; run with --rechoose")
            best = match[0]
        x = read(best["wav"])
        mono = x.mean(axis=1)
        first, last = speech_bounds(mono)
        t0 = max(first - 0.015, 0.0)
        t1 = min(last + 0.120, len(mono) / SR)
        y = mono[int(round(t0 * SR)):int(round(t1 * SR))]
        z, level = level_and_limit(y, APP_LUFS, APP_TP, FILM / "_takes/audio/voice/tmp")
        y = fades(z, 0.005, 0.060)[:, None]
        out = FILM / "public/audio/voice" / f"{line['id']}.wav"
        write(out, y)
        dur = len(y) / SR
        words = align_words(best["meta"]["alignment"], line["text"])
        for w in words:
            w["start"] = w["start"] - t0
            w["end"] = w["end"] - t0
        words[0]["start"] = max(words[0]["start"], first - t0)
        words[-1]["end"] = min(words[-1]["end"], last - t0)
        for w in words:
            w["start"] = round(max(0.0, min(w["start"], dur)), 3)
            w["end"] = round(max(w["start"], min(w["end"], dur)), 3)
        # compare with speech-to-text word times
        sw = best["stt"]["words"]
        cmp = []
        for w, s in zip(words, sw):
            cmp.append({"word": w["text"], "tts": [w["start"], w["end"]],
                        "stt": [round(s["start"] - t0, 3), round(s["end"] - t0, 3)],
                        "d_start_ms": round(1000 * (w["start"] - (s["start"] - t0))),
                        "d_end_ms": round(1000 * (w["end"] - (s["end"] - t0)))})
        voice_json[line["id"]] = {"file": f"audio/voice/{line['id']}.wav", "text": line["text"],
                                  "duration": round(dur, 3), "words": words}
        rep = report(out)
        log[line["id"]] = {
            "chosen": f"{best['variant']}/{best['wav'].name}", "variant": best["variant"], "voice_id": best["meta"]["voice_id"], "model_id": best["meta"]["model_id"],
            "settings": best["meta"]["request"]["voice_settings"], "trim": [round(t0, 4), round(t1, 4)],
            "speech_s": round(last - first, 3), "duration": round(dur, 3), "stt": best["stt"]["text"],
            "kept_previous_choice": bool(keep), "level": level,
            "stt_model": best["stt"]["model"], "word_check": cmp, "after": rep,
            "takes": [{"take": f"{r['variant']}/{r['wav'].name}", "speech_s": r["m"]["speech_s"], "span_30db_s": r["span30"], "f0_median_hz": r["m"]["f0_median_hz"],
                       "f0_range_st": r["m"]["f0_range_st"], "peak_dbfs": r["m"]["peak_dbfs"],
                       "stt": r["stt"]["text"], "stt_ok": r["stt_ok"], "in_range": r["in_range"],
                       "score": r["score"]} for r in rows],
        }
        print(f"{line['id']}: {best['variant']}/{best['wav'].name} speech {last - first:.3f} s, file {dur:.3f} s, "
              f"words {[(w['text'], w['start'], w['end']) for w in words]}")
        for c in cmp:
            print(f"    {c['word']:8s} tts {c['tts']} stt {c['stt']}  d_start {c['d_start_ms']} ms d_end {c['d_end_ms']} ms")
        for r in rows:
            print(f"    {r['variant']}/{r['wav'].name}: speech {r['m']['speech_s']} (at -30 dB {r['span30']}) f0 {r['m']['f0_median_hz']} range "
                  f"{r['m']['f0_range_st']} st peak {r['m']['peak_dbfs']} stt_ok {r['stt_ok']} in_range {r['in_range']} "
                  f"score {r['score']}")
    (FILM / "src/data").mkdir(parents=True, exist_ok=True)
    (FILM / "src/data/voice.json").write_text(json.dumps(voice_json, indent=2) + "\n")
    (FILM / "_takes/audio/voice/choices.json").write_text(json.dumps(log, indent=1, default=str))


if __name__ == "__main__":
    main()

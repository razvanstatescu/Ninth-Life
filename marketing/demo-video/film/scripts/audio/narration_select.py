"""Measure the takes of one narrator line and choose one.

Run (from film/): .venv/bin/python -I -B scripts/audio/narration_select.py <line-id> [--final]
Reads _takes/narration-v2/<id>/take-*.wav, .json (TTS request) and .stt.json (speech to text with word times),
and the select.json of the lines already chosen in the same act. Writes _takes/narration-v2/<id>/select.json and
prints one line of JSON: {"chosen": "take-2" | null, "fallback": bool}.

Must pass (the lead's rules, 2026-11-10):
  - the speech-to-text words equal the line's words (accepting "9th" for "ninth" and the homophone "weight" for
    "wait"); no clipped samples; no non-speech audio event in the transcript (a breath is allowed); no internal
    silence longer than 1.5 s; not cut off (the first 10 ms and the last 20 ms of the file at least 50 dB under its
    peak: one n03 take ended mid-word at -29.5 dB);
  - pace 2.2 to 2.8 words a second (words / first word start to last word end, from speech to text);
  - consistent with the lines already chosen in this act (the last three): median pitch within 4 semitones of their
    mean, and the timbre (spectrum of the voiced frames, 1/3 octaves 100 Hz-4 kHz) within 4 dB of their mean. For the
    first line of an act, the reference is the mean of this line's own takes. (The full-band spectrum is kept as
    `d_ltas_db` for information only: in the first run it failed lines for their s, f and th sounds, not their voice.)
Then the lowest score wins: |pace - 2.5| / 0.3 + |pitch difference| / 2 + timbre distance / 3, plus 0.5 for sound
more than 0.4 s after the last word or 0.25 s before the first, plus 0.5 for a click score 1.5 times the median.
Without --final, no passing take means "chosen": null (the caller makes one extra round). With --final, the best
take that at least matches the words and does not clip is chosen and marked as a fallback.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from narration_lib import (TAKES, SR, read, plan, words_of, speech_bounds, silences, loudness, ltas, ltas_dist,  # noqa: E402
                           pitch, click_score, st, stt_matches, voiced_ltas)

PACE = (2.2, 2.8)
BREATH = ("breath", "inhale", "exhale", "breathing")


def measure(wav: Path, line: dict) -> dict:
    meta = json.loads(wav.with_suffix(".json").read_text())
    stt = json.loads(wav.with_suffix(".stt.json").read_text())
    x = read(wav).mean(axis=1)
    first, last = speech_bounds(x)
    sw = stt["words"]
    n = len(words_of(line["text"]))
    w0, w1 = (sw[0]["start"], sw[-1]["end"]) if sw else (first, last)
    span = max(w1 - w0, 1e-3)
    sil = silences(x, w0, w1, min_len=0.12)
    long_p = [p for p in sil if p[1] - p[0] > 0.35]
    seg = x[int(first * SR):int(last * SR)]
    p = pitch(seg) or {"f0_median_hz": None, "f0_range_st": None}
    L = loudness(wav)
    lead = x[: max(int((first - 0.02) * SR), 0)]
    events = [e for e in stt.get("events", []) if not any(b in e.lower() for b in BREATH)]
    ok_words, notes = stt_matches(stt["text"], line["text"])
    pk = 20 * np.log10(np.max(np.abs(x)) + 1e-12)
    end_db = round(20 * np.log10(np.sqrt(np.mean(x[-int(0.020 * SR):] ** 2)) + 1e-12) - pk, 1)
    start_db = round(20 * np.log10(np.sqrt(np.mean(x[:int(0.010 * SR)] ** 2)) + 1e-12) - pk, 1)
    return {
        "end_20ms_db_re_peak": end_db, "start_10ms_db_re_peak": start_db,
        "take": wav.stem, "seed": meta["request"].get("seed"), "request_id": meta["response_headers"].get("request-id"),
        "previous_request_ids": meta["request"].get("previous_request_ids", []),
        "file_s": round(len(x) / SR, 3), "first_s": round(first, 3), "last_s": round(last, 3),
        "word_start_s": round(w0, 3), "word_end_s": round(w1, 3), "words": n,
        "wps": round(n / span, 2), "wps_net": round(n / max(span - sum(q[1] - q[0] for q in long_p), 1e-3), 2),
        "pauses": long_p, "max_silence_s": round(max([q[1] - q[0] for q in sil], default=0.0), 2),
        "lead_junk": bool(first < w0 - 0.25), "tail_after_word_s": round(last - w1, 3),
        "stt_text": stt["text"], "stt_match": ok_words, "stt_notes": notes, "events": stt.get("events", []),
        "bad_events": events, "clipped": int(np.sum(np.abs(x) >= 0.9999)),
        "lufs": L.get("lufs"), "true_peak_dbtp": L.get("true_peak_dbtp"),
        "lead_noise_dbfs": round(20 * np.log10(np.sqrt(np.mean(lead ** 2)) + 1e-12), 1) if lead.size > 0.03 * SR else None,
        "click": round(click_score(seg), 1), **p, "ltas": [round(float(v), 2) for v in ltas(seg)],
        "vltas": [round(float(v), 2) for v in voiced_ltas(seg)],
    }


def main():
    lid = sys.argv[1]
    final = "--final" in sys.argv
    cfg = plan()
    lines = cfg["lines"]
    idx = next(i for i, l in enumerate(lines) if l["id"] == lid)
    line = lines[idx]
    d = TAKES / lid
    rows = [measure(w, line) for w in sorted(d.glob("take-*.wav"), key=lambda p: int(p.stem.split("-")[1]))]
    # reference: the chosen takes of up to three earlier lines in the same act
    prev, prev_ids = [], []
    for l in reversed(lines[:idx]):
        if l["act"] != line["act"] or len(prev) == 3:
            break
        sel = json.loads((TAKES / l["id"] / "select.json").read_text())
        prev.append(next(r for r in sel["takes"] if r["take"] == sel["chosen"]))
        prev_ids.append(f"{l['id']}/{sel['chosen']}")
    src = prev if prev else [r for r in rows if r["f0_median_hz"]]
    ref_f0 = float(np.exp(np.mean([np.log(r["f0_median_hz"]) for r in src])))
    ref_lt = np.mean([r["ltas"] for r in src], axis=0)
    ref_vl = np.mean([r["vltas"] for r in src], axis=0)
    clicks = np.median([r["click"] for r in rows])
    for r in rows:
        r["d_f0_st"] = round(st(r["f0_median_hz"], ref_f0), 2) if r["f0_median_hz"] else 99.0
        r["d_ltas_db"] = round(ltas_dist(r["ltas"], ref_lt), 2)
        r["d_timbre_db"] = round(ltas_dist(r["vltas"], ref_vl), 2)
        fails = []
        if not r["stt_match"]:
            fails.append("words")
        if r["clipped"]:
            fails.append("clipping")
        if r["bad_events"]:
            fails.append(f"events {r['bad_events']}")
        if r["max_silence_s"] > 1.5:
            fails.append(f"silence {r['max_silence_s']} s")
        if r["end_20ms_db_re_peak"] > -50 or r["start_10ms_db_re_peak"] > -50:
            fails.append(f"cut off (start {r['start_10ms_db_re_peak']} / end {r['end_20ms_db_re_peak']} dB re peak)")
        if not PACE[0] <= r["wps"] <= PACE[1]:
            fails.append(f"pace {r['wps']}")
        if abs(r["d_f0_st"]) > 4.0:
            fails.append(f"pitch {r['d_f0_st']} st")
        if r["d_timbre_db"] > 4.0:
            fails.append(f"timbre {r['d_timbre_db']} dB")
        r["fails"] = fails
        r["score"] = round(abs(r["wps"] - 2.5) / 0.3 + abs(r["d_f0_st"]) / 2 + r["d_timbre_db"] / 3
                           + (0.5 if (r["tail_after_word_s"] > 0.4 or r["lead_junk"]) else 0)
                           + (0.5 if r["click"] > 1.5 * clicks else 0), 3)
    ok = [r for r in rows if not r["fails"]]
    fallback = False
    if ok:
        best = min(ok, key=lambda r: r["score"])
    elif final:
        pool = [r for r in rows if r["stt_match"] and not r["clipped"] and not any(f.startswith("cut off") for f in r["fails"])] \
            or [r for r in rows if r["stt_match"] and not r["clipped"]] or rows
        best = min(pool, key=lambda r: (len(r["fails"]), r["score"]))
        fallback = True
    else:
        best = None
    out = {"line": lid, "act": line["act"], "text": line["text"], "chosen": best["take"] if best else None,
           "fallback": fallback, "reference": {"from": prev_ids or "this line's own takes", "f0_hz": round(ref_f0, 1)},
           "takes": rows}
    (d / "select.json").write_text(json.dumps(out, indent=1))
    print(json.dumps({"chosen": out["chosen"], "fallback": fallback,
                      "takes": [{k: r[k] for k in ("take", "wps", "wps_net", "d_f0_st", "d_timbre_db", "score", "fails")} for r in rows]}))


if __name__ == "__main__":
    main()

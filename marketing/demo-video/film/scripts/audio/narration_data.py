"""Write src/data/narration.json from the finished narrator files and their forced alignment.

Run (from film/): .venv/bin/python -I -B scripts/audio/narration_data.py
Shape (like src/data/voice.json): { id: { file, text, act, duration, words: [{text, start, end}], pauses: [[start, end]] } }
  words  - from _takes/narration-v2/<id>/align.json (ElevenLabs Forced Alignment on the finished file), mapped in order
           onto the line's own words (split on spaces, punctuation kept, so they spell the text). If the aligner's
           word count differs, the speech-to-text word times of the chosen take (moved by the trim) are used instead,
           and the line is marked in the report. The first start is clamped to the first sound and the last end to the
           last sound; times are rounded to 1 ms and never overlap.
  pauses - every internal silence longer than 0.35 s: 10 ms frames 35 dB or more under the line's loudest frame
           (floor -65 dBFS), between the first and the last sound.
Also prints a table (id, duration, words a second, pauses) and the largest gap between aligner and speech to text.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from narration_lib import FILM, TAKES, SR, read, plan, speech_bounds, silences  # noqa: E402

PAUSE_MIN = 0.35


def main():
    cfg = plan()
    data, report = {}, []
    for line in cfg["lines"]:
        lid = line["id"]
        d = TAKES / lid
        fin = json.loads((d / "finish.json").read_text())
        wav = FILM / "public/audio/narration" / f"{lid}.wav"
        x = read(wav).mean(axis=1)
        dur = len(x) / SR
        first, last = speech_bounds(x)
        tokens = line["text"].split()
        al = json.loads((d / "align.json").read_text())
        aw = [w for w in al["words"] if re.search(r"[A-Za-z0-9]", w["text"])]
        stt = json.loads((d / f"{fin['take']}.stt.json").read_text())
        t0 = fin.get("offset_s", fin["trim_s"][0])  # raw-take time of the finished file's 0 (trim minus silence pad)
        sw = [{"start": w["start"] - t0, "end": w["end"] - t0} for w in stt["words"]]
        source = "forced alignment"
        if len(aw) != len(tokens):
            source = f"speech to text (aligner gave {len(aw)} words for {len(tokens)})"
            aw = sw
        words = [{"text": t, "start": float(w["start"]), "end": float(w["end"])} for t, w in zip(tokens, aw)]
        words[0]["start"] = max(words[0]["start"], first)
        words[-1]["end"] = min(words[-1]["end"], last)
        for i, w in enumerate(words):
            w["start"] = round(max(0.0, min(w["start"], dur)), 3)
            w["end"] = round(max(w["start"], min(w["end"], dur)), 3)
            if i and w["start"] < words[i - 1]["end"]:
                words[i - 1]["end"] = w["start"]
        pauses = [p for p in silences(x, first, last, min_len=PAUSE_MIN) if p[1] - p[0] > PAUSE_MIN + 1e-9]
        data[lid] = {"file": f"audio/narration/{lid}.wav", "text": line["text"], "act": line["act"],
                     "duration": round(dur, 3), "words": words, "pauses": pauses}
        span = words[-1]["end"] - words[0]["start"]
        dev = max(abs(w["start"] - s["start"]) for w, s in zip(words, sw)) if len(sw) == len(words) else None
        where = []
        for p in pauses:
            before = [w["text"] for w in words if w["end"] <= p[0] + 0.05]
            where.append(f"{p[0]:.2f}-{p[1]:.2f} after '{before[-1] if before else '?'}'")
        report.append((lid, dur, len(words) / span, where, source, dev, al.get("loss")))
    (FILM / "src/data/narration.json").write_text(json.dumps(data, indent=2) + "\n")
    print(f"{'id':22s} {'dur':>6s} {'w/s':>5s}  pauses (> {PAUSE_MIN} s)")
    for lid, dur, wps, where, source, dev, loss in report:
        print(f"{lid:22s} {dur:6.3f} {wps:5.2f}  {'; '.join(where) or '-'}"
              f"{'' if source == 'forced alignment' else '  [' + source + ']'}  (aligner vs stt max {dev * 1000 if dev is not None else float('nan'):.0f} ms, loss {loss:.3f})")


if __name__ == "__main__":
    main()

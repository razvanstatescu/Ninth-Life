"""Finish the chosen narrator takes: trim, process, level, limit. Writes public/audio/narration/<id>.wav.

Run (from film/): .venv/bin/python -I -B scripts/audio/narration_finish.py [line-id ...]
For each line of prompts/narration.json, the take named in _takes/narration-v2/<id>/select.json:
  trim  - first and last sound by the 1 ms peak envelope (peak - 40 dB, floor -60 dBFS); keep 60 ms before the first
          sound and 150 ms after the last. If sound starts more than 0.25 s before the first word (a breath or a
          noise), the cut is 60 ms before the first word instead; if sound continues more than 0.4 s after the last
          word, the last sound is looked for only up to 0.4 s after it. Where the take has less room than that (v4
          files often start or end within 60 / 150 ms of the speech), the rest is digital silence. If the head holds
          a faint noise (above peak - 50 dB; the compressor makes it louder), the cut is 15 ms before the first sound
          and the rest of the head is silence.
  chain - at -19 LUFS: highpass 80 Hz, compressor -16 dB 2:1 (10/120 ms, knee 6), +2 dB bell at 3 kHz, de-esser;
          then gain and a 4x oversampled limiter so the line sits at -19.0 LUFS integrated, true peak <= -6.5 dBTP.
          (Mono file. In the stereo render, a mono clip on both channels reads about -16 LUFS: 2 LU under the app's
          voice files at -17 LUFS, which read about -14.)
  fades - 5 ms in, 60 ms out; first and last sample 0.
Writes 48 kHz 24-bit mono WAV and _takes/narration-v2/<id>/finish.json.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from narration_lib import (FILM, TAKES, SR, read, plan, speech_bounds, loudness, level_and_limit, fades,  # noqa: E402
                           NARRATOR_CHAIN, envelope_1ms)

TARGET = -19.0
CEILING = -6.5
HEAD, TAIL = 0.060, 0.150
OUT = FILM / "public/audio/narration"


def main():
    cfg = plan()
    only = set(sys.argv[1:])
    OUT.mkdir(parents=True, exist_ok=True)
    for line in cfg["lines"]:
        if only and line["id"] not in only:
            continue
        d = TAKES / line["id"]
        sel = json.loads((d / "select.json").read_text())
        wav = d / f"{sel['chosen']}.wav"
        stt = json.loads(wav.with_suffix(".stt.json").read_text())
        x = read(wav).mean(axis=1)
        first, last = speech_bounds(x)
        w0, w1 = stt["words"][0]["start"], stt["words"][-1]["end"]
        head_rule, tail_rule = "first sound", "last sound"
        if first < w0 - 0.25:
            first, head_rule = w0, "first word (sound before it)"
        if last > w1 + 0.40:
            _, last = speech_bounds(x[: int((w1 + 0.40) * SR)])
            tail_rule = "last sound within 0.4 s of the last word"
        t0, t1 = first - HEAD, last + TAIL
        raw_s = len(x) / SR
        # A faint mouth noise just before the first word gets louder with the compressor (n05 had one at -46 dB re
        # peak, -39 dB after processing). If the head holds sound above peak - 50 dB, cut 15 ms before the first sound
        # and make up the rest of the head with silence.
        env = envelope_1ms(x)
        h0, h1 = max(0, int((first - HEAD) * 1000)), max(0, int((first - 0.015) * 1000))
        if h1 > h0 and env[h0:h1].max() > env.max() - 50:
            t0, head_rule = first - 0.015, "first sound (a faint noise before it cut; head made up with silence)"
            pad_extra = HEAD - 0.015
        else:
            pad_extra = 0.0
        pad_head, pad_tail = max(0.0, -t0) + pad_extra, max(0.0, t1 - raw_s)
        t0, t1 = max(0.0, t0), min(raw_s, t1)
        seg = x[int(round(t0 * SR)):int(round(t1 * SR))].copy()
        # v4 files often start or stop less than 60 / 150 ms from the speech; their edges are silent (-64 dB re peak
        # or lower; cut-off takes are rejected by narration_select.py), so the missing head or tail is digital silence,
        # joined with a 2 ms (head) or 10 ms (tail) fade so the join cannot click.
        if pad_head:
            n = int(0.002 * SR)
            seg[:n] *= np.linspace(0, 1, n)
        if pad_tail:
            n = int(0.010 * SR)
            seg[-n:] *= np.linspace(1, 0, n)
        seg = np.concatenate([np.zeros(int(round(pad_head * SR))), seg, np.zeros(int(round(pad_tail * SR)))])
        y, lv = level_and_limit(seg, TARGET, CEILING, d / "tmp", chain=NARRATOR_CHAIN)
        y = fades(y, 0.005, 0.060)
        out = OUT / f"{line['id']}.wav"
        if np.max(np.abs(y)) >= 1.0:
            raise SystemExit(f"{line['id']}: would clip")
        sf.write(str(out), y, SR, subtype="PCM_24")
        L = loudness(out)
        info = {"id": line["id"], "take": sel["chosen"], "source": str(wav.relative_to(FILM)), "trim_s": [round(t0, 4), round(t1, 4)],
                "pad_s": [round(pad_head, 4), round(pad_tail, 4)], "offset_s": round(t0 - pad_head, 4),
                "head_rule": head_rule, "tail_rule": tail_rule, "duration_s": round(len(y) / SR, 3),
                "level": lv, "final": L, "file": str(out.relative_to(FILM))}
        (d / "finish.json").write_text(json.dumps(info, indent=1))
        print(f"{line['id']:22s} {sel['chosen']}  trim {t0:.3f}-{t1:.3f} s pad {pad_head:.3f}/{pad_tail:.3f} ({head_rule}; {tail_rule})  dur {len(y)/SR:.3f} s  "
              f"{L['lufs']:.2f} LUFS  TP {L['true_peak_dbtp']:.2f} dBTP  ({len(lv['iterations'])} pass)")


if __name__ == "__main__":
    main()

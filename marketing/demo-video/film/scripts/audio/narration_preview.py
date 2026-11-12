"""A listening file for the owner: every narrator line in film order with the app's lines where they fall.

Run (from film/): .venv/bin/python -I -B scripts/audio/narration_preview.py
Writes _takes/narration-v2/narration-preview.m4a (AAC 192 kb/s, 48 kHz mono) and narration-preview.cues.json.
Every file at volume 1, which is its mix level (narrator -19 LUFS, app voice -17 LUFS, both mono), 0.4 s apart.
App lines: "Hello again." after n06, "I need water." after n14 (its note says "Before the app says I need water"),
"I have something to say." after n19, "It is good to be back." after n20 (kept in this preview as asked, although
prompts/narration.json says the new line replaces it).
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from narration_lib import FILM, SR, read, plan, loudness  # noqa: E402

GAP = 0.4
APP_AFTER = {"n06-something": "hello-again", "n14-finds": "i-need-water", "n19-access": "something-to-say",
             "n20-same-keys": "good-to-be-back"}


def main():
    out_dir = FILM / "_takes/narration-v2"
    parts, cues, t = [], [], 0.0
    gap = np.zeros(int(GAP * SR))

    def add(path: Path, what: str):
        nonlocal t
        x = read(path).mean(axis=1)
        if parts:
            parts.append(gap)
            t += GAP
        cues.append({"at_s": round(t, 2), "what": what, "file": str(path.relative_to(FILM))})
        parts.append(x)
        t += len(x) / SR

    for line in plan()["lines"]:
        add(FILM / "public/audio/narration" / f"{line['id']}.wav", f"narrator {line['id']}: {line['text']}")
        app = APP_AFTER.get(line["id"])
        if app:
            v = json.loads((FILM / "src/data/voice.json").read_text())[app]
            add(FILM / "public" / v["file"], f"APP VOICE {app}: {v['text']}")
    y = np.concatenate(parts)
    if np.max(np.abs(y)) >= 1.0:
        raise SystemExit("would clip")
    wav = out_dir / "narration-preview.wav"
    sf.write(str(wav), y, SR, subtype="PCM_24")
    m4a = out_dir / "narration-preview.m4a"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav), "-c:a", "aac", "-b:a", "192k", str(m4a)], check=True)
    L = loudness(wav)
    wav.unlink()
    (out_dir / "narration-preview.cues.json").write_text(json.dumps({"file": m4a.name, "duration_s": round(len(y) / SR, 2),
                                                                     "gap_s": GAP, "loudness": L, "cues": cues}, indent=1))
    print(f"{m4a.relative_to(FILM)}: {len(y) / SR:.1f} s, {L}")
    for c in cues:
        print(f"  {int(c['at_s'] // 60)}:{c['at_s'] % 60:05.2f}  {c['what']}")


if __name__ == "__main__":
    main()

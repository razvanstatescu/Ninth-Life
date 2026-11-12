"""Build the listening files for the narrator test (research-v2/14-narrator-voice-and-mix.md).

Run (isolated): film/.venv/bin/python -I build_compare.py <takesDir> <angelaVoiceDir>
Writes <takesDir>/compare/narrator-compare.wav (+ .m4a, + .cues.json) and narrator-extras.wav (+ .m4a, + cues).

Every speech clip is trimmed to its speech (15 ms before the first sound, 120 ms after the last, 5 ms / 40 ms
fades) and set to -20 LUFS integrated (ffmpeg ebur128 measure, then a plain gain), so the ear compares timbre and
delivery, not level. Markers: one long low tone (A4, 440 Hz, 0.6 s) before the app-voice reference; N short beeps
(A5, 880 Hz, 0.12 s each, 0.12 s apart) before candidate N. Tones sit about 6 dB under the speech.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from measure import read, SR, speech_bounds, loudness  # noqa: E402
import soundfile as sf  # noqa: E402

TARGET = -20.0

ORDER = [  # ranked order (see the doc, section 3)
    ("frederick", "Frederick Surrey (male, British)"),
    ("james", "James (male, American)"),
    ("nathaniel", "Nathaniel (male, British)"),
    ("brian", "Brian (male, American)"),
    ("verity", "Verity X (female, British)"),
    ("jane", "Jane (female, British)"),
]


TMP_DIR: Path | None = None  # set in main() to <takesDir>/compare, so nothing is written next to the sources


def clip(path: Path) -> np.ndarray:
    x = read(path).mean(axis=1)
    a, b = speech_bounds(x)
    y = x[max(0, int((a - 0.015) * SR)):min(len(x), int((b + 0.120) * SR))].copy()
    n_in, n_out = int(0.005 * SR), int(0.040 * SR)
    y[:n_in] *= np.sin(0.5 * np.pi * np.linspace(0, 1, n_in))
    y[-n_out:] *= np.sin(0.5 * np.pi * np.linspace(1, 0, n_out))
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    tmp = TMP_DIR / ".lufs-tmp.wav"
    sf.write(str(tmp), y, SR, subtype="FLOAT")
    lu = loudness(tmp)["lufs"]
    tmp.unlink()
    y *= 10 ** ((TARGET - lu) / 20)
    return y


def tone(f, dur, level_db=-26.0):
    t = np.arange(int(dur * SR)) / SR
    y = np.sin(2 * np.pi * f * t) * 10 ** (level_db / 20) * np.sqrt(2)
    n = int(0.010 * SR)
    y[:n] *= np.linspace(0, 1, n)
    y[-n:] *= np.linspace(1, 0, n)
    return y


def beeps(n):
    parts = []
    for i in range(n):
        parts += [tone(880, 0.12), np.zeros(int(0.12 * SR))]
    return np.concatenate(parts)


def silence(s):
    return np.zeros(int(s * SR))


class Track:
    def __init__(self):
        self.parts, self.cues, self.t = [], [], 0.0

    def add(self, y, cue=None):
        if cue:
            self.cues.append({"at_s": round(self.t, 2), **cue})
        self.parts.append(y)
        self.t += len(y) / SR

    def write(self, path: Path):
        y = np.concatenate(self.parts)
        peak = np.max(np.abs(y))
        if peak > 0.89:  # keep sample peaks under -1 dBFS
            y *= 0.89 / peak
        path.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(path), y, SR, subtype="PCM_24")
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(path), "-c:a", "aac", "-b:a", "192k",
                        str(path.with_suffix(".m4a"))], check=True)
        path.with_suffix(".cues.json").write_text(json.dumps({"file": path.name, "duration_s": round(len(y) / SR, 2),
                                                              "speech_level": f"{TARGET} LUFS per clip", "cues": self.cues}, indent=2))
        return len(y) / SR


def main():
    global TMP_DIR
    takes = Path(sys.argv[1])
    angela = Path(sys.argv[2])
    out = takes / "compare"
    TMP_DIR = out
    # ---- main file: reference, then six candidates, v4, lines A and B, take 1
    tr = Track()
    tr.add(silence(0.5))
    tr.add(tone(440, 0.6), {"what": "marker: one long low tone = the app's voice (reference)"})
    tr.add(silence(0.5))
    for name in ("hello-again", "i-need-water", "good-to-be-back"):
        tr.add(clip(angela / f"{name}.wav"), {"what": f"reference: Angela, the app's voice, film line '{name}'"})
        tr.add(silence(0.6))
    tr.add(silence(0.8))
    for i, (lab, title) in enumerate(ORDER, 1):
        tr.add(beeps(i), {"what": f"marker: {i} beep(s) = candidate {i}, {title}"})
        tr.add(silence(0.5))
        tr.add(clip(takes / lab / "v4" / "A-take1.wav"), {"what": f"{i}. {title}: Act 1 line, eleven_v4, tag [quiet, measured narration]"})
        tr.add(silence(0.9))
        tr.add(clip(takes / lab / "v4" / "B-take1.wav"), {"what": f"{i}. {title}: Act 2 line, eleven_v4, untagged"})
        tr.add(silence(1.4))
    d = tr.write(out / "narrator-compare.wav")
    print(f"narrator-compare.wav {d:.1f} s")
    # ---- extras: the two finalists
    ex = Track()
    ex.add(silence(0.5))
    for i, (lab, title) in enumerate(ORDER[:2], 1):
        ex.add(beeps(i), {"what": f"marker: {i} beep(s) = {title}"})
        ex.add(silence(0.5))
        for var, desc in (("v4plain", "Act 1 line, no tag"), ("v4soft", "Act 1 line, tag [softly]"),
                          ("v4", "Act 1 line, tag [quiet, measured narration]")):
            ex.add(clip(takes / lab / var / "A-take1.wav"), {"what": f"{title}: {desc} (eleven_v4)"})
            ex.add(silence(0.9))
        ex.add(clip(takes / lab / "v4" / "B-take2.wav"), {"what": f"{title}: Act 2 line, eleven_v4, second seed"})
        ex.add(silence(0.9))
        ex.add(clip(takes / lab / "v4warm" / "B-take1.wav"), {"what": f"{title}: Act 2 line, tag [warm, clear narration]"})
        ex.add(silence(0.9))
        ex.add(clip(takes / lab / "v2" / "A-take1.wav"), {"what": f"{title}: Act 1 line, eleven_multilingual_v2 (fallback model)"})
        ex.add(silence(0.9))
        ex.add(clip(takes / lab / "v2" / "B-take1.wav"), {"what": f"{title}: Act 2 line, eleven_multilingual_v2 (fallback model)"})
        ex.add(silence(1.2))
        ex.add(tone(440, 0.3), {"what": f"marker: short low tone = {title}, seven separate lines, stitched within each act (test text)"})
        ex.add(silence(0.5))
        for s in sorted((takes / lab / "seq-stitched").glob("s*.wav")):
            ex.add(clip(s), {"what": f"{title}: seven-line test, {s.stem}"})
            ex.add(silence(0.7))
        ex.add(silence(1.0))
    d = ex.write(out / "narrator-extras.wav")
    print(f"narrator-extras.wav {d:.1f} s")


if __name__ == "__main__":
    main()

"""A rough mix for listening: the Act 2 music, the narration and the app's voice, placed and ducked exactly as
src/audio/Audio.tsx (<Soundtrack>) does it, from the numbers in src/timeline.ts and src/audio/mix.ts.

Run (from film/): .venv/bin/python -I -B scripts/audio/rough_mix.py [--out _takes/music-v2/rough-mix.m4a]
                  [--music 0.85 --duck-drums -18 --duck-other -12 --duck-full -15]   (try other mix numbers)
                  [--full audio/music/act2-v2-drive.wav --drums audio/music/act2-v2-drive-drums.wav]   (other files)
The raw mix is kept next to the output as <name>-raw.wav.
Reads the numbers through `npx tsx scripts/audio/export-timeline.ts`. Replicates narratorDuck() and musicLevel():
per-frame gains (60 fps, eased with EASE.out = cubic-bezier(0.2, 0, 0, 1), as lib/anim.ts ramp()), interpolated per
sample. Mono files play on both channels. No effects, beds or key tones. The mix is then set to -14 LUFS integrated,
true peak -1.6 dBTP, with the same two-pass loudnorm as scripts/finish-audio.py, and saved as AAC 192 kb/s.
Prints, for every narrator line, the narrator's and the music's K-weighted loudness over his words and the gap (LU).
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, write, SR, FILM  # noqa: E402
from kloudness import kweight  # noqa: E402


def bezier(x1, y1, x2, y2):
    def f(p):
        p = np.clip(np.asarray(p, dtype=float), 0, 1)
        lo, hi = np.zeros_like(p), np.ones_like(p)
        for _ in range(40):
            t = (lo + hi) / 2
            x = 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t ** 2 * x2 + t ** 3
            lo, hi = np.where(x < p, t, lo), np.where(x < p, hi, t)
        t = (lo + hi) / 2
        return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3
    return f


EASE_OUT = bezier(0.2, 0, 0, 1)


def ramp(frame, start, dur, a=0.0, b=1.0):
    p = (np.asarray(frame, dtype=float) - start) / max(1, dur)
    return a + (b - a) * EASE_OUT(p)


def sec(s, fps=60):
    return int(np.floor(s * fps + 0.5))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="_takes/music-v2/rough-mix.m4a")
    ap.add_argument("--music", type=float, default=None)
    ap.add_argument("--duck-drums", type=float, default=None)
    ap.add_argument("--duck-other", type=float, default=None)
    ap.add_argument("--duck-full", type=float, default=None)
    for k in ("full", "drums", "other"):  # e.g. --full audio/music/act2-v2-drive.wav --drums audio/music/act2-v2-drive-drums.wav
        ap.add_argument(f"--{k}", default=None, help=f"music file (under public/) instead of MUSIC_FILES.{k}")
    a = ap.parse_args()
    tl = json.loads(subprocess.run(["npx", "tsx", "scripts/audio/export-timeline.ts"], capture_output=True, text=True, check=True, cwd=FILM).stdout)
    mix = dict(tl["MIX"])
    if a.music is not None:
        mix["music"] = a.music
    duck = dict(mix["duckUnderNarrator"])
    for k, v in (("drums", a.duck_drums), ("other", a.duck_other), ("full", a.duck_full)):
        if v is not None:
            duck[k] = v
    fps, act2, total = tl["FPS"], tl["ACT2_START"], tl["TOTAL"]
    narr = json.loads((FILM / "src/data/narration.json").read_text())
    voice = json.loads((FILM / "src/data/voice.json").read_text())
    frames = np.arange(total + 1)
    spans = [(tl["NARRATION_AT"][i], tl["NARRATION_AT"][i] + sec(narr[i]["duration"])) for i in tl["NARRATION_AT"] if i in narr]
    nd = np.zeros(len(frames))
    for s0, s1 in spans:
        m = (frames >= s0 - sec(mix["attack"])) & (frames <= s1 + sec(mix["release"]))
        down = ramp(frames, s0 - sec(mix["attack"]), sec(mix["attack"]), 0, 1)
        up = ramp(frames, s1, sec(mix["release"]), 1, 0)
        nd = np.where(m, np.maximum(nd, np.minimum(down, up)), nd)

    def music_level(stem):
        g = np.full(len(frames), mix["music"], dtype=float)
        for d0, d1 in tl["MUSIC"]["ducks"]:
            d = np.where(frames < d0, ramp(frames, d0 - 3, 3, 0, 1), ramp(frames, d1 - 6, 6, 1, 0))
            g *= 10 ** (mix["duckUnderApp"] * d / 20)
        g *= 10 ** (duck[stem] * nd / 20)
        end = tl["MUSIC"]["from"] + sec(tl["MUSIC"]["length"])
        g *= ramp(frames, end - sec(4), sec(4), 1, 0)
        for m0, m1 in tl["MUSIC"]["mutes"]:
            g[(frames >= m0) & (frames < m1)] = 0.0
        return g

    n = int(total / fps * SR)
    t_frames = np.arange(n) / SR * fps

    def gains(g):
        return np.interp(t_frames, frames, g)

    music = np.zeros((n, 2))
    files = dict(tl["MUSIC_FILES"])
    for k in ("full", "drums", "other"):
        if getattr(a, k):
            files[k] = getattr(a, k)
    stems = [("drums", files["drums"]), ("other", files["other"])] if files["drums"] and files["other"] else [("full", files["full"])]
    print("music:", ", ".join(f"{s} {f}" for s, f in stems))
    start = int(act2 / fps * SR)
    for stem, f in stems:
        x = read(FILM / "public" / f)
        m = min(len(x), n - start)
        music[start:start + m] += x[:m] * gains(music_level(stem))[start:start + m, None]
    speech = np.zeros((n, 2))
    words = []
    for i, at in tl["NARRATION_AT"].items():
        if i not in narr:
            continue
        x = read(FILM / "public" / narr[i]["file"]).mean(axis=1)
        vol = mix["narratorAct1"] if at < act2 else mix["narrator"]
        s = int(at / fps * SR)
        speech[s:s + len(x)] += (vol * x)[:, None][: n - s]
        words.append((i, at / fps + narr[i]["words"][0]["start"], at / fps + narr[i]["words"][-1]["end"]))
    for i, at in tl["VOICE_AT"].items():
        x = read(FILM / "public" / voice[i]["file"]).mean(axis=1)
        s = int(at / fps * SR)
        speech[s:s + len(x)] += (mix["appVoice"] * x)[:, None][: n - s]
    out = music + speech
    # loudness gap narrator vs music over each line's words
    kw_m, kw_s = kweight(music), kweight(speech)
    lu = lambda y, a0, a1: -0.691 + 10 * np.log10(np.mean(y[int(a0 * SR):int(a1 * SR)] ** 2, axis=0).sum() + 1e-12)
    rows = [(i, round(lu(kw_s, a0, a1), 1), round(lu(kw_m, a0, a1), 1)) for i, a0, a1 in words]
    print(f"mix numbers: music {mix['music']}, duck under narrator {duck}, app duck {mix['duckUnderApp']}, attack {mix['attack']}, release {mix['release']}")
    print(f"{'line':20s} {'narr':>6s} {'music':>6s} {'gap':>5s}   (LUFS-like, before the final gain)")
    gaps = []
    for i, ls, lm in rows:
        g = ls - lm
        gaps.append(g)
        print(f"{i:20s} {ls:6.1f} {lm:6.1f} {g:5.1f}" + ("" if lm > -70 else "  (no music)"))
    act2_gaps = [g for (i, ls, lm), g in zip(rows, gaps) if lm > -70]
    print(f"gap over music: min {min(act2_gaps):.1f}, median {np.median(act2_gaps):.1f}, max {max(act2_gaps):.1f} LU")
    raw = (FILM / a.out).with_name(Path(a.out).stem + "-raw.wav")
    write(raw, np.clip(out, -0.999, 0.999))
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(raw), "-af", "loudnorm=I=-14:TP=-1.6:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    meas = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', p.stderr, re.S).group(0))
    af = (f"loudnorm=I=-14:TP=-1.6:LRA=11:measured_I={meas['input_i']}:measured_TP={meas['input_tp']}:measured_LRA={meas['input_lra']}:"
          f"measured_thresh={meas['input_thresh']}:offset={meas['target_offset']}:linear=true,aresample=48000")
    outp = FILM / a.out
    outp.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af", af, "-c:a", "aac", "-b:a", "192k", str(outp)], check=True)
    print(f"{outp.relative_to(FILM)}: input {meas['input_i']} LUFS, TP {meas['input_tp']} dBTP -> -14 LUFS (linear loudnorm)")


if __name__ == "__main__":
    main()

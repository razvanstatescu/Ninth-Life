"""Check every delivered audio file against the sound brief. Exit 1 on any failure.

Run from film/: .venv/bin/python scripts/audio/qa.py

Levels (2026-11-10, second cut): the app's voice lines at -17 LUFS integrated, true peak <= -4.5 dBTP
(voice_finalize.py); the narrator's lines at -19 LUFS, true peak <= -6.5 dBTP, about 60 ms of head
(narration_finish.py). One-shots, textures (a slow-starting effect: no first-sound rule) and loops keep their -3 dBFS peak. The manifest may also list takes in _takes/;
only its public/ entries are matched against the files.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, SR, FILM, probe, db, peak, first_sound, sha256, loudness  # noqa: E402

PUB = FILM / "public/audio"
LEVELS = {"voice": (-17.0, -4.5), "narration": (-19.0, -6.5)}  # kind: (LUFS, true-peak ceiling dBTP)
NARRATION = [l["id"] for l in json.loads((FILM / "scripts/audio/prompts/narration.json").read_text())["lines"]]
EXPECT = {  # path: (duration s or (lo, hi), mono allowed, kind)
    **{f"keys/old-{k}.wav": (0.090, True, "oneshot") for k in list("1234567890") + ["star", "hash"]},
    **{f"keys/new-{k}.wav": (0.500, False, "oneshot") for k in list("1234567890") + ["star", "hash"]},
    "amb/hum.wav": (10.0, False, "loop"), "amb/hiss.wav": (10.0, False, "loop"),
    "amb/room.wav": (10.0, False, "loop"), "amb/drone.wav": (30.0, False, "loop"),
    "sfx/tv-on.wav": (2.0, False, "oneshot"), "sfx/tv-off.wav": (1.5, False, "oneshot"),
    "sfx/static-burst.wav": (0.5, False, "oneshot"), "sfx/static-burst-2.wav": (0.4, False, "oneshot"),
    "sfx/crackle.wav": (0.5, False, "oneshot"), "sfx/rise.wav": (0.5, False, "oneshot"),
    "sfx/ember.wav": (1.2, False, "oneshot"), "sfx/sub-hit.wav": (1.5, False, "oneshot"),
    "sfx/riser.wav": (2.0, False, "oneshot"), "sfx/reverse-swell.wav": (0.5, False, "oneshot"),
    "sfx/whoosh-1.wav": ((0.5, 0.7), False, "oneshot"), "sfx/whoosh-2.wav": ((0.5, 0.7), False, "oneshot"),
    "sfx/whoosh-3.wav": ((0.5, 0.7), False, "oneshot"), "sfx/whip.wav": (0.35, False, "oneshot"),
    "sfx/tick.wav": (0.15, False, "oneshot"), "sfx/thump.wav": (0.4, False, "oneshot"),
    "sfx/no.wav": (0.5, False, "oneshot"), "sfx/button.wav": (0.4, False, "oneshot"),
    "sfx/flip.wav": (0.5, False, "oneshot"), "sfx/chord-tail.wav": (3.0, False, "oneshot"),
    "voice/hello-again.wav": (None, True, "voice"), "voice/i-need-water.wav": (None, True, "voice"),
    "voice/good-to-be-back.wav": (None, True, "voice"), "voice/something-to-say.wav": (None, True, "voice"),
    "music/act2.wav": (86.0, False, "music"), "music/act2-drums.wav": (86.0, False, "music"),
    "music/act2-other.wav": (86.0, False, "music"),
    **{f"narration/{i}.wav": (None, True, "narration") for i in NARRATION},
    # second cut: music v2 and the new effects (scripts/audio/music_v2_conform.py, make_sfx_v2.py)
    "music/act2-v2.wav": (90.0, False, "music"), "music/act2-v2-drums.wav": (90.0, False, "music"),
    "music/act2-v2-other.wav": (90.0, False, "music"),
    # the drive variant for the owner to compare (its other stem is act2-v2-other.wav); not in MUSIC_FILES
    "music/act2-v2-drive.wav": (90.0, False, "music"), "music/act2-v2-drive-drums.wav": (90.0, False, "music"),
    "amb/hum-glide.wav": (1.6, False, "oneshot"),
    "sfx/v2/wake-click.wav": (0.6, False, "oneshot"), "sfx/v2/battery-low.wav": (0.3, False, "oneshot"),
    "sfx/v2/power-down.wav": (0.5, False, "oneshot"), "sfx/v2/hiss-riser.wav": (2.0, False, "oneshot"),
    "sfx/v2/bubble.wav": (0.25, False, "oneshot"), "sfx/v2/chip.wav": (0.18, False, "oneshot"),
    "sfx/v2/wrong-key.wav": (0.15, False, "oneshot"), "sfx/v2/delete.wav": (0.15, False, "oneshot"),
    "sfx/v2/shimmer.wav": (2.0, False, "texture"), "sfx/v2/signal-down.wav": (2.0, False, "oneshot"),
    "sfx/v2/switch-press.wav": (0.3, False, "oneshot"), "sfx/v2/lock-click.wav": (0.08, False, "oneshot"),
}


def main():
    fails, rows = [], []
    present = {str(p.relative_to(PUB)) for p in PUB.rglob("*.wav")}
    for rel in sorted(set(EXPECT) | present):
        if rel not in EXPECT:
            fails.append(f"{rel}: unexpected file")
            continue
        if rel not in present:
            fails.append(f"{rel}: missing")
            continue
        dur, mono_ok, kind = EXPECT[rel]
        p = PUB / rel
        pr = probe(p)
        x = read(p)
        d = len(x) / SR
        f = []
        if pr["sample_rate"] != 48000 or pr["codec"] not in ("pcm_s16le", "pcm_s24le") or pr["bits"] not in (16, 24):
            f.append(f"format {pr}")
        if pr["channels"] != 2 and not (mono_ok and pr["channels"] == 1):
            f.append(f"channels {pr['channels']}")
        if isinstance(dur, tuple):
            if not dur[0] - 1e-6 <= d <= dur[1] + 1e-6:
                f.append(f"duration {d:.4f} outside {dur}")
        elif dur is not None and abs(d - dur) > 0.5 / SR:
            f.append(f"duration {d:.4f} != {dur}")
        pk = db(peak(x))
        if kind in ("oneshot", "loop", "texture") and abs(pk + 3.0) > 0.05:
            f.append(f"peak {pk:.2f}")
        if kind in LEVELS:
            lu, ceiling = LEVELS[kind]
            L = loudness(p)
            if abs(L["lufs"] - lu) > 0.2:
                f.append(f"loudness {L['lufs']} LUFS (want {lu})")
            if L["true_peak_dbtp"] > ceiling + 0.1:
                f.append(f"true peak {L['true_peak_dbtp']} dBTP (ceiling {ceiling})")
        if np.sum(np.abs(x) >= 0.9999):
            f.append("clipping")
        fs = first_sound(x) * 1000
        if kind == "oneshot" and fs > 5.0:
            f.append(f"first sound {fs:.1f} ms")
        if kind == "voice" and fs > 20.0:
            f.append(f"first sound {fs:.1f} ms")
        if kind == "narration" and not 40.0 <= fs <= 80.0:
            f.append(f"first sound {fs:.1f} ms (want about 60 ms of head)")
        if kind in ("oneshot", "voice", "music", "narration", "texture") and (np.max(np.abs(x[0])) > 1e-4 or np.max(np.abs(x[-1])) > 1e-4):
            f.append("non-zero edge sample")
        # no click: the first and last 0.25 ms must be quiet relative to the peak (a fade of 2 ms or more)
        q = int(0.00025 * SR)
        pkl = peak(x)
        if kind in ("oneshot", "voice", "music", "narration", "texture"):
            if np.max(np.abs(x[:q])) > 0.25 * pkl:
                f.append(f"loud start ({db(np.max(np.abs(x[:q])) / pkl):.1f} dB re peak in the first 0.25 ms)")
            if np.max(np.abs(x[-q:])) > 0.25 * pkl:
                f.append(f"loud end ({db(np.max(np.abs(x[-q:])) / pkl):.1f} dB re peak in the last 0.25 ms)")
        if kind == "loop":
            y = np.concatenate([x[-200:], x[:200]])
            seam = np.abs(np.diff(y, n=2, axis=0))[196:201].max()
            if seam > np.abs(np.diff(x, n=2, axis=0)).max() + 1e-9:
                f.append("loop seam click")
        rows.append((rel, round(d, 3), pr["channels"], pr["bits"], round(pk, 2), round(fs, 1), "ok" if not f else "; ".join(f)))
        fails += [f"{rel}: {m}" for m in f]
    # voice.json and narration.json against the files
    for name in ("voice.json", "narration.json"):
        vj = json.loads((FILM / "src/data" / name).read_text())
        if name == "narration.json" and sorted(vj) != sorted(NARRATION):
            fails.append(f"{name}: ids differ from prompts/narration.json")
        for vid, v in vj.items():
            p = FILM / "public" / v["file"]
            d = len(read(p)) / SR
            if abs(d - v["duration"]) > 0.002:
                fails.append(f"{name} {vid}: duration {v['duration']} vs file {d:.3f}")
            if " ".join(w["text"] for w in v["words"]) != v["text"]:
                fails.append(f"{name} {vid}: words do not spell the text")
            ts = [(w["start"], w["end"]) for w in v["words"]]
            if any(a > b for a, b in ts) or any(ts[i][1] > ts[i + 1][0] + 1e-9 for i in range(len(ts) - 1)) or ts[-1][1] > d:
                fails.append(f"{name} {vid}: word times not ordered or past the end")
            ps = v.get("pauses", [])
            if any(a >= b for a, b in ps) or any(ps[i][1] > ps[i + 1][0] for i in range(len(ps) - 1)) or (ps and (ps[0][0] < 0 or ps[-1][1] > d)):
                fails.append(f"{name} {vid}: pauses not ordered or outside the file")
    # manifest: one entry per delivered file, hashes match. Entries for takes in _takes/ are logged too and ignored here.
    man = json.loads((FILM / "manifest/audio.json").read_text())
    man_pub = [e for e in man if e["path"].startswith("public/")]
    mpaths = {e["path"]: e for e in man_pub}
    if len(mpaths) != len(man_pub):
        fails.append("manifest: more than one entry for the same public/ path")
    for rel in present:
        e = mpaths.get(f"public/audio/{rel}")
        if not e:
            fails.append(f"manifest: no entry for {rel}")
        elif e["sha256"] != sha256(PUB / rel):
            fails.append(f"manifest: sha256 mismatch for {rel}")
    if len(man_pub) != len(present):
        fails.append(f"manifest has {len(man_pub)} public/ entries for {len(present)} files")
    for r in rows:
        print(f"{r[0]:32s} {r[1]:7.3f}s ch{r[2]} {r[3]}b peak {r[4]:6.2f} first {r[5]:5.1f}ms  {r[6]}")
    print(f"\n{len(rows)} files checked; {len(fails)} failure(s)")
    for f in fails:
        print("FAIL", f)
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()

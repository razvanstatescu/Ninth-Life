"""Write src/data/music.json for music v2 and log music v2 and the v2 effects in manifest/audio.json.

Run (from film/): .venv/bin/python -I -B scripts/audio/v2_meta.py [--dry-run]
Reads _takes/music-v2/ (take sidecars, conform.json, check-*.json, phase-final.json, phase-final-p3.json: the pulse
before the lead's fixes) and _takes/sfx-v2/recipes.json.
Manifest: appends one entry per new file (the five music takes, the stem zip, the three final music files, the two
drive-variant files, the 13 effects); refreshes its own earlier entries (same path, ids music-v2/* or sfx-v2/*);
leaves every other entry as it is.
(Do not run scripts/audio/build_meta.py any more: it rewrites music.json and the manifest from the v1 plan.)
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import soundfile as sf

FILM = Path(__file__).resolve().parents[2]
M = FILM / "_takes/music-v2"
MAN = FILM / "manifest/audio.json"
DATE = "2026-11-10"
SECTIONS = [("1-4", 0, 8, "rebirth"), ("5", 8, 2, "silence (Hello again)"), ("6-8", 10, 6, "drop"), ("9-17", 16, 18, "the problem"),
            ("18-21", 34, 8, "solution groove"), ("22", 42, 2, "pad (I need water, ducked)"), ("23", 44, 2, "breath, lift"),
            ("24-29", 46, 12, "the proof (two beats out 53.5-54.5)"), ("30-32", 58, 6, "ghost mode"), ("33-34", 64, 4, "access (scan clock)"),
            ("35-36", 68, 4, "the lift (Kiro)"), ("37-38", 72, 4, "strip-back"), ("39-40", 76, 4, "silence (I have something to say)"),
            ("41-45", 80, 10, "the end chord")]


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def dur(p: Path) -> float:
    i = sf.info(str(p))
    return round(i.frames / i.samplerate, 3)


def main():
    dry = "--dry-run" in sys.argv
    conf = json.loads((M / "conform.json").read_text())
    checked = {Path(r["file"]).name: r for r in json.loads((M / "check-final.json").read_text())}
    final = checked["act2-v2.wav"]
    for stem in ("act2-v2-drums.wav", "act2-v2-other.wav"):  # the stems are not checked on their own: the full mix's numbers
        checked[stem] = final
    phase = json.loads((M / "phase-final.json").read_text())
    side = {t: json.loads((M / f"act2-v2-{t}.json").read_text()) for t in ("v2a", "v2b", "v2c", "i1", "i2")}
    checks = {}
    for f in ("check-takes.json", "check-i1.json", "check-i2.json"):
        for r in json.loads((M / f).read_text()):
            checks[Path(r["file"]).stem.replace("act2-v2-", "")] = r
    # pulse phase per section, modulo a 16th note, in (-62.5, 62.5] ms. Where the riser now masks the onsets (contrast
    # under 2), the take's own pulse as measured before the fixes is kept (the edits there change levels, not timing).
    fold = lambda ms: round(((ms + 62.5) % 125) - 62.5, 1)
    p3 = M / "phase-final-p3.json"
    prev = {f"{p['section'][0]}-{p['section'][1]}": p for p in json.loads(p3.read_text())} if p3.exists() else {}
    pulse, masked = {}, []
    for p in phase:
        k = f"{p['section'][0]}-{p['section'][1]}"
        if p["contrast"] < 2.0 and k in prev and prev[k]["contrast"] >= 2.0:
            pulse[k] = fold(prev[k]["phase_ms"])
            masked.append(f"{k} s (contrast now {p['contrast']}, before the riser {prev[k]['contrast']})")
        else:
            pulse[k] = fold(p["phase_ms"])
    reb, rbd, drv = conf["rebirth"], conf["rebuild"], conf["drive"]
    kicks = conf["kick_times_s"]
    offs = conf["kick_offsets_ms"]
    n_by = {"drop": 11, "solution": 20, "access": 8, "lift": 8}
    mean_kick = round(sum(abs(offs[k]) * n_by[k] for k in offs) / sum(n_by.values()), 1)
    music = {
        "file": "audio/music/act2-v2.wav",
        "stems": {"drums": "audio/music/act2-v2-drums.wav", "other": "audio/music/act2-v2-other.wav"},
        "bpm": 120, "durationSec": 90,
        "take": "i2: v2c's body (bars 9-32 and 35-45, re-rendered by inpainting), i1's rebirth (bars 1-5), the drop (6-8) and access (33-34) regenerated; plus our soft kick, the bars 1-4 rise and the bars 31-33 rebuild",
        "model": "music_v2_5",
        "songIds": {t: side[t]["response_headers"].get("song-id") for t in side},
        "sections": [{"bars": b, "startSec": s, "durationSec": d, "name": nm} for b, s, d, nm in SECTIONS],
        "mutes": conf["mutes_s"],
        "kick": {"bars": "6-8 (not 8.4), 18-22, 33-36", "count": len(kicks), "offsetsMs": offs,
                 "note": "synthesised soft kick tuned to A1; each section's kicks sit on the take's own pulse (unchanged by the fixes: the drums stem is bit-identical)"},
        "beatDeviationMs": {"mean": mean_kick, "max": max(abs(v) for v in offs.values()),
                            "method": "our kicks against the film's 0.500 s grid (they follow the take's pulse); the take's own pulse per section is in pulsePhaseMs"},
        "pulsePhaseMs": pulse,
        "pulseNote": ("Bars 31-32 (60-64 s) now carry the access groove's pulse (+32 ms, the rebuild layer); bar 30 keeps the take's (-11 ms). "
                      + (f"Kept from before the fixes, because the riser masks the onsets now: {'; '.join(masked)}." if masked else "")),
        "rebirth": {"bars": "1-4", "riseDb": reb["rise_db"], "bar1Beat2Lufs": reb["after"]["bar1_beat2"], "endBar4Lufs": reb["after"]["end_bar4"],
                    "barsLufs": reb["bars_1_4"], "before": reb["before"],
                    "method": (f"the bass eased {abs(reb['bass_dip_db'])} dB down after the bar-1 hit (0.15-0.45 s) and back to 0 dB at 7.5 s; a soft noise "
                               f"riser made here (band centre 250 Hz to 3 kHz, +30 dB over 0.3-7.6 s, ending {reb['riser_under_music_db']} dB under the "
                               "music); everything stops dead at 7.6 s, 24 f before bar 5"),
                    "measure": "K-weighted, ungated: bar 1 beat 2 (0.5-1.0 s) against the end of bar 4 (7.1-7.5 s)"},
        "rebuild": {"bars": "31-33 (to beat 3)", "bars29to34Lufs": rbd["bars_29_34"],
                    "method": ("the take's own access groove (bar 34, the other stem) tiled on the bar lines from bar 31 beat 1 (20 ms crossfades), "
                               "rising from -10 dB to -1 dB at bar 33 beat 1 and 0 dB at bar 33 beat 3, where the take's own groove takes over (60 ms)")},
        "variants": {"drive": {"file": "audio/music/act2-v2-drive.wav",
                               "stems": {"drums": "audio/music/act2-v2-drive-drums.wav", "other": "audio/music/act2-v2-other.wav"},
                               "inMusicFiles": False,
                               "shaker": {"bars": drv["bars"], "hits": drv["shaker_times_s"], "tunedHz": drv["tuned_hz"], "underMusicDb": 14,
                                          "note": "a soft shaker synthesised here on every eighth, the off-beats 4 dB louder, on the kick's pulse; in the drums stem"},
                               "note": "for the owner to compare; the same music as act2-v2.wav plus the shaker"}},
        "bar1AttackSec": 0.0,
        "fitBpm": final["grid"]["fit_bpm"],
        "key": final["key"],
        "loudnessPerBar": [b["lufs"] for b in final["bars"]],
        "notes": ("Built 2026-11-10 to the lead's bar map. Three full takes (v2a, v2b, v2c) all put 8-10 s of silence where the rebirth should be "
                  "(the first chunk's text mentioned a silent last bar) and v2a/v2b were off key (C minor, G major) and off the map; v2c (A minor, map "
                  "rho 0.56) became the base. Inpainting (music_v2_5 composition plan with audio-reference chunks) regenerated the rebirth (i1) and then "
                  "the drop and the access bars (i2, without conditioning); the model kept them kick-less, and stem separation found no drums at all "
                  "(drums stem -128 dB): the take is bass plus synths. So a soft kick synthesised here (55 Hz, A1) was added in the drop, the solution "
                  "groove with bar 22, access and the lift, on the take's own pulse. Conform: bar 1's hit moved to 0.000 s (-21.2 ms), hard mutes at "
                  "7.6-10.0, 33.5-34.0, 53.5-54.5 and 76.0-80.0 s, a fade to silence 87-90 s; no time-stretch (tempo fit 119.98 BPM, 0.016% from 120). "
                  "Entries land on the grid: drop 10.003 s, groove 33.991 s, resolve 54.502 s, end chord 80.004 s. The take's pulse sits -13 to +32 ms "
                  "from the grid depending on the section (the model starts regenerated chunks on their own phase); visual hits on the grid may lead "
                  "the music by up to about 30 ms in the drop, access, lift and strip-back. Stems: drums = our kick (the separated drums are silent); "
                  "other = bass + other + piano (+ silent guitar and vocals); full - (drums + other) = -65 dB. Speech: no vocals stem content. "
                  f"Fixes (the lead, 2026-11-10, second round): bars 1-4 now climb {reb['rise_db']} dB into bar 4 (see rebirth), and bars 31-32 rebuild "
                  f"into bar 33's kick instead of thinning to -45 LUFS (bars 30-33 now {rbd['bars_29_34'][1]}, {rbd['bars_29_34'][2]}, "
                  f"{rbd['bars_29_34'][3]}, {rbd['bars_29_34'][4]} LUFS). Mutes, bar lines and kicks unchanged. A drive variant (variants.drive) "
                  "adds a soft tuned shaker for the owner to compare; it is not in MUSIC_FILES."),
    }
    if not dry:
        (FILM / "src/data/music.json").write_text(json.dumps(music, indent=2) + "\n")
    # ---- manifest
    raw = MAN.read_text()
    before = hashlib.sha256(raw.encode()).hexdigest()
    man = json.loads(raw)
    assert json.dumps(man, indent=2) + "\n" == raw, "manifest does not round-trip"
    new = []
    verdict = {"v2a": "not used: silent bars 1-4, C minor, the lift quiet", "v2b": "not used: silent bars 1-4, G major, bars 26-36 near silent",
               "v2c": "the base: A minor, map rho 0.56; silent bars 1-4, no kick", "i1": "inpainted on v2c: the rebirth fixed (used via i2); drop and access still kick-less",
               "i2": "USED: i1's rebirth + v2c's body, drop and access regenerated without conditioning (still kick-less)"}
    for t, s in side.items():
        p = M / f"act2-v2-{t}.wav"
        c = checks.get(t, {})
        plan = "scripts/audio/prompts/music-v2.json (12 chunks)" if t.startswith("v2") else f"scripts/audio/prompts/music-v2-inpaint.json ({'chunks' if t == 'i1' else 'plan_i2'})"
        new.append({"id": f"music-v2/take-{t}", "path": str(p.relative_to(FILM)), "tool": "elevenlabs-music", "model": "music_v2_5", "date": DATE,
                    "prompt": f"composition plan in {plan}, 90,000 ms, 120 BPM, A minor, instrumental",
                    "command": "scripts/audio/gen-music-v2.mjs" if t.startswith("v2") else "scripts/audio/gen-music-plan.mjs prompts/music-v2-inpaint.json " + t,
                    "params": {"seed": s["seed"], "song_id": s["response_headers"].get("song-id"), "output_format": s["output_format"],
                               "store_for_inpainting": True, "map_spearman": c.get("map_spearman"), "key": c.get("key")},
                    "take": t, "sha256": sha(p), "durationSec": dur(p),
                    "notes": f"Music v2 take. {verdict[t]}. Raw API output (pcm_48000 to WAV), not a film asset."})
    z = M / "stems-i2/stems.zip"
    new.append({"id": "music-v2/stems-i2", "path": str(z.relative_to(FILM)), "tool": "elevenlabs-music", "model": "stem separation six_stems_v1", "date": DATE,
                "prompt": None, "command": "scripts/audio/stems.mjs _takes/music-v2/act2-v2-i2.wav _takes/music-v2/stems-i2",
                "params": {"output_format": "pcm_48000", "input": "_takes/music-v2/act2-v2-i2.wav"}, "take": "i2", "sha256": sha(z), "durationSec": 90.0,
                "notes": "Six stems of take i2. bass -22 dB, other -26.5 dB, piano -62 dB; drums, guitar and vocals silent (-128 dB and below). Sum = take within -65 dB."})
    fixes = (f"Bars 1-4 climb {reb['rise_db']} dB into bar 4 (bass automation and our noise riser, cut dead at 7.6 s); bars 31-33 rebuilt from "
             "the take's own bar 34 into bar 33's kick (the lead's fixes, second round).")
    drive_note = (f"The drive variant for the owner to compare, not in MUSIC_FILES: act2-v2 plus a soft shaker synthesised here (tuned E8 and A8, "
                  f"{drv['shaker_times_s']} hits on the eighths in bars 6-8, 18-21, 33-34 and 35-36, 14 dB under the music). ")
    for name, desc, tool, take in (
            ("act2-v2.wav", "the full mix", "kick, noise riser", "i2 + soft kick"),
            ("act2-v2-drums.wav", "the drums stem: our soft kick only (the separated drums are silent)", "kick", "i2 + soft kick"),
            ("act2-v2-other.wav", "everything else: bass, synths (other), piano, our riser and the rebuild", "noise riser", "i2"),
            ("act2-v2-drive.wav", "drive variant, the full mix. " + drive_note, "kick, noise riser, shaker", "i2 + soft kick + shaker"),
            ("act2-v2-drive-drums.wav", "drive variant, the drums stem: our kick and shaker; pair it with act2-v2-other.wav. " + drive_note,
             "kick, shaker", "i2 + soft kick + shaker")):
        p = FILM / "public/audio/music" / name
        new.append({"id": f"music-v2/{name[:-4]}", "path": str(p.relative_to(FILM)), "tool": f"elevenlabs-music + python (conform, synthesised {tool})",
                    "model": "music_v2_5; stems six_stems_v1", "date": DATE,
                    "prompt": "scripts/audio/prompts/music-v2.json and music-v2-inpaint.json (plan_i2)",
                    "command": "scripts/audio/gen-music-v2.mjs v2c; scripts/audio/gen-music-plan.mjs prompts/music-v2-inpaint.json i1|i2; scripts/audio/stems.mjs; scripts/audio/music_v2_conform.py --take i2",
                    "params": {"song_ids": music["songIds"], "conform": {k: v for k, v in conf.items() if k not in ("kick_times_s",)}},
                    "take": take, "sha256": sha(p), "durationSec": dur(p),
                    "notes": f"Music v2, {desc}. 90.000 s, 48 kHz 24-bit stereo; drums + other = full within -65 dB. Bar 1 beat 1 at 0.000 s (film 0:28). "
                             f"{fixes} Map rho {checked[name if 'drive' not in name else 'act2-v2-drive.wav']['map_spearman']}, "
                             f"key {final['key']['best'][0]}. Generated music; say so in the video description."})
    rec = json.loads((FILM / "_takes/sfx-v2/recipes.json").read_text())
    for rel, r in rec.items():
        p = FILM / rel
        name = p.stem
        extra = f" Place at film {r['place_at_film_s']} s; it ends at {r['ends_at_film_s']} s." if "place_at_film_s" in r else ""
        new.append({"id": f"sfx-v2/{name}", "path": rel, "tool": "python (numpy/scipy synthesis)", "model": None, "date": DATE, "prompt": None,
                    "command": "scripts/audio/make_sfx_v2.py", "params": r, "take": "script", "sha256": sha(p), "durationSec": dur(p),
                    "notes": f"{r['recipe']}.{extra} 48 kHz 24-bit stereo; peak -3.0 dBFS; first sound {r['first_sound_ms']} ms; centroid {r['centroid_hz']} Hz. "
                             "Made by us; no third-party sound."})
    index = {e["path"]: i for i, e in enumerate(man)}
    refreshed, appended = [], []
    for e in new:
        i = index.get(e["path"])
        if i is None:
            man.append(e)
            appended.append(e["id"])
        elif man[i]["id"].startswith(("music-v2/", "sfx-v2/")) and man[i] != e:
            man[i] = e
            refreshed.append(e["id"])
    print(f"music.json {'(dry run)' if dry else 'written'}; manifest: {len(appended)} appended, {len(refreshed)} refreshed, {len(man)} entries")
    if dry:
        return
    if hashlib.sha256(MAN.read_text().encode()).hexdigest() != before:
        raise SystemExit("manifest changed while preparing entries; run again")
    MAN.write_text(json.dumps(man, indent=2) + "\n")


if __name__ == "__main__":
    main()

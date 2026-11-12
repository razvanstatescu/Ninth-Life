"""Write src/data/music.json and manifest/audio.json (one entry per file in public/audio).

Run from film/: .venv/bin/python scripts/audio/build_meta.py
Reads the logs the other scripts leave in _takes/audio/ and measures every final file again.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, SR, FILM, sha256, report, first_sound, last_sound  # noqa: E402
from kloudness import kweight  # noqa: E402

T = FILM / "_takes/audio"
PUB = FILM / "public/audio"
DATE = "2026-11-10"
SFX_CFG = json.loads((FILM / "scripts/audio/prompts/sfx.json").read_text())
MUS_CFG = json.loads((FILM / "scripts/audio/prompts/music.json").read_text())
VOI_CFG = json.loads((FILM / "scripts/audio/prompts/voice.json").read_text())


def kloud(x):
    """K-weighted loudness (ungated, LUFS-like) over the sounding part."""
    a, b = int(first_sound(x) * SR), int(max(last_sound(x), first_sound(x) + 0.01) * SR)
    y = kweight(x[a:b] if b > a else x)
    return float(-0.691 + 10 * np.log10(np.sum(np.mean(y ** 2, axis=0)) + 1e-12))


def base_entry(path: Path):
    x = read(path)
    r = report(path)
    return {
        "id": path.stem, "path": str(path.relative_to(FILM)), "tool": None, "model": None, "date": DATE,
        "prompt": None, "command": None, "params": {}, "take": None, "sha256": sha256(path),
        "durationSec": round(len(x) / SR, 3), "notes": "",
        "_meas": {"channels": r["channels"], "bits": r["bits"], "peak_dbfs": r["peak_dbfs"],
                  "first_sound_ms": r["first_sound_ms"], "lufs_k": round(kloud(x), 1)},
    }


def meas_note(e):
    m = e["_meas"]
    ch = "mono" if m["channels"] == 1 else "stereo"
    return (f"48 kHz {m['bits']}-bit {ch}; peak {m['peak_dbfs']} dBFS; first sound {m['first_sound_ms']} ms; "
            f"K-weighted loudness {m['lufs_k']} LUFS (ungated, over the sounding part).")


def main():
    entries = []
    keys_log = {k["key"]: k for k in json.loads((T / "keys/make_keys.log.json").read_text())}
    synth_log = json.loads((T / "synth/make_synth.log.json").read_text())
    sfx_synth = json.loads((T / "synth/sfx_synth.json").read_text())
    sfx_choice = json.loads((T / "sfx/choices.json").read_text())
    voice_choice = json.loads((T / "voice/choices.json").read_text())
    grid = json.loads((T / "music/grid-final.json").read_text())

    # ---- keys
    for p in sorted((PUB / "keys").glob("*.wav")):
        e = base_entry(p)
        s, k = p.stem.split("-", 1)
        kl = keys_log[k]
        e.update(tool="ffmpeg", model=None, take="script")
        e["params"] = {"key": k, "note": kl["note"], "hz": kl["hz"], "set": s}
        if s == "old":
            e["command"] = ("ffmpeg -f lavfi -i \"aevalsrc=<band-limited square at the note: odd harmonics below 16 kHz>"
                            ",highpass=f=900,highpass=f=900,lowpass=f=3200,afade=t=in:d=0.005,afade=t=out:st=0.06:d=0.03\""
                            " (scripts/audio/make_keys.py)")
            e["notes"] = ("Thin square wave through a tiny speaker, 90 ms, mono. 4th-order 900 Hz high-pass (a tiny "
                          "speaker has no low end), so the strongest component is an odd harmonic and the pitch is "
                          "heard as the note. ")
        else:
            e["command"] = (f"ffmpeg -f lavfi -i \"aevalsrc=exprs='{kl['new_expr']}':d=0.9,afade=t=in:d=0.004\" "
                            "+ ffmpeg afir with a synthetic stereo small-room IR (RT60 0.28 s) at -15 dB RMS, 40 ms "
                            "fade out at 0.5 s (scripts/audio/make_keys.py)")
            e["notes"] = ("Soft pluck, 500 ms, stereo, the formula from the asset plan plus a touch of short room. "
                          "Every key is peak -3 dBFS, so low keys (0 = A2, star = G3) sound softer than high ones; "
                          "set per-key volume if needed. ")
        e["notes"] += meas_note(e)
        entries.append(e)

    # ---- ambience
    amb_notes = {
        "hum": ("10 s seamless loop (every component has whole cycles in 10 s). 55 + 110 Hz with weak overtones to "
                "550 Hz, amplitude wobble 0.3/0.7 Hz, +-1.6 cent drift.", -34),
        "hiss": ("10 s seamless loop (circular spectral synthesis). Muffled small-speaker static, nearly mono.", -32),
        "room": ("10 s seamless loop (circular spectral synthesis). Near-silent dark room air, two independent "
                 "channels.", -50),
        "drone": ("30 s seamless loop. Dark sustained drone on A1 (55 Hz) with a slowly moving low-pass, slow beating "
                  "and a dark noise layer swelling twice per loop; no rhythm.", -30),
    }
    for p in sorted((PUB / "amb").glob("*.wav")):
        e = base_entry(p)
        lg = synth_log.get(f"amb/{p.name}", {})
        e.update(tool="ffmpeg", take="script")
        e["command"] = (lg.get("command") or "") or ("scripts/audio/make_synth.py (numpy synthesis, no generation): "
                                                      + lg.get("method", ""))
        if p.stem == "hum":
            e["command"] = "scripts/audio/make_synth.py: " + lg.get("command", "")
        e["params"] = {k: v for k, v in lg.items() if k not in ("command",)}
        txt, target = amb_notes[p.stem]
        vol = 10 ** ((target - e["_meas"]["lufs_k"]) / 20)
        e["notes"] = (f"{txt} Normalized to peak -3 dBFS like every file; a starting film volume of about "
                      f"{vol:.3f} puts it near {target} LUFS. " + meas_note(e))
        entries.append(e)

    # ---- music
    sides = {t: json.loads((T / f"music/act2-{t}.json").read_text()) for t in ("t1", "t3")}
    mus_note = ("Bars 6-43 are take t3 (plan v2), bars 1-5 are take t1 (plan v1): take t3's build is on F# (its sub "
                "bass sits on F#1), which clashes with the A minor key tones played over it, while t1's build is in A "
                "minor. Splice at 10.000 s, 10 ms equal-power crossfade ending exactly on the downbeat, inside the "
                "film's bar-5 mute. Gain +10 dB ramped in from 72.0 to 75.5 s (inside the bars 37-38 mute) so the "
                "final chord is usable with an <Audio> volume of at most 1. 0.5 s fade at the end. No time-stretch "
                "(fitted 120.0023 BPM, 0.002% off) and no shift (first kick attack at sample 0).")
    for p in sorted((PUB / "music").glob("*.wav")):
        e = base_entry(p)
        e.update(tool="elevenlabs-music", model="music_v2_5", take="t3 (bars 6-43) + t1 (bars 1-5)")
        e["prompt"] = ("composition plan in scripts/audio/prompts/music.json (10 chunks, 86,000 ms, 120 BPM, A minor, "
                       "instrumental; t1 = plan v1, t3 = plan v2 with per-section overrides)")
        e["params"] = {"output_format": "pcm_48000", "seeds": {"t1": sides["t1"]["seed"], "t3": sides["t3"]["seed"]},
                       "song_ids": {"t1": sides["t1"]["response_headers"].get("song-id"),
                                    "t3": sides["t3"]["response_headers"].get("song-id")},
                       "conform": {"splice_s": 10.0, "xfade_ms": 10, "lift_db": 10, "lift_ramp_s": [72.0, 75.5],
                                   "fade_out_s": 0.5, "stretch": None, "shift_s": 0.0}}
        e["command"] = "scripts/audio/gen-music.mjs t1|t3, then scripts/audio/music_conform.py"
        if p.stem == "act2":
            e["notes"] = mus_note + " " + meas_note(e)
        else:
            part = "drums" if p.stem.endswith("drums") else "everything else (bass, other, piano, guitar, vocals)"
            e["model"] = "music_v2_5; stems six_stems_v1"
            e["command"] = ("scripts/audio/stems.mjs (POST /v1/music/stem-separation, six_stems_v1, pcm_48000) on take "
                            "t3 and on t1's first 12 s, then scripts/audio/stems_build.py")
            e["notes"] = (f"Stem: {part}, conformed exactly like act2.wav. act2-drums + act2-other = act2 within "
                          "-55 dB RMS. In bars 1-5 the separation put almost the whole build (kick and sub) in the "
                          "drums stem. The vocals stem is silent. " + meas_note(e))
        entries.append(e)

    # ---- sfx
    synth_ids = {"rise", "chord-tail", "tv-on", "tv-off", "riser", "whoosh-1", "whoosh-2", "whoosh-3", "whip"}
    why_synth = {
        "tv-on": "Synthesized: in 4 generated takes (2 prompt versions) no rising whine could be measured after the "
                 "thunk (strongest component wandering 300-900 Hz).",
        "tv-off": "Synthesized: in 4 generated takes no falling sweep could be measured and none ended in silence.",
        "riser": "Synthesized: generated take 2 held one note (G4) under a slowly opening filter and plateaued in level; "
                 "take 1 peaked at 0.67 s and fell.",
        "whoosh-1": "Synthesized: all 12 generated whoosh takes (2 prompt versions) had 80-100% of their energy below "
                    "120 Hz and none above 4 kHz (a low thud, no air).",
        "whoosh-2": "Synthesized: generated whooshes had no air (see whoosh-1).",
        "whoosh-3": "Synthesized: generated whooshes had no air (see whoosh-1).",
        "whip": "Synthesized: the generated takes were near silent (-42 to -54 dBFS) or sub-only.",
        "rise": "Synthesized as the brief asks.",
        "chord-tail": "Synthesized (the brief allows it), in the same family as the new key tones.",
    }
    for p in sorted((PUB / "sfx").glob("*.wav")):
        e = base_entry(p)
        fid = p.stem
        if fid in synth_ids:
            e.update(tool="ffmpeg", take="script")
            lg = sfx_synth.get(fid) or synth_log.get(f"sfx/{p.name}", {})
            e["command"] = ("scripts/audio/make_sfx_synth.py" if fid not in ("rise", "chord-tail")
                            else "scripts/audio/make_synth.py") + ": " + (lg.get("design") or lg.get("command") or lg.get("method", ""))
            e["params"] = {k: v for k, v in lg.items() if k not in ("design", "command", "method")}
            e["notes"] = why_synth[fid] + " " + meas_note(e)
            if fid.startswith("whoosh"):
                e["peakSec"] = lg["peak_time_s"]
                e["notes"] = (f"Loudest point (the thud) at {lg['peak_time_s']} s: align that time with the cut. "
                              + e["notes"])
        else:
            c = sfx_choice[fid]
            req = c["request"]
            e.update(tool="elevenlabs-sfx", model=req["model_id"], take=c["take"], prompt=req["text"])
            e["params"] = {"duration_seconds": req["duration_seconds"], "prompt_influence": req["prompt_influence"],
                           "loop": req["loop"], "output_format": "wav_48000", "cut": c["cut"]}
            e["command"] = "scripts/audio/gen-sfx.mjs, then scripts/audio/sfx_finalize.py"
            e["notes"] = "Chosen: " + c["reason"] + ". " + meas_note(e)
        entries.append(e)

    # ---- voice
    voice_meta = VOI_CFG["candidates"][0]
    for p in sorted((PUB / "voice").glob("*.wav")):
        e = base_entry(p)
        c = voice_choice[p.stem]
        line = next(l for l in VOI_CFG["lines"] if l["id"] == p.stem)
        e.update(tool="elevenlabs-tts", model=c["model_id"], take=c["chosen"], prompt=line["text"])
        e["params"] = {"voice_id": c["voice_id"], "voice_name": "Angela (ElevenLabs voice library)",
                       "voice_settings": c["settings"], "output_format": "wav_48000",
                       "endpoint": "/v1/text-to-speech/{voice_id}/with-timestamps",
                       "stt_check": {"model": c["stt_model"], "transcript": c["stt"]},
                       "trim_s": c["trim"], "speech_s": c["speech_s"]}
        e["command"] = (f"scripts/audio/gen-voice.mjs angela {c['variant']} all 1 2 3; scripts/audio/stt.mjs; "
                        "scripts/audio/voice_finalize.py")
        e["notes"] = (f"Speech {c['speech_s']} s (target {line['target_s'][0]}-{line['target_s'][1]} s). Transcript "
                      f"matches. Word times in src/data/voice.json (TTS alignment, compared with speech-to-text: "
                      f"within {max(max(abs(w['d_start_ms']), abs(w['d_end_ms'])) for w in c['word_check'])} ms). "
                      f"eleven_multilingual_v2 at speed {c['settings'].get('speed')} instead of eleven_v4: v4 has no speed "
                      "control and spoke too fast (see scripts/audio/prompts/voice.json). The video description must "
                      "say the voice was generated. " + meas_note(e))
        entries.append(e)

    for e in entries:
        e.pop("_meas", None)
    (FILM / "manifest").mkdir(exist_ok=True)
    (FILM / "manifest/audio.json").write_text(json.dumps(entries, indent=2) + "\n")
    print(f"manifest: {len(entries)} entries")

    # ---- music.json
    secs = []
    for s in MUS_CFG["sections"]:
        b0 = int(s["bars"].split("-")[0])
        secs.append({"bars": s["bars"], "startSec": 2 * (b0 - 1), "durationSec": s["duration_ms"] // 1000,
                     "name": s["name"]})
    k = grid["kick_xcorr"]
    o = grid["onset_calibrated"]
    music = {
        "file": "audio/music/act2.wav", "bpm": 120, "durationSec": 86,
        "take": "t3 (bars 6-43) + t1 (bars 1-5)", "model": "music_v2_5", "sections": secs,
        "beatDeviationMs": {"mean": k["mean_abs_ms"], "max": k["max_abs_ms"]},
        "notes": (
            f"Measured on the final file over 0-76 s against a fixed 0.500 s grid from t = 0: kick attacks (cross-"
            f"correlation, {k['n']} of {grid['beats']} beats carry a kick) mean {k['mean_abs_ms']} ms, max "
            f"{k['max_abs_ms']} ms; fitted tempo {k['fit_bpm']} BPM, first beat at {round(1000 * k['fit_first_beat_s'], 2)} "
            f"ms. All percussive onsets including hats and rims: mean {o['mean_abs_ms']} ms, max {o['max_abs_ms']} ms. "
            "No stretch, no shift. Key A minor at A = 440 Hz within 2 cents (groove loop Am-C-G, 8 bars); breakdown "
            "on G major, strip-back on G minor, final chord A-C-E-B over F. "
            "Edits: bars 1-5 from take t1 (A minor) because t3's build is on F#; splice at 10.000 s inside the bar-5 "
            "mute; +10 dB from 72.0-75.5 s (inside the bars 37-38 mute) so the final chord is usable; 0.5 s end fade. "
            "Where the music differs from the plan (times in the file): drop at 10.0 s brings hats and brightness, "
            "the kick continues from the build; the kick stops at 16.0 s, but the breakdown lasts to 23.5 s, then "
            "0.45 s of near silence and the groove returns at 24.0 s (bar 13, one bar later than planned, so bar 12 "
            "is almost empty); drum gaps at 38.0-40.0 s (bar 20) and 54.0-56.0 s (bar 28) instead of bars 22 and 30; "
            "the lift at 62 s is subtle (wider, not brighter); strip-back from 68.0 s; the chord swells in from about "
            "76.1 s and fades to silence. Loudness per bar (K-weighted, LUFS-like): build -12.6, drop -10.5, "
            "breakdown -18 to -28, groove about -10.8, gaps -15, strip -19.6 to -28, chord -23 to -51. "
            "Stems: audio/music/act2-drums.wav and act2-other.wav, conformed identically (sum = act2.wav within -55 "
            "dB). Speech-to-text on the final file hears no words.")
    }
    (FILM / "src/data/music.json").write_text(json.dumps(music, indent=2) + "\n")
    print("music.json written")


if __name__ == "__main__":
    main()

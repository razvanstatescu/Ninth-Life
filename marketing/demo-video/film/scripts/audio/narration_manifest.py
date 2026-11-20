"""Log the second cut's speech in manifest/audio.json (one entry per file, the existing format).

Run (from film/): .venv/bin/python -I -B scripts/audio/narration_manifest.py [--dry-run]
Appends (skipping paths already listed):
  - every narrator take (_takes/narration-v2/<id>/take-*.wav, and the superseded ones in <id>/v1/),
  - the six new Angela takes (_takes/audio/voice/angela/v2s7x/something-to-say/),
  - the finished narrator lines (public/audio/narration/<id>.wav) and the new app line (public/audio/voice/something-to-say.wav).
Updates in place the three earlier app lines (public/audio/voice/*.wav), whose files were re-levelled: sha256, command,
params.level, notes; and refreshes its own earlier entries (same path) when a file was redone. Nothing else in
existing entries changes. The file must round-trip through json.dumps(indent=2)
and must not change while this runs.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import soundfile as sf

FILM = Path(__file__).resolve().parents[2]
MAN = FILM / "manifest/audio.json"
TAKES = FILM / "_takes/narration-v2"
PLAN = json.loads((FILM / "scripts/audio/prompts/narration.json").read_text())
DATE = "2026-11-10"
# Third cut (2026-11-19): six lines added; their entries carry the day they were made.
THIRD_CUT = {"n18b-keeps-up", "n18c-listen", "n18d-show-flip", "n19b-specs", "n19c-hooks", "n19d-cli"}


def date_of(line_id: str) -> str:
    return "2026-11-19" if line_id in THIRD_CUT else DATE


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def dur(p: Path) -> float:
    i = sf.info(str(p))
    return round(i.frames / i.samplerate, 3)


def take_entry(wav: Path, sel_rows: dict, chosen: str | None, superseded: bool) -> dict:
    meta = json.loads(wav.with_suffix(".json").read_text())
    stt = json.loads(wav.with_suffix(".stt.json").read_text())
    r = sel_rows.get(wav.stem, {})
    hdr = meta.get("response_headers", {})
    req = meta["request"]
    tag = PLAN["act1_tag"] if meta["act"] == 1 else None
    status = ("superseded: generated on a context that was later changed (see the note in narration_select.py and "
              "the report); kept for the record" if superseded else ("CHOSEN" if wav.stem == chosen else "not chosen"))
    m = (f"pace {r.get('wps')} words/s, pitch {r.get('d_f0_st')} st and timbre {r.get('d_timbre_db', r.get('d_ltas_db'))} dB "
         f"from the reference, fails {r.get('fails')}" if r else "no selection metrics")
    return {
        "id": f"narration-take/{meta['id']}/{'v1/' if superseded else ''}{wav.stem}",
        "path": str(wav.relative_to(FILM)), "tool": "elevenlabs-tts", "model": meta["model_id"], "date": date_of(meta["id"]),
        "prompt": meta["sent_text"],
        "command": "scripts/audio/narration-takes.mjs; scripts/audio/narration_select.py",
        "params": {"voice_id": meta["voice_id"], "voice_name": f"{meta['voice_name']} (ElevenLabs voice library)",
                   "voice_settings": req["voice_settings"], "seed": req.get("seed"), "tag": tag,
                   "previous_request_ids": req.get("previous_request_ids", []), "output_format": meta["output_format"],
                   "endpoint": meta["endpoint"], "request_id": hdr.get("request-id"),
                   "character_cost": int(hdr["character-cost"]) if hdr.get("character-cost") else None,
                   "stt_check": {"model": stt["model"], "transcript": stt["text"], "audio_events": stt.get("events", [])}},
        "take": f"{meta['id']}/{'v1/' if superseded else ''}{wav.stem}", "sha256": sha(wav), "durationSec": dur(wav),
        "notes": f"Narrator take, second cut. {status}. {m}. Raw API output, 48 kHz 16-bit mono.",
    }


def main():
    dry = "--dry-run" in sys.argv
    raw = MAN.read_text()
    before = hashlib.sha256(raw.encode()).hexdigest()
    man = json.loads(raw)
    assert json.dumps(man, indent=2) + "\n" == raw, "manifest does not round-trip; refusing to rewrite it"
    have = {e["path"] for e in man}
    new = []
    narration = json.loads((FILM / "src/data/narration.json").read_text())
    # narrator takes
    for line in PLAN["lines"]:
        d = TAKES / line["id"]
        sel = json.loads((d / "select.json").read_text())
        rows = {r["take"]: r for r in sel["takes"]}
        for wav in sorted(d.glob("take-*.wav"), key=lambda p: int(p.stem.split("-")[1])):
            new.append(take_entry(wav, rows, sel["chosen"], False))
        if (d / "v1").exists():
            v1 = json.loads((d / "v1/select.json").read_text())
            v1rows = {r["take"]: r for r in v1["takes"]}
            for wav in sorted((d / "v1").glob("take-*.wav"), key=lambda p: int(p.stem.split("-")[1])):
                new.append(take_entry(wav, v1rows, None, True))
    # finished narrator lines
    for line in PLAN["lines"]:
        d = TAKES / line["id"]
        sel = json.loads((d / "select.json").read_text())
        fin = json.loads((d / "finish.json").read_text())
        al = json.loads((d / "align.json").read_text())
        meta = json.loads((d / f"{sel['chosen']}.json").read_text())
        stt = json.loads((d / f"{sel['chosen']}.stt.json").read_text())
        row = next(r for r in sel["takes"] if r["take"] == sel["chosen"])
        nj = narration[line["id"]]
        out = FILM / "public/audio/narration" / f"{line['id']}.wav"
        span = nj["words"][-1]["end"] - nj["words"][0]["start"]
        new.append({
            "id": f"narration/{line['id']}", "path": str(out.relative_to(FILM)), "tool": "elevenlabs-tts", "model": meta["model_id"],
            "date": date_of(line["id"]), "prompt": meta["sent_text"],
            "command": "scripts/audio/narration-takes.mjs; scripts/audio/narration_select.py; scripts/audio/narration_finish.py; "
                       "scripts/audio/narration-align.mjs; scripts/audio/narration_data.py",
            "params": {"voice_id": meta["voice_id"], "voice_name": f"{meta['voice_name']} (ElevenLabs voice library)",
                       "voice_settings": meta["request"]["voice_settings"], "seed": meta["request"].get("seed"),
                       "tag": PLAN["act1_tag"] if line["act"] == 1 else None,
                       "previous_request_ids": meta["request"].get("previous_request_ids", []),
                       "request_id": meta["response_headers"].get("request-id"), "output_format": meta["output_format"],
                       "endpoint": meta["endpoint"], "source_take": fin["source"], "trim_s": fin["trim_s"], "pad_s": fin["pad_s"],
                       "chain": fin["level"]["chain"], "level_lufs": -19.0, "true_peak_ceiling_dbtp": fin["level"]["limit_dbtp"],
                       "measured": fin["final"], "word_times": "ElevenLabs forced alignment (POST /v1/forced-alignment) on this file",
                       "alignment_loss": al.get("loss"), "pauses": nj["pauses"],
                       "stt_check": {"model": stt["model"], "transcript": stt["text"], "notes": row.get("stt_notes", [])}},
            "take": f"{line['id']}/{sel['chosen']}", "sha256": sha(out), "durationSec": dur(out),
            "notes": (f"Narrator, act {line['act']}. Chosen from {len(sel['takes'])} takes{' (fallback: no take met every rule; ' + '; '.join(row['fails']) + ')' if sel['fallback'] else ''}. "
                      f"{len(nj['words'])} words in {span:.2f} s = {len(nj['words']) / span:.2f} words/s; pauses over 0.35 s {nj['pauses'] or 'none'}. "
                      f"Trim 60 ms head / 150 ms tail (silence padded where the take had less), highpass 80 Hz, compressor -16 dB 2:1, +2 dB at 3 kHz, "
                      f"de-esser, -19.0 LUFS integrated, true peak <= -6.5 dBTP (4x oversampled limiter). 48 kHz 24-bit mono. "
                      f"The narrator's voice is generated; say so in the video description."),
        })
    # Angela: new takes and the new line
    vroot = FILM / "_takes/audio/voice/angela"
    choices = json.loads((FILM / "_takes/audio/voice/choices.json").read_text())
    for variant in ("v2s70", "v2s75"):
        for wav in sorted((vroot / variant / "something-to-say").glob("take-*.wav")):
            meta = json.loads(wav.with_suffix(".json").read_text())
            stt = json.loads(wav.with_suffix(".stt.json").read_text())
            chosen = choices["something-to-say"]["chosen"] == f"{variant}/{wav.name}"
            new.append({
                "id": f"voice-take/something-to-say/{variant}/{wav.stem}", "path": str(wav.relative_to(FILM)), "tool": "elevenlabs-tts",
                "model": meta["model_id"], "date": DATE, "prompt": meta["sent_text"],
                "command": f"scripts/audio/gen-voice.mjs angela {variant} something-to-say 1 2 3; scripts/audio/stt.mjs",
                "params": {"voice_id": meta["voice_id"], "voice_name": "Angela (ElevenLabs voice library)",
                           "voice_settings": meta["request"]["voice_settings"], "output_format": meta["output_format"],
                           "endpoint": "/v1/text-to-speech/{voice_id}/with-timestamps", "character_cost": None,
                           "stt_check": {"model": stt["model"], "transcript": stt["text"]}},
                "take": f"{variant}/{wav.name}", "sha256": sha(wav), "durationSec": dur(wav),
                "notes": (f"App voice take for the new line. {'CHOSEN' if chosen else 'not chosen'}. gen-voice.mjs does not record "
                          "the cost header; Angela carries a 2x credit multiplier. Raw API output."),
            })
    c = choices["something-to-say"]
    vj = json.loads((FILM / "src/data/voice.json").read_text())["something-to-say"]
    out = FILM / "public/audio/voice/something-to-say.wav"
    last = c["level"]["iterations"][-1]
    new.append({
        "id": "something-to-say", "path": str(out.relative_to(FILM)), "tool": "elevenlabs-tts", "model": c["model_id"], "date": DATE,
        "prompt": "I have something to say.",
        "command": f"scripts/audio/gen-voice.mjs angela v2s70|v2s75 something-to-say 1 2 3; scripts/audio/stt.mjs; scripts/audio/voice_finalize.py",
        "params": {"voice_id": c["voice_id"], "voice_name": "Angela (ElevenLabs voice library)", "voice_settings": c["settings"],
                   "output_format": "wav_48000", "endpoint": "/v1/text-to-speech/{voice_id}/with-timestamps",
                   "stt_check": {"model": c["stt_model"], "transcript": c["stt"]}, "trim_s": c["trim"], "speech_s": c["speech_s"],
                   "level": {"lufs": -17.0, "true_peak_ceiling_dbtp": -4.5, "measured": last}},
        "take": c["chosen"], "sha256": sha(out), "durationSec": dur(out),
        "notes": (f"The app's new last line (prompts/narration.json app_voice_new), the same model and settings as the three earlier "
                  f"lines. Speech {c['speech_s']} s (target 1.2-1.9 s). Word times in src/data/voice.json (TTS alignment). -17.0 LUFS "
                  f"integrated, true peak {last['true_peak_dbtp']} dBTP. 48 kHz 24-bit mono. The video description must say the voice was generated."),
    })
    # in-place updates of the three earlier app lines
    updated = []
    for e in man:
        if e["path"] in ("public/audio/voice/hello-again.wav", "public/audio/voice/i-need-water.wav", "public/audio/voice/good-to-be-back.wav"):
            vid = Path(e["path"]).stem
            p = FILM / e["path"]
            h = sha(p)
            if e["sha256"] == h:
                continue
            lv = choices[vid]["level"]["iterations"][-1]
            e["sha256"] = h
            e["command"] = e["command"] + "; re-levelled 2026-11-10 by scripts/audio/voice_finalize.py (same take, same trim)"
            e["params"]["level"] = {"lufs": -17.0, "true_peak_ceiling_dbtp": -4.5, "measured": lv}
            e["notes"] = e["notes"] + (f" RE-LEVELLED 2026-11-10 for the second cut: -17.0 LUFS integrated, true peak {lv['true_peak_dbtp']} dBTP "
                                       "(was a -3 dBFS peak, which left the three lines 4 LU apart); same take, trim, duration and word times.")
            updated.append(vid)
    # entries this script wrote before (same path, one of its own ids) are refreshed in place; others are appended
    mine = ("narration/", "narration-take/", "voice-take/something-to-say/", "something-to-say")
    index = {e["path"]: i for i, e in enumerate(man)}
    refreshed = []
    for n in new:
        i = index.get(n["path"])
        if i is not None and man[i]["id"].startswith(mine) and man[i] != n:
            man[i] = n
            refreshed.append(n["id"])
    new = [n for n in new if n["path"] not in have]
    print(f"{len(man)} entries; {len(new)} to append; updated in place: {updated}; refreshed: {refreshed}")
    if dry:
        return
    if hashlib.sha256(MAN.read_text().encode()).hexdigest() != before:
        raise SystemExit("manifest changed while preparing entries; run again")
    MAN.write_text(json.dumps(man + new, indent=2) + "\n")
    print(f"written: {len(man) + len(new)} entries")


if __name__ == "__main__":
    main()

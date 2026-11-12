"""Append one manifest entry per narrator test take to film/manifest/audio.json (existing entry format).

Run (isolated): film/.venv/bin/python -I manifest_append.py [--dry-run]
Reads film/_takes/narrator-tests/**: the .wav, its .json (request), .stt.json, metrics.json and seq-metrics.json.
Existing entries are left exactly as they are (the file round-trips byte for byte through json.dumps(indent=2));
the script refuses to add a path or id that is already present, and re-reads the file just before writing to make
sure nobody else changed it in between.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import soundfile as sf

FILM = Path(__file__).resolve().parents[2] / "film"
TAKES = FILM / "_takes" / "narrator-tests"
MAN = FILM / "manifest" / "audio.json"
TOOLS = "../research-v2/14-narrator-tools"


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    dry = "--dry-run" in sys.argv
    raw = MAN.read_text()
    before = hashlib.sha256(raw.encode()).hexdigest()
    man = json.loads(raw)
    assert json.dumps(man, indent=2) + "\n" == raw, "manifest does not round-trip; refusing to rewrite it"
    have_paths = {e["path"] for e in man}
    have_ids = {e["id"] for e in man}
    metrics = {r["file"]: r for r in json.loads((TAKES / "metrics.json").read_text())["takes"]}
    seqm = json.loads((TAKES / "seq-metrics.json").read_text())
    new = []
    wavs = sorted(TAKES.glob("*/*/[AB]-take*.wav")) + sorted(TAKES.glob("*/seq-*/s*.wav"))
    for wav in wavs:
        rel = str(wav.relative_to(FILM))
        meta = json.loads(wav.with_suffix(".json").read_text())
        stt = json.loads(wav.with_suffix(".stt.json").read_text())
        info = sf.info(str(wav))
        label, variant = meta["label"], meta["variant"]
        is_seq = variant.startswith("seq-")
        line = meta["line"]
        take = f"{variant}/{wav.stem}"
        eid = f"narrator-test/{label}/{take}"
        if rel in have_paths or eid in have_ids:
            continue
        req = meta["request"]
        sent = meta["sent_text"]
        tag = sent[: sent.index("]") + 1] if sent.startswith("[") else None
        hdr = meta.get("response_headers", {})
        params = {
            "voice_id": meta["voice_id"],
            "voice_name": f"{meta['voice_name']} (ElevenLabs voice library)",
            "voice_settings": req["voice_settings"],
            "seed": req.get("seed"),
            "tag": tag,
            "output_format": meta["output_format"],
            "endpoint": meta["endpoint"],
            "request_id": hdr.get("request-id"),
            "character_cost": int(hdr["character-cost"]) if hdr.get("character-cost") else None,
            "stt_check": {"model": stt["model"], "transcript": stt["text"]},
        }
        if req.get("previous_request_ids"):
            params["previous_request_ids"] = req["previous_request_ids"]
        if is_seq:
            mode = variant.split("-", 1)[1]
            r = next(x for x in seqm[f"{label}/{variant}"]["lines"] if x["line"] == line)
            cmd = f"{TOOLS}/seq.mjs _takes/narrator-tests {label} {mode}; {TOOLS}/stt.mjs; {TOOLS}/seq_measure.py"
            meas = (f"Speech {r['speech_s']:.2f} s, {r['wps']:.2f} words/s, {r['lufs']:.1f} LUFS, true peak {r['true_peak_dbtp']:.1f} dBTP, "
                    f"F0 median {r['f0_median_hz']:.0f} Hz, range {r['f0_range_st']:.1f} st (p10-p90).")
            what = f"Seven-line drift test, line {line} (act {meta['act']}), {mode}; test text, not the film's script."
        else:
            r = metrics[str(wav.relative_to(TAKES))]
            cmd = f"{TOOLS}/gen.mjs _takes/narrator-tests {variant} {label} {line} {meta['take']}; {TOOLS}/stt.mjs; {TOOLS}/measure.py"
            meas = (f"Speech {r['speech_s']:.2f} s, {r['wps']:.2f} words/s, {r['lufs']:.1f} LUFS, true peak {r['true_peak_dbtp']:.1f} dBTP, "
                    f"F0 median {r['f0_median_hz']:.0f} Hz, range {r['f0_range_st']:.1f} st (p10-p90), pauses {[p[1] for p in r['pauses_energy']]} s.")
            what = f"Line {line} ({'Act 1, hushed' if line == 'A' else 'Act 2, clear'}), variant {variant}."
        stt_ok = [w for w in stt["text"].lower().replace(",", " ").replace(".", " ").split()] == \
                 [w for w in meta["line_text"].lower().replace(",", " ").replace(".", " ").split()]
        notes = (f"Narrator voice test for research-v2/14-narrator-voice-and-mix.md; a test take, not a film asset. {what} "
                 f"Transcript {'matches' if stt_ok else 'DIFFERS'}. {meas} {info.samplerate // 1000} kHz "
                 f"{'16' if info.subtype == 'PCM_16' else info.subtype}-bit {'mono' if info.channels == 1 else 'stereo'}, raw API output (not trimmed or levelled).")
        new.append({
            "id": eid, "path": rel, "tool": "elevenlabs-tts", "model": meta["model_id"], "date": meta["date"][:10],
            "prompt": sent, "command": cmd, "params": params, "take": take, "sha256": sha(wav),
            "durationSec": round(info.frames / info.samplerate, 3), "notes": notes,
        })
    print(f"{len(man)} existing entries, {len(new)} new")
    if dry:
        print(json.dumps(new[:2], indent=2))
        return
    if hashlib.sha256(MAN.read_text().encode()).hexdigest() != before:
        raise SystemExit("manifest changed while preparing entries; run again")
    out = man + new
    MAN.write_text(json.dumps(out, indent=2) + "\n")
    check = json.loads(MAN.read_text())
    assert check[: len(man)] == man and len(check) == len(man) + len(new)
    print(f"written: {len(check)} entries")


if __name__ == "__main__":
    main()

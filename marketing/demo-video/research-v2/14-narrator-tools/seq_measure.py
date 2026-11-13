"""Timbre drift across the seven separate lines of seq-plan.json, independent vs stitched.

Run (isolated): film/.venv/bin/python -I seq_measure.py <takesDir>
Per run (voice x mode): each line's pitch median, loudness, words a second; then, inside each act, the spread:
pitch median SD (semitones), mean spectral (1/3-octave LTAS) distance of each line to the act's average (dB),
loudness SD (LU). Lower = steadier. Writes <takesDir>/seq-metrics.json.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from measure import read, SR, speech_bounds, ltas, pitch, loudness, words_of, energy_pauses  # noqa: E402


def main():
    takes = Path(sys.argv[1])
    out = {}
    for run in sorted(takes.glob("*/seq-*")):
        rows = []
        for wav in sorted(run.glob("s*.wav")):
            meta = json.loads(wav.with_suffix(".json").read_text())
            stt = json.loads(wav.with_suffix(".stt.json").read_text())
            x = read(wav).mean(axis=1)
            a, b = speech_bounds(x)
            seg = x[int(a * SR):int(b * SR)]
            p = pitch(seg)
            L = loudness(wav)
            n = len(words_of(meta["line_text"]))
            rows.append({"line": meta["line"], "act": meta["act"], "speech_s": round(b - a, 3), "wps": round(n / (b - a), 2),
                         "f0_median_hz": p["f0_median_hz"], "f0_range_st": p["f0_range_st"], "lufs": L.get("lufs"),
                         "true_peak_dbtp": L.get("true_peak_dbtp"), "ltas": ltas(seg).tolist(),
                         "stt_match": words_of(stt["text"]) == words_of(meta["line_text"]),
                         "pauses": energy_pauses(x, a, b), "stitched_after": len(meta["request"].get("previous_request_ids", []))})
        summary = {}
        for act in (1, 2):
            g = [r for r in rows if r["act"] == act]
            f0 = np.array([r["f0_median_hz"] for r in g])
            st = 12 * np.log2(f0 / np.exp(np.mean(np.log(f0))))
            Ls = np.array([r["ltas"] for r in g])
            centre = Ls.mean(axis=0)
            dist = [float(np.sqrt(np.mean((l - centre) ** 2))) for l in Ls]
            summary[f"act{act}"] = {"lines": len(g), "f0_mean_hz": round(float(np.exp(np.mean(np.log(f0)))), 1),
                                    "f0_sd_st": round(float(np.std(st)), 2), "ltas_dist_mean_db": round(float(np.mean(dist)), 2),
                                    "ltas_dist_max_db": round(float(np.max(dist)), 2),
                                    "lufs_sd": round(float(np.std([r["lufs"] for r in g])), 2),
                                    "wps_mean": round(float(np.mean([r["wps"] for r in g])), 2),
                                    "wps_sd": round(float(np.std([r["wps"] for r in g])), 2)}
        a1, a2 = summary["act1"]["f0_mean_hz"], summary["act2"]["f0_mean_hz"]
        summary["act2_vs_act1_st"] = round(float(12 * np.log2(a2 / a1)), 1)
        key = f"{run.parent.name}/{run.name}"
        out[key] = {"summary": summary, "lines": [{k: v for k, v in r.items() if k != "ltas"} for r in rows]}
        print(f"{key:28s} act1 F0 {summary['act1']['f0_mean_hz']:6.1f} Hz sd {summary['act1']['f0_sd_st']:4.2f} st, LTAS {summary['act1']['ltas_dist_mean_db']:4.2f}/{summary['act1']['ltas_dist_max_db']:4.2f} dB, "
              f"LUFS sd {summary['act1']['lufs_sd']:4.2f}, wps {summary['act1']['wps_mean']:4.2f}±{summary['act1']['wps_sd']:4.2f} | "
              f"act2 F0 {summary['act2']['f0_mean_hz']:6.1f} Hz sd {summary['act2']['f0_sd_st']:4.2f} st, LTAS {summary['act2']['ltas_dist_mean_db']:4.2f}/{summary['act2']['ltas_dist_max_db']:4.2f} dB, "
              f"LUFS sd {summary['act2']['lufs_sd']:4.2f}, wps {summary['act2']['wps_mean']:4.2f}±{summary['act2']['wps_sd']:4.2f} | act2-act1 {summary['act2_vs_act1_st']:+.1f} st | "
              f"stt {'all ok' if all(r['stt_match'] for r in rows) else 'MISMATCH'}")
        for r in rows:
            print(f"    {r['line']} act{r['act']} {r['speech_s']:5.2f}s {r['wps']:4.2f} wps F0 {r['f0_median_hz']:6.1f} rng {r['f0_range_st']:4.1f} {r['lufs']:6.1f} LUFS TP {r['true_peak_dbtp']:5.1f} pauses {r['pauses']}")
    (takes / "seq-metrics.json").write_text(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()

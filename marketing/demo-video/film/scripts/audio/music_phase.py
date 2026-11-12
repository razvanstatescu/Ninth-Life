"""Beat phase of a 120 BPM track, section by section (are all chunks on one grid, and where is it?).

Run (from film/): .venv/bin/python -I -B scripts/audio/music_phase.py <file.wav> [--sections 0:8,10:16,...]
For each section [a, b) s: the percussive onset envelope (music_analyze.onset_envelope) is summed at the points
a + phase + k * 0.5 s for phases -250..+249 ms (1 ms steps; Gaussian weight 6 ms). The best phase, its score
relative to the mean score (a contrast: 1 = no beat at all), and the runner-up phase are printed. A phase near 0
means the beats fall on the film's grid; the same phase everywhere means one shift fixes the whole track.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import read, SR  # noqa: E402
from music_analyze import onset_envelope, env_at  # noqa: E402

DEFAULT = "0:8,10:16,16:34,34:42,42:46,46:53.5,54.5:58,58:64,64:68,68:72,72:76,80:90"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--sections", default=DEFAULT)
    ap.add_argument("--json", default=None)
    a = ap.parse_args()
    x = read(a.file).mean(axis=1)
    env, _ = onset_envelope(x)
    phases = np.arange(-0.250, 0.250, 0.001)
    out = []
    for s in a.sections.split(","):
        t0, t1 = (float(v) for v in s.split(":"))
        k = np.arange(int((t1 - t0) / 0.5))
        sc = np.array([env_at(env, t0 + p + k * 0.5, 0.006).sum() for p in phases])
        i = int(np.argmax(sc))
        far = np.abs(((phases - phases[i]) + 0.25) % 0.5 - 0.25) > 0.04
        j = int(np.argmax(np.where(far, sc, -1)))
        out.append({"section": [t0, t1], "phase_ms": round(1000 * phases[i], 1), "contrast": round(float(sc[i] / (sc.mean() + 1e-9)), 2),
                    "runner_up_ms": round(1000 * phases[j], 1), "runner_up_rel": round(float(sc[j] / (sc[i] + 1e-9)), 2)})
    for r in out:
        print(f"{r['section'][0]:6.1f}-{r['section'][1]:5.1f} s: phase {r['phase_ms']:7.1f} ms  contrast {r['contrast']:5.2f}  "
              f"(runner-up {r['runner_up_ms']:7.1f} ms at {r['runner_up_rel']:.2f})")
    if a.json:
        Path(a.json).write_text(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()

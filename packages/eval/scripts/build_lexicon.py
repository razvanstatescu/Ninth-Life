#!/usr/bin/env python3
"""Build data/lexicon/en.v1.json (LexiconFile, docs/architecture/contracts.md section 1).

Steps (plan section 3.2):
  1. wordfreq 3.1.1 top_n_list('en', N) with zipf_frequency.
  2. normalize (NFKD, strip marks, lowercase, fold curly apostrophes); keep a-z words
     with optional internal apostrophes; drop Zipf < MIN_ZIPF.
  3. Merge words that normalize to the same string (frequencies summed).
  4. Drop apostrophe-less spellings of contractions ("dont", "im") when the contraction
     is at least 1.0 Zipf more frequent: they share its code and are almost always a
     misspelling of it. Real words ("its", "were", "ill", "well") are far closer in
     frequency to their contraction and are kept.
  5. Encode with the standard keypad map, group by code, sort by frequency (desc), then
     word (asc) for determinism. zipfX10 = round(zipf * 10).

Usage: python packages/eval/scripts/build_lexicon.py [--top 60000] [--min-zipf 2.0]
"""

from __future__ import annotations

import argparse
import gzip
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ninth_common import DATA_DIR, EVAL_DIR, WORD_FULL_RE, encode_word, normalize, write_json  # noqa: E402

CONTRACTION_GAP = 1.0


def build(top: int, min_zipf: float) -> tuple[dict, dict]:
    import wordfreq

    version = getattr(wordfreq, "__version__", None)
    if version is None:
        from importlib.metadata import version as _v

        version = _v("wordfreq")
    if version != "3.1.1":
        raise SystemExit(f"wordfreq 3.1.1 required, found {version}")

    raw = wordfreq.top_n_list("en", top)
    stats = {"wordfreq_version": version, "top_n": top, "min_zipf": min_zipf, "raw": len(raw)}

    freq: dict[str, float] = defaultdict(float)  # linear frequency per billion
    rejected_shape = rejected_zipf = 0
    for w in raw:
        z = wordfreq.zipf_frequency(w, "en")
        if z < min_zipf:
            rejected_zipf += 1
            continue
        n = normalize(w)
        if not WORD_FULL_RE.match(n):
            rejected_shape += 1
            continue
        freq[n] += 10 ** z
    stats["rejected_non_alpha"] = rejected_shape
    stats["rejected_low_zipf"] = rejected_zipf
    stats["merged_after_normalize"] = len(raw) - rejected_shape - rejected_zipf - len(freq)

    zipf = {w: math.log10(f) for w, f in freq.items()}

    # Step 4: apostrophe-less contraction spellings.
    best_contraction: dict[str, float] = {}
    for w, z in zipf.items():
        if "'" in w:
            bare = w.replace("'", "")
            best_contraction[bare] = max(best_contraction.get(bare, -1.0), z)
    dropped_bare = sorted(
        w for w, z in zipf.items() if "'" not in w and w in best_contraction and best_contraction[w] - z >= CONTRACTION_GAP
    )
    for w in dropped_bare:
        del zipf[w]
    stats["dropped_bare_contractions"] = dropped_bare

    groups: dict[str, list[tuple[str, float]]] = defaultdict(list)
    for w, z in zipf.items():
        code = encode_word(w)
        assert code is not None, w
        groups[code].append((w, z))

    codes = {}
    for code in sorted(groups):
        items = sorted(groups[code], key=lambda t: (-t[1], t[0]))
        codes[code] = [[w, int(round(z * 10))] for w, z in items]

    lex = {
        "v": 1,
        "lang": "en",
        "source": f"wordfreq {version} top_n_list('en', {top}), zipf >= {min_zipf}, a-z plus internal apostrophe; "
        "normalized NFKD, marks stripped, lowercased; apostrophe-less contraction spellings dropped",
        "license": "CC-BY-SA-4.0",
        "codes": codes,
    }
    return lex, stats


def collision_stats(lex: dict) -> dict:
    codes = lex["codes"]
    n_words = sum(len(v) for v in codes.values())
    shared = sum(len(v) for v in codes.values() if len(v) > 1)
    sizes = sorted((len(v) for v in codes.values()), reverse=True)
    # Frequency-weighted: share of running text whose word is first in its code (what a
    # pure frequency-order decoder gets right with no context).
    total = first = 0.0
    for v in codes.values():
        for i, (_, zx10) in enumerate(v):
            p = 10 ** (zx10 / 10)
            total += p
            if i == 0:
                first += p
    biggest = sorted(codes.items(), key=lambda kv: (-len(kv[1]), kv[0]))[:5]
    return {
        "words": n_words,
        "codes": len(codes),
        "ambiguous_codes": sum(1 for v in codes.values() if len(v) > 1),
        "word_types_sharing_a_code": shared,
        "pct_word_types_sharing_a_code": round(100 * shared / n_words, 2),
        "word_types_not_first_in_code": n_words - len(codes),
        "pct_word_types_not_first_in_code": round(100 * (n_words - len(codes)) / n_words, 2),
        "token_weighted_pct_first_in_code": round(100 * first / total, 2),
        "max_words_per_code": sizes[0],
        "largest_codes": {k: [w for w, _ in v[:8]] for k, v in biggest},
        "examples": {c: [w for w, _ in codes.get(c, [])][:6] for c in ["63", "46", "43", "4663", "5299", "4768"]},
    }


def size_stats(path: Path) -> dict:
    data = path.read_bytes()
    out = {"raw_bytes": len(data), "gzip9_bytes": len(gzip.compress(data, 9, mtime=0))}
    try:
        import brotli

        out["brotli11_bytes"] = len(brotli.compress(data, quality=11))
    except ImportError:
        out["brotli11_bytes"] = None
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=60000)
    ap.add_argument("--min-zipf", type=float, default=2.0)
    ap.add_argument("--out", type=Path, default=DATA_DIR / "lexicon" / "en.v1.json")
    ap.add_argument("--stats", type=Path, default=EVAL_DIR / "build-stats" / "lexicon.json")
    args = ap.parse_args()

    lex, stats = build(args.top, args.min_zipf)
    write_json(args.out, lex, one_key_per_line="codes")
    stats.update(collision_stats(lex))
    stats["file"] = str(args.out.relative_to(DATA_DIR.parent)) if args.out.is_relative_to(DATA_DIR.parent) else str(args.out)
    stats.update(size_stats(args.out))
    args.stats.parent.mkdir(parents=True, exist_ok=True)
    args.stats.write_text(json.dumps(stats, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in stats.items() if k not in ("dropped_bare_contractions", "largest_codes")}, indent=2))
    print(f"dropped {len(stats['dropped_bare_contractions'])} bare contraction spellings")
    return 0


if __name__ == "__main__":
    sys.exit(main())

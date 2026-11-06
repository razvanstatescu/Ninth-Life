#!/usr/bin/env python3
"""Build data/lexicon/en.v1.json (LexiconFile, docs/architecture/contracts.md section 1).

Steps (plan section 3.2):
  1. wordfreq 3.1.1 top_n_list('en', N) with zipf_frequency.
  2. normalize (NFKD, strip marks, lowercase, fold curly apostrophes); keep a-z words
     with optional internal apostrophes; drop Zipf < MIN_ZIPF.
  3. Merge words that normalize to the same string (frequencies summed).
  3b. Drop the third-party trademarks listed (as hashes) in BANNED_SHA256.
  4. Drop apostrophe-less spellings of contractions ("dont", "im") when the contraction
     is at least 1.0 Zipf more frequent: they share its code and are almost always a
     misspelling of it. Real words ("its", "were", "ill", "well") are far closer in
     frequency to their contraction and are kept.
  4b. Word-class filters (plan F2, ADR-data-002), from SCOWL 2020.12.07 word lists:
     --acronyms keep|down|drop  words SCOWL lists only in ALL CAPS (bbc, nfl, pcs), or with
                            --acronym-signal novowel, 2-5 letters and no vowel;
     --junk keep|down|drop      words in no SCOWL list at all (lol, xbox, goin).
     Shipped: both "down" (measured best; "drop" made test items unreachable).
     "down" subtracts --down-zipf (default 1.0) from the word's Zipf, floored at --min-zipf,
     so it sinks below the other readings of its code but stays typeable. One-letter words
     are never touched here (core's language model penalises them instead, ADR-core-002).
  5. Encode with the standard keypad map, group by code, sort by frequency (desc), then
     word (asc) for determinism. zipfX10 = round(zipf * 10).

Usage: python packages/eval/scripts/build_lexicon.py [--top 60000] [--min-zipf 2.0]
       [--acronyms keep|down|drop] [--junk keep|down|drop] [--scowl DIR] [--scowl-level 95]
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ninth_common import (  # noqa: E402
    CACHE_DIR,
    DATA_DIR,
    EVAL_DIR,
    WORD_FULL_RE,
    encode_word,
    load_scowl,
    looks_like_acronym,
    normalize,
    word_class,
    write_json,
)

CONTRACTION_GAP = 1.0
# Shipped word-class filter settings (step 4b, ADR-data-002, measured in docs/architecture/data-and-eval.md). "keep" = off.
DEFAULT_ACRONYMS = "down"
DEFAULT_JUNK = "down"

# Third-party trademarks the product must never show (.kiro/steering/trademarks.md). Stored as
# SHA-256 of the normalized word so this file does not spell them (tm-lint scans scripts).
BANNED_SHA256 = {
    "2ab6d53e717a0e0d773ccfdb8b0e84ac494729c6b567c72d256b883a9db17ea8",
    "48c2b33eeb8d9f12837d045394028ae014ab0b43bcb1e094bcff764fba3504d3",
    "5ed4c844477205875f8cdeaf2e8ea50580fe302eb0812afc98966916440eebac",
    "ef46a230cfb0c087fdd8883bc989a3eaa253428f9f6033335e0cee7173c42a92",
}


def is_banned(word: str) -> bool:
    """True for a banned mark and its apostrophe forms ("x's")."""
    stem = word.split("'")[0]
    return any(hashlib.sha256(w.encode("utf-8")).hexdigest() in BANNED_SHA256 for w in (word, stem))


class Filters:
    """Word-class filter settings (step 4b). The defaults change nothing."""

    def __init__(self, acronyms="keep", junk="keep", down_zipf=1.0, acronym_signal="scowl",
                 scowl_dir: Path | None = None, scowl_level=95):
        self.acronyms, self.junk, self.down_zipf = acronyms, junk, down_zipf
        self.acronym_signal, self.scowl_dir, self.scowl_level = acronym_signal, scowl_dir, scowl_level

    @property
    def active(self) -> bool:
        return self.acronyms != "keep" or self.junk != "keep"

    @property
    def needs_scowl(self) -> bool:
        return self.junk != "keep" or (self.acronyms != "keep" and self.acronym_signal == "scowl")

    def describe(self) -> str:
        parts = []
        if self.acronyms != "keep":
            sig = f"SCOWL {self.scowl_level} all-caps only" if self.acronym_signal == "scowl" else "no vowel, 2-5 letters"
            parts.append(f"acronyms ({sig}) {self._verb(self.acronyms)}")
        if self.junk != "keep":
            parts.append(f"words in no SCOWL {self.scowl_level} list {self._verb(self.junk)}")
        return "; ".join(parts)

    def _verb(self, how: str) -> str:
        return "dropped" if how == "drop" else f"down-weighted {self.down_zipf} Zipf"


def apply_filters(zipf: dict[str, float], f: Filters, min_zipf: float, stats: dict,
                  scowl: dict[str, set[str]] | None = None) -> None:
    """Step 4b, in place. Records counts and a few examples in stats. `scowl` (normalized word ->
    shapes, see ninth_common.load_scowl) is loaded from f.scowl_dir when not given."""
    if not f.active:
        return
    if scowl is None:
        scowl = load_scowl(f.scowl_dir, f.scowl_level) if f.needs_scowl else {}
    classes: dict[str, int] = defaultdict(int)
    acted: dict[str, list[str]] = {"acronyms": [], "junk": []}
    for w in sorted(zipf, key=lambda x: (-zipf[x], x)):
        if len(w.replace("'", "")) == 1:
            continue  # one-letter words: core's LM penalty (ADR-core-002)
        cls = word_class(w, scowl) if scowl else "unknown"
        classes[cls] += 1
        if f.acronym_signal == "novowel":
            is_acr = looks_like_acronym(w)
        else:
            is_acr = cls == "acronym"
        group, how = (("acronyms", f.acronyms) if is_acr else ("junk", f.junk) if cls == "none" else (None, "keep"))
        if group is None or how == "keep":
            continue
        acted[group].append(w)
        if how == "drop":
            del zipf[w]
        else:
            zipf[w] = max(min_zipf, zipf[w] - f.down_zipf)
    stats["filters"] = {
        "settings": {"acronyms": f.acronyms, "junk": f.junk, "down_zipf": f.down_zipf,
                     "acronym_signal": f.acronym_signal, "scowl_level": f.scowl_level},
        "word_classes": dict(sorted(classes.items())),
        "acronyms_affected": len(acted["acronyms"]),
        "junk_affected": len(acted["junk"]),
        # Most frequent first. Examples only: the full list is reproducible from the build.
        "acronym_examples": acted["acronyms"][:25],
        "junk_examples": acted["junk"][:25],
    }


def build(top: int, min_zipf: float, filters: Filters | None = None) -> tuple[dict, dict]:
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
    rejected_shape = rejected_zipf = rejected_banned = 0
    for w in raw:
        z = wordfreq.zipf_frequency(w, "en")
        if z < min_zipf:
            rejected_zipf += 1
            continue
        n = normalize(w)
        if not WORD_FULL_RE.match(n):
            rejected_shape += 1
            continue
        if is_banned(n):
            rejected_banned += 1
            continue
        freq[n] += 10 ** z
    stats["rejected_non_alpha"] = rejected_shape
    stats["rejected_low_zipf"] = rejected_zipf
    stats["rejected_trademark"] = rejected_banned
    stats["merged_after_normalize"] = len(raw) - rejected_shape - rejected_zipf - rejected_banned - len(freq)

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

    # Step 4b: word-class filters (ADR-data-002).
    filters = filters or Filters()
    apply_filters(zipf, filters, min_zipf, stats)

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
        "normalized NFKD, marks stripped, lowercased; apostrophe-less contraction spellings dropped"
        + (f"; {filters.describe()}" if filters.active else ""),
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
    ap.add_argument("--acronyms", choices=["keep", "down", "drop"], default=DEFAULT_ACRONYMS)
    ap.add_argument("--acronym-signal", choices=["scowl", "novowel"], default="scowl")
    ap.add_argument("--junk", choices=["keep", "down", "drop"], default=DEFAULT_JUNK)
    ap.add_argument("--down-zipf", type=float, default=1.0)
    ap.add_argument("--scowl", type=Path, default=CACHE_DIR / "scowl" / "final")
    ap.add_argument("--scowl-level", type=int, default=95)
    ap.add_argument("--out", type=Path, default=DATA_DIR / "lexicon" / "en.v1.json")
    ap.add_argument("--stats", type=Path, default=EVAL_DIR / "build-stats" / "lexicon.json")
    args = ap.parse_args()

    filters = Filters(args.acronyms, args.junk, args.down_zipf, args.acronym_signal, args.scowl, args.scowl_level)
    lex, stats = build(args.top, args.min_zipf, filters)
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

#!/usr/bin/env python3
"""Build data/lexicon/en.v1.json (LexiconFile, docs/architecture/contracts.md section 1) and its
compact twin data/lexicon/en.v2.json (LexiconFileV2, ADR-data-003), which is what the web app ships.

Steps (plan section 3.2):
  1. wordfreq 3.1.1 top_n_list('en', N) with zipf_frequency.
  2. normalize (NFKD, strip marks, lowercase, fold curly apostrophes); keep a-z words
     with optional internal apostrophes; drop Zipf < MIN_ZIPF.
  3. Merge words that normalize to the same string (frequencies summed).
  3b. Drop the third-party trademarks listed (as hashes) in BANNED_SHA256.
  3c. Identity slurs (decision D7, ADR-data-004), listed as hashes in slurs.sha256.json:
     --slurs keep|down|drop   Shipped: "drop", so they are never suggested; a person can still
                              type one on purpose with spell mode and "My words" (the web app adds
                              any spelled word to the lexicon). "down" sets them to --min-zipf.
     General profanity and sexual words are not on the list and stay.
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
  6. Write the compact v2 file from the v1 dict (compact_lexicon): the same words and zipfX10,
     without the codes (core derives them on load). One group per zipfX10, highest first; inside a
     group, words in the order JavaScript reads v1 (js_code_order, then the code's own order),
     space-separated, so core breaks score ties exactly as it does for v1.
     Deterministic: the same v1 always gives the same bytes (test_build_lexicon.py).

Usage: python packages/eval/scripts/build_lexicon.py [--top 60000] [--min-zipf 2.0]
       [--acronyms keep|down|drop] [--junk keep|down|drop] [--slurs keep|down|drop]
       [--slur-list FILE] [--scowl DIR] [--scowl-level 95]
       python packages/eval/scripts/build_lexicon.py --compact-only   (v2 from the existing v1, offline)
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
# Shipped slur filter (step 3c, decision D7, ADR-data-004).
DEFAULT_SLURS = "drop"
SLUR_LIST = Path(__file__).resolve().parent / "slurs.sha256.json"

# Third-party trademarks the product must never show (.kiro/steering/trademarks.md). Stored as
# SHA-256 of the normalized word so this file does not spell them (tm-lint scans scripts).
BANNED_SHA256 = {
    "2ab6d53e717a0e0d773ccfdb8b0e84ac494729c6b567c72d256b883a9db17ea8",
    "48c2b33eeb8d9f12837d045394028ae014ab0b43bcb1e094bcff764fba3504d3",
    "5ed4c844477205875f8cdeaf2e8ea50580fe302eb0812afc98966916440eebac",
    "ef46a230cfb0c087fdd8883bc989a3eaa253428f9f6033335e0cee7173c42a92",
}


def hash_listed(word: str, hashes: set[str]) -> bool:
    """True when SHA-256 of the word, or of its stem before an apostrophe ("x's"), is in `hashes`."""
    stem = word.split("'")[0]
    return any(hashlib.sha256(w.encode("utf-8")).hexdigest() in hashes for w in (word, stem))


def is_banned(word: str) -> bool:
    """True for a banned mark and its apostrophe forms ("x's")."""
    return hash_listed(word, BANNED_SHA256)


def load_slur_hashes(path: Path = SLUR_LIST) -> set[str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    hashes = {e["sha256"] for e in data["words"]}
    assert all(len(h) == 64 and all(c in "0123456789abcdef" for c in h) for h in hashes), path
    return hashes


def apply_slur_filter(zipf: dict[str, float], how: str, hashes: set[str], min_zipf: float, stats: dict,
                      list_path: Path = SLUR_LIST) -> None:
    """Step 3c, in place: drop (or sink to min_zipf) the words whose hash is listed. Stats record
    counts and 8-digit hash prefixes only, never the words."""
    hits = sorted(w for w in zipf if hash_listed(w, hashes)) if how != "keep" else []
    for w in hits:
        if how == "drop":
            del zipf[w]
        else:
            zipf[w] = min_zipf
    stats["slurs"] = {
        "mode": how,
        "list": f"packages/eval/scripts/{list_path.name}",
        "list_sha256": hashlib.sha256(list_path.read_bytes()).hexdigest() if list_path.exists() else None,
        "listed": len(hashes),
        "affected": len(hits),
        "affected_sha256_8": sorted(hashlib.sha256(w.encode("utf-8")).hexdigest()[:8] for w in hits),
    }


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


def build(top: int, min_zipf: float, filters: Filters | None = None, slurs: str = "keep",
          slur_list: Path = SLUR_LIST) -> tuple[dict, dict]:
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

    # Step 3c: identity slurs (D7, ADR-data-004).
    hashes = load_slur_hashes(slur_list) if slurs != "keep" else set()
    apply_slur_filter(zipf, slurs, hashes, min_zipf, stats, slur_list)

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
    n_slurs = stats["slurs"]["affected"]
    slur_note = "" if slurs == "keep" else (
        f"; {n_slurs} identity slurs " + ("dropped" if slurs == "drop" else f"set to zipf {min_zipf}") + " (hash list, ADR-data-004)")

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
        + (f"; {filters.describe()}" if filters.active else "")
        + slur_note,
        "license": "CC-BY-SA-4.0",
        "codes": codes,
    }
    return lex, stats


COMPACT_NOTE = "compact v2 of en.v1.json: words grouped by zipf x 10, codes derived on load (ADR-data-003)"


# Largest array index in JavaScript (2^32 - 2): object keys that are canonical integers up to this
# value are enumerated first, in ascending numeric order; every other key follows in insertion order.
JS_MAX_ARRAY_INDEX = 2**32 - 2


def js_code_order(codes: dict) -> list[str]:
    """The keys of a v1 `codes` object in the order Object.values() visits them in JavaScript."""
    index = sorted((c for c in codes if int(c) <= JS_MAX_ARRAY_INDEX), key=int)
    rest = [c for c in codes if int(c) > JS_MAX_ARRAY_INDEX]
    return index + rest


def compact_lexicon(lex: dict, v1_sha256: str) -> dict:
    """LexiconFileV2 from a LexiconFile (v1): same words, same zipfX10, no codes.

    Groups by zipfX10, highest first. Inside a group, words keep the order in which JavaScript
    reads v1 (js_code_order: integer-like codes ascending by value, then the rest as written),
    then each code's own order (frequency desc, word asc). Core breaks score ties by load order,
    so lookup() and completions() give the same lists for both files.
    """
    groups: dict[int, list[str]] = defaultdict(list)
    for code in js_code_order(lex["codes"]):
        for w, zx10 in lex["codes"][code]:
            assert " " not in w and w, w
            groups[int(zx10)].append(w)
    return {
        "v": 2,
        "lang": lex["lang"],
        "source": lex["source"] + "; " + COMPACT_NOTE,
        "license": lex["license"],
        "derived_from": {"file": "en.v1.json", "sha256": v1_sha256},
        "words": [[z, " ".join(groups[z])] for z in sorted(groups, reverse=True)],
    }


def write_compact(path: Path, lex2: dict) -> None:
    """Deterministic v2 JSON: the header on the first line, then one zipf group per line."""
    head = {k: v for k, v in lex2.items() if k != "words"}
    head_txt = json.dumps(head, ensure_ascii=False, separators=(",", ":"))[:-1]
    lines = [json.dumps(g, ensure_ascii=False, separators=(",", ":")) for g in lex2["words"]]
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(head_txt + ',"words":[\n' + ",\n".join(lines) + "\n]}\n")


def write_compact_from(v1_path: Path, v2_path: Path) -> dict:
    data = v1_path.read_bytes()
    lex2 = compact_lexicon(json.loads(data.decode("utf-8")), hashlib.sha256(data).hexdigest())
    write_compact(v2_path, lex2)
    return lex2


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
    ap.add_argument("--slurs", choices=["keep", "down", "drop"], default=DEFAULT_SLURS,
                    help="identity slurs in --slur-list (ADR-data-004); keep reproduces the pre-D7 lexicon")
    ap.add_argument("--slur-list", type=Path, default=SLUR_LIST)
    ap.add_argument("--scowl", type=Path, default=CACHE_DIR / "scowl" / "final")
    ap.add_argument("--scowl-level", type=int, default=95)
    ap.add_argument("--out", type=Path, default=DATA_DIR / "lexicon" / "en.v1.json")
    ap.add_argument("--stats", type=Path, default=EVAL_DIR / "build-stats" / "lexicon.json")
    ap.add_argument("--v2-out", type=Path, default=DATA_DIR / "lexicon" / "en.v2.json")
    ap.add_argument("--compact-only", action="store_true", help="only (re)write --v2-out from the existing --out")
    args = ap.parse_args()

    if args.compact_only:
        lex2 = write_compact_from(args.out, args.v2_out)
        print(json.dumps({"file": str(args.v2_out), "groups": len(lex2["words"]), **size_stats(args.v2_out)}, indent=2))
        return 0

    filters = Filters(args.acronyms, args.junk, args.down_zipf, args.acronym_signal, args.scowl, args.scowl_level)
    lex, stats = build(args.top, args.min_zipf, filters, args.slurs, args.slur_list)
    write_json(args.out, lex, one_key_per_line="codes")
    write_compact_from(args.out, args.v2_out)
    stats.update(collision_stats(lex))
    stats["file"] = str(args.out.relative_to(DATA_DIR.parent)) if args.out.is_relative_to(DATA_DIR.parent) else str(args.out)
    stats.update(size_stats(args.out))
    stats["v2"] = {"file": "data/lexicon/en.v2.json", **size_stats(args.v2_out)}
    args.stats.parent.mkdir(parents=True, exist_ok=True)
    args.stats.write_text(json.dumps(stats, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in stats.items() if k not in ("dropped_bare_contractions", "largest_codes")}, indent=2))
    print(f"dropped {len(stats['dropped_bare_contractions'])} bare contraction spellings")
    return 0


if __name__ == "__main__":
    sys.exit(main())

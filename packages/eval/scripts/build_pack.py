#!/usr/bin/env python3
"""Build data/packs/core-en.json (VocabPack, docs/architecture/contracts.md section 4).

words:   the 36 Universal Core words (UNC Center for Literacy and Disability Studies /
         Project Core), each with a small boost (BOOST Zipf units). The boost is a
         tie-breaker: at 0.1 it changes no first-choice reading in en.v1.json, while
         0.3 would already put "go" above "i'm" on key 46 (measured).
phrases: short, generic phrases mined from the AACText *train* split only
         (sent_train_aac.txt). A phrase is a candidate when at least MIN_COUNT different
         lines in the training set reduce to the same words (apostrophes ignored), so
         every phrase was independently written by two or more workers. Then:
           * 1 to 6 words, every word typable and in the lexicon;
           * no capitalised word mid-sentence except an allowlist (I, TV, Mom ...),
             which removes personal names;
           * minus a reviewed denylist of odd, rude or context-bound lines.
         Order: number of workers who wrote it (desc), then text.

Usage: python packages/eval/scripts/build_pack.py
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ninth_common import DATA_DIR, EVAL_DIR, encode_word, load_aac, normalize, tokenize, write_json  # noqa: E402

# Universal Core vocabulary, 36 words, as listed by UNC CLDS (alphabetical).
UNIVERSAL_CORE = (
    "all can different do finished get go good he help here I in it like look make more "
    "not on open put same she some stop that turn up want what when where who why you"
).split()
assert len(UNIVERSAL_CORE) == 36

BOOST = 0.1
MIN_COUNT = 2
MAX_WORDS = 6

# Capitalised words allowed mid-phrase (not personal names).
CAPS_OK = {"i", "i'm", "i'll", "i'd", "i've", "tv", "ok", "mom", "mum", "dad", "christmas"}

# Reviewed by hand (normalised words, apostrophes removed). Reasons: ungrammatical or
# unclear out of context, rude, or about a specific third party.
DENY = {
    "very well for what",
    "why you asked",
    "good you liked it",
    "nice place",
    "which hospital",
    "med time",
    "watch our children",
    "ok ill try but cannot promise",
    "shut up",
    "i too think so",
    "can you give me some money",
    "where is your father",
    "come near me",
    "feeling thirsty",
    "hug me",
    "hello all",
    "also i love you",
    "i want to pay",
    "i love you all",
    "go away",
    "dont blame me",
    "thankyou",
}

QUESTION_START = {"what", "where", "when", "who", "why", "how", "can", "could", "are", "is", "do", "did", "will", "would"}

_MULTI_PUNCT = re.compile(r"([!?.])[!?.]+")
_I_FORMS = re.compile(r"\bi(?=\b|')")


def tidy(surface: str) -> str:
    s = " ".join(surface.split())
    s = _MULTI_PUNCT.sub(r"\1", s)
    s = re.sub(r"\s+([!?.,])", r"\1", s)
    s = _I_FORMS.sub("I", s)
    s = re.sub(r"\btv\b", "TV", s, flags=re.IGNORECASE)
    s = s[0].upper() + s[1:]
    is_q = normalize(s).split()[0].strip(",.!?") in QUESTION_START
    if s[-1] not in ".?!":
        s += "?" if is_q else "."
    elif s[-1] == "." and is_q:
        s = s[:-1] + "?"
    return s


def caps_ok(surface: str) -> bool:
    toks = surface.split()
    for t in toks[1:]:
        core = t.strip(",.!?;:\"'()")
        if core[:1].isupper() and normalize(core) not in CAPS_OK:
            return False
    return True


def main() -> int:
    lex = json.loads((DATA_DIR / "lexicon" / "en.v1.json").read_text(encoding="utf-8"))
    vocab = {w for items in lex["codes"].values() for w, _ in items}

    counts: Counter = Counter()
    surfaces: dict[str, Counter] = defaultdict(Counter)
    for line in load_aac("train"):
        words, clean = tokenize(line)
        if not clean or not (1 <= len(words) <= MAX_WORDS):
            continue
        key = " ".join(w.replace("'", "") for w in words)
        counts[key] += 1
        surfaces[key][line.strip()] += 1

    phrases = []
    rejected = Counter()
    for key, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])):
        if n < MIN_COUNT:
            break
        if key in DENY:
            rejected["denylist"] += 1
            continue
        # Surface forms whose words are all in the lexicon and that pass the name check;
        # prefer the most frequent, then one that starts with a capital and has an apostrophe.
        good = []
        for s, c in surfaces[key].items():
            ws, _ = tokenize(s)
            if all(w in vocab for w in ws) and caps_ok(s):
                good.append((c, s[:1].isupper(), "'" in s or "’" in s, s))
        if not good:
            rejected["oov_or_name"] += 1
            continue
        good.sort(key=lambda t: (-t[0], not t[1], not t[2], t[3]))
        phrases.append(tidy(good[0][3]))

    # Deduplicate after tidying (e.g. "Thank you" / "Thank you.").
    seen, uniq = set(), []
    for p in phrases:
        k = re.sub(r"[^a-z]", "", normalize(p))  # "Good bye." == "Goodbye!"
        if k not in seen:
            seen.add(k)
            uniq.append(p)

    words = []
    for w in UNIVERSAL_CORE:
        n = normalize(w)
        assert encode_word(n) and n in vocab, w
        words.append({"w": n, "boost": BOOST})

    pack = {"id": "core-en", "lang": "en", "version": 1, "words": words, "phrases": uniq}
    out = DATA_DIR / "packs" / "core-en.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(pack, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    stats = {"core_words": len(words), "phrases": len(uniq), "candidates_min_count": sum(1 for v in counts.values() if v >= MIN_COUNT),
             "rejected": dict(rejected), "bytes": out.stat().st_size}
    (EVAL_DIR / "build-stats").mkdir(exist_ok=True)
    (EVAL_DIR / "build-stats" / "pack.json").write_text(json.dumps(stats, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

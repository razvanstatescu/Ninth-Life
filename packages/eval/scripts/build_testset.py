#!/usr/bin/env python3
"""Freeze the evaluation test set: packages/eval/fixtures/test.v1.jsonl + eval.lock.

Contents (plan section 3.4):
  * AACText sent_test_aac.txt (TurkTest, 10% of workers, disjoint from the training workers).
  * Up to 300 partner/reply pairs from the Turk dialogues *test* split (filtered ids):
    each pair is (turn k, turn k+1). Pairs are ranked by sha256("<id>:<k>") and the
    first 300 usable ones are taken, so the choice is deterministic and unbiased.

A sentence is usable when every token can be typed with letter keys (no digits or
symbols; see ninth_common.tokenize) and it has 1 to 20 words (the decode API limit).
Out-of-lexicon words (names, rare words) are kept: they are part of the real task.

Each JSONL line: {"id","src","text","words","codes","partner"?}. Lines are sorted by id.
eval.lock records the SHA-256 of the fixture and of each input file.

Usage: python packages/eval/scripts/build_testset.py [--check]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ninth_common import CACHE_DIR, DATA_DIR, EVAL_DIR, encode_word, load_aac, load_turk, sha256_file, tokenize  # noqa: E402

MAX_WORDS = 20
TURK_PAIRS = 300
FIXTURE = EVAL_DIR / "fixtures" / "test.v1.jsonl"
LOCK = EVAL_DIR / "eval.lock"


def usable(text: str) -> list[str] | None:
    words, clean = tokenize(text)
    if not clean or not (1 <= len(words) <= MAX_WORDS):
        return None
    return words


def build() -> tuple[list[dict], dict]:
    rows: list[dict] = []
    stats = {"aac_test_lines": 0, "aac_dropped": 0, "turk_test_dialogues": 0, "turk_candidate_pairs": 0}

    aac = load_aac("test")
    stats["aac_test_lines"] = len(aac)
    for i, text in enumerate(aac, start=1):
        words = usable(text)
        if words is None:
            stats["aac_dropped"] += 1
            continue
        rows.append({"id": f"aac-{i:04d}", "src": "aac", "text": text, "words": words,
                     "codes": [encode_word(w) for w in words]})

    turk = [d for d in load_turk() if d["split"] == "test"]
    stats["turk_test_dialogues"] = len(turk)
    cands = []
    for d in turk:
        t = d["turns"]
        for k in range(1, len(t)):
            partner, reply = t[k - 1], t[k]
            if not partner or not reply:
                continue
            words = usable(reply)
            if words is None:
                continue
            rank = hashlib.sha256(f"{d['id']}:{k}".encode()).hexdigest()
            cands.append((rank, d["id"], k, partner, reply, words))
    stats["turk_candidate_pairs"] = len(cands)
    cands.sort()
    for _, did, k, partner, reply, words in cands[:TURK_PAIRS]:
        rows.append({"id": f"turk-{did}-{k + 1}", "src": "turk", "text": reply, "words": words,
                     "codes": [encode_word(w) for w in words], "partner": partner})

    rows.sort(key=lambda r: r["id"])
    lex = json.loads((DATA_DIR / "lexicon" / "en.v1.json").read_text(encoding="utf-8"))
    vocab = {w for items in lex["codes"].values() for w, _ in items}
    n_words = sum(len(r["words"]) for r in rows)
    stats.update({
        "rows": len(rows),
        "rows_aac": sum(r["src"] == "aac" for r in rows),
        "rows_turk": sum(r["src"] == "turk" for r in rows),
        "words": n_words,
        "oov_words_vs_en_v1": sum(w not in vocab for r in rows for w in r["words"]),
    })
    stats["oov_rate_pct"] = round(100 * stats["oov_words_vs_en_v1"] / n_words, 2)
    return rows, stats


def serialise(rows: list[dict]) -> bytes:
    return "".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n" for r in rows).encode("utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="rebuild in memory and compare with eval.lock")
    args = ap.parse_args()

    rows, stats = build()
    data = serialise(rows)
    digest = hashlib.sha256(data).hexdigest()
    if args.check:
        lock = json.loads(LOCK.read_text(encoding="utf-8"))
        ok = lock["fixture"]["sha256"] == digest == sha256_file(FIXTURE)
        print("fixture matches eval.lock" if ok else "MISMATCH: fixture, rebuild and eval.lock disagree")
        return 0 if ok else 1

    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE.write_bytes(data)
    inputs = {}
    for rel in ("imagine/sent_test_aac.txt", "turk/turk-dialogues.txt", "turk/turk-dialogues-filtered.txt"):
        inputs[rel] = sha256_file(CACHE_DIR / rel)
    lock = {
        "version": 1,
        "fixture": {"path": "fixtures/test.v1.jsonl", "sha256": digest, "rows": len(rows), "bytes": len(data)},
        "inputs": inputs,
        "lexicon": {"path": "data/lexicon/en.v1.json", "sha256": sha256_file(DATA_DIR / "lexicon" / "en.v1.json")},
        "bigram": {"path": "data/lexicon/en.bigram.v1.json",
                   "sha256": sha256_file(DATA_DIR / "lexicon" / "en.bigram.v1.json")},
        "stats": stats,
    }
    LOCK.write_text(json.dumps(lock, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(lock, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

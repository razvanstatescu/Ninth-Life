#!/usr/bin/env python3
"""Build data/lexicon/en.bigram.v1.json (BigramFile, docs/architecture/contracts.md section 1).

Training text: AACText sent_train_aac.txt + Turk dialogues (filtered ids) with set == train,
all six turns. Dev and test splits are never read here.

Model: interpolated bigram with modified Kneser-Ney discounts (Chen and Goodman D1, D2,
D3+), whose lower-order distribution is the *deployed* unigram, i.e. exactly what
`unigramModel(lex)` in @ninth/core computes: log10 Pu(w) = zipfX10/10 - 9. This keeps the
file consistent with how core backs off:

    P(w | v) = max(c(v,w) - D(c), 0) / c(v) + lambda(v) * Pu(w)       stored in logp[v][w]
    P(w | v) = beta(v) * Pu(w)                                          for w not stored

Pruning: a pair is kept only if its probability differs from the backoff estimate by at
least --prune log10 units (a simple relative-entropy style criterion). After pruning,
beta(v) is renormalised over the kept pairs:
    beta(v) = (1 - sum_kept P(w|v)) / (1 - sum_kept Pu(w)).
Values are log10, rounded to 2 decimals. Only words present in the lexicon are modelled;
an out-of-lexicon or untypable token breaks the chain (no bigram across it).

Usage: python packages/eval/scripts/build_bigrams.py [--prune 0.2] [--min-count 1] [--no-turk]
"""

from __future__ import annotations

import argparse
import gzip
import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ninth_common import (  # noqa: E402
    DATA_DIR,
    EVAL_DIR,
    load_aac,
    load_turk,
    split_sentences,
    tokenize_marked,
    write_json,
)

BOS = "<s>"


def load_unigram(lex_path: Path) -> dict[str, float]:
    lex = json.loads(lex_path.read_text(encoding="utf-8"))
    return {w: zx / 10 - 9 for items in lex["codes"].values() for w, zx in items}


def training_sentences(use_turk: bool) -> tuple[list[str], dict]:
    aac = load_aac("train")
    sents = list(aac)
    info = {"aac_train_lines": len(aac)}
    if use_turk:
        turk = [d for d in load_turk() if d["split"] == "train"]
        turns = [t for d in turk for t in d["turns"] if t]
        sents += turns
        info["turk_train_dialogues"] = len(turk)
        info["turk_train_turns"] = len(turns)
    return sents, info


def count(sentences: list[str], vocab: set[str]) -> tuple[Counter, dict]:
    bigrams: Counter = Counter()
    tokens = oov = 0
    for line in sentences:
        for sent in split_sentences(line):
            prev: str | None = BOS
            for w in tokenize_marked(sent):
                tokens += 1
                if w is None or w not in vocab:
                    oov += 1
                    prev = None
                    continue
                if prev is not None:
                    bigrams[(prev, w)] += 1
                prev = w
    return bigrams, {"tokens": tokens, "oov_or_untypable_tokens": oov, "bigram_tokens": sum(bigrams.values()),
                     "bigram_types": len(bigrams)}


def discounts(bigrams: Counter) -> tuple[float, float, float]:
    n = Counter(c for c in bigrams.values() if c <= 4)
    n1, n2, n3, n4 = (n[i] for i in (1, 2, 3, 4))
    y = n1 / (n1 + 2 * n2)
    return 1 - 2 * y * n2 / n1, 2 - 3 * y * n3 / n2, 3 - 4 * y * n4 / n3


def build(bigrams: Counter, lp_uni: dict[str, float], prune: float, min_count: int) -> tuple[dict, dict, dict]:
    d1, d2, d3 = discounts(bigrams)
    by_prev: dict[str, dict[str, int]] = defaultdict(dict)
    for (v, w), c in bigrams.items():
        by_prev[v][w] = c

    logp: dict[str, dict[str, float]] = {}
    backoff: dict[str, float] = {}
    kept_pairs = 0
    for v in sorted(by_prev):
        succ = by_prev[v]
        cv = sum(succ.values())
        nk = Counter(min(c, 3) for c in succ.values())
        lam = (d1 * nk[1] + d2 * nk[2] + d3 * nk[3]) / cv
        dsc = {1: d1, 2: d2, 3: d3}
        kept: dict[str, float] = {}
        for w in sorted(succ, key=lambda w: (-succ[w], w)):
            c = succ[w]
            if c < min_count:
                continue
            pu = 10 ** lp_uni[w]
            p = max(c - dsc[min(c, 3)], 0) / cv + lam * pu
            lp = math.log10(p)
            if lp - math.log10(lam * pu) >= prune:
                kept[w] = round(lp, 2)
        if not kept:
            continue
        mass = sum(10 ** x for x in kept.values())
        umass = sum(10 ** lp_uni[w] for w in kept)
        beta = (1 - mass) / (1 - umass)
        if beta <= 0:  # rounding pushed mass to >= 1; scale kept pairs down slightly
            raise SystemExit(f"non-positive backoff for {v!r}")
        logp[v] = kept
        backoff[v] = round(math.log10(beta), 2)
        kept_pairs += len(kept)
    return logp, backoff, {"D1": round(d1, 4), "D2": round(d2, 4), "D3plus": round(d3, 4),
                           "prev_contexts": len(logp), "kept_pairs": kept_pairs}


def heldout_eval(logp, backoff, lp_uni, vocab) -> dict:
    """Per-word log10 likelihood on AACText dev (held-out from training) vs the unigram."""
    tot_bi = tot_uni = 0.0
    n = 0
    for line in load_aac("dev"):
        for sent in split_sentences(line):
            prev: str | None = BOS
            for w in tokenize_marked(sent):
                if w is None or w not in vocab:
                    prev = None
                    continue
                u = lp_uni[w]
                if prev is None:
                    b = u
                elif prev in logp and w in logp[prev]:
                    b = logp[prev][w]
                else:
                    b = backoff.get(prev, 0.0) + u
                tot_bi += b
                tot_uni += u
                n += 1
                prev = w
    return {"dev_words": n, "perplexity_unigram": round(10 ** (-tot_uni / n), 1),
            "perplexity_bigram": round(10 ** (-tot_bi / n), 1)}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lexicon", type=Path, default=DATA_DIR / "lexicon" / "en.v1.json")
    ap.add_argument("--out", type=Path, default=DATA_DIR / "lexicon" / "en.bigram.v1.json")
    ap.add_argument("--stats", type=Path, default=EVAL_DIR / "build-stats" / "bigram.json")
    ap.add_argument("--prune", type=float, default=0.2, help="min log10 gain over backoff estimate to keep a pair")
    ap.add_argument("--min-count", type=int, default=1)
    ap.add_argument("--no-turk", action="store_true", help="AACText train only (if the Turk license is in doubt)")
    args = ap.parse_args()

    lp_uni = load_unigram(args.lexicon)
    vocab = set(lp_uni)
    sents, info = training_sentences(not args.no_turk)
    bigrams, cstats = count(sents, vocab)
    logp, backoff, mstats = build(bigrams, lp_uni, args.prune, args.min_count)

    src = "AACText Imagination of Crowds sent_train_aac.txt (Vertanen and Kristensson 2011, CC BY 4.0)"
    if not args.no_turk:
        src += " + Turk dialogues train split, filtered ids (Vertanen 2017, CC BY 4.0)"
    src += (f"; interpolated modified-Kneser-Ney discounts over the lexicon unigram; pruned at {args.prune} log10; "
            "test and dev splits held out")
    out = {"v": 1, "lang": "en", "source": src, "license": "CC-BY-SA-4.0", "bos": BOS,
           "logp": logp, "backoff": backoff}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    # logp one prev per line; backoff on one line.
    head = json.dumps({k: out[k] for k in ("v", "lang", "source", "license", "bos")}, ensure_ascii=False,
                      separators=(",", ":"))[:-1]
    lines = [json.dumps(v, ensure_ascii=False) + ":" + json.dumps(logp[v], ensure_ascii=False, separators=(",", ":"))
             for v in logp]
    text = (head + ',"logp":{\n' + ",\n".join(lines) + '\n},"backoff":'
            + json.dumps(backoff, ensure_ascii=False, separators=(",", ":")) + "}\n")
    args.out.write_text(text, encoding="utf-8")

    data = args.out.read_bytes()
    stats = {**info, **cstats, **mstats, "prune": args.prune, "min_count": args.min_count,
             "raw_bytes": len(data), "gzip9_bytes": len(gzip.compress(data, 9, mtime=0))}
    try:
        import brotli

        stats["brotli11_bytes"] = len(brotli.compress(data, quality=11))
    except ImportError:
        pass
    stats.update(heldout_eval(logp, backoff, lp_uni, vocab))
    args.stats.parent.mkdir(parents=True, exist_ok=True)
    args.stats.write_text(json.dumps(stats, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Tests for build_lexicon.py: word-class filters (eval-harness Req 5.8, ADR-data-002) and the
compact v2 file (eval-harness Req 5.9, ADR-data-003).
Run: .venv/bin/python -m unittest discover -s scripts -p 'test_*.py'"""

import hashlib
import json
import random
import sys
import tempfile
import unittest
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_lexicon import Filters, apply_filters, compact_lexicon, js_code_order, write_compact, write_compact_from  # noqa: E402
from ninth_common import DATA_DIR, encode_word  # noqa: E402

V1 = DATA_DIR / "lexicon" / "en.v1.json"
V2 = DATA_DIR / "lexicon" / "en.v2.json"


def expand_v2(lex2: dict) -> dict:
    """v2 back to v1 codes, the way core's loader reads it: encode each word, keep file order."""
    codes: dict[str, list] = defaultdict(list)
    for zx10, words in lex2["words"]:
        for w in words.split(" "):
            codes[encode_word(w)].append([w, zx10])
    return dict(codes)


def random_v1(rng: random.Random) -> dict:
    letters = "abcdefghijklmnopqrstuvwxyz'"
    words = {"".join(rng.choice(letters[:-1]) + "".join(rng.choice(letters) for _ in range(rng.randint(0, 5))))
             for _ in range(rng.randint(1, 60))}
    groups: dict[str, list] = defaultdict(list)
    for w in words:
        groups[encode_word(w)].append((w, rng.randint(20, 80)))
    codes = {c: [[w, z] for w, z in sorted(v, key=lambda t: (-t[1], t[0]))] for c, v in sorted(groups.items())}
    if rng.random() < 0.5:  # codes past 2^32 - 2 are plain string keys in JavaScript
        codes["99999999999"] = [["zzzzzzzzzzz", 20]]
        codes["4294967296"] = [["gawgwmpawm", 20]]
    return {"v": 1, "lang": "en", "source": "test", "license": "CC-BY-SA-4.0", "codes": codes}

SCOWL = {"water": {"lower"}, "bbc": {"caps"}, "tv": {"caps", "title"}, "london": {"title"}, "h": {"lower"}}


class FilterTest(unittest.TestCase):
    def test_off_by_default(self):
        z = {"bbc": 4.0, "lol": 4.0}
        apply_filters(z, Filters(), 2.0, {}, SCOWL)
        self.assertEqual(z, {"bbc": 4.0, "lol": 4.0})

    def test_down_weights_acronyms_and_junk_only(self):
        z = {"water": 5.0, "bbc": 4.0, "tv": 4.5, "london": 4.0, "lol": 4.2, "xq": 2.3, "h": 5.1}
        stats: dict = {}
        apply_filters(z, Filters("down", "down", 1.0), 2.0, stats, SCOWL)
        self.assertEqual(z, {"water": 5.0, "bbc": 3.0, "tv": 4.5, "london": 4.0, "lol": 3.2, "xq": 2.0, "h": 5.1})
        self.assertEqual(stats["filters"]["acronyms_affected"], 1)
        self.assertEqual(stats["filters"]["junk_affected"], 2)

    def test_drop_removes(self):
        z = {"water": 5.0, "bbc": 4.0, "lol": 4.2}
        apply_filters(z, Filters("drop", "drop"), 2.0, {}, SCOWL)
        self.assertEqual(z, {"water": 5.0})

    def test_req_5_8_down_never_removes_a_word_and_only_lowers_by_at_most_down_zipf(self):
        # Property: for random vocabularies and SCOWL tables, "down" keeps every word, never raises
        # a score, lowers by at most down_zipf, never goes below min_zipf, and leaves one-letter
        # words, dictionary words and names exactly as they were.
        rng = random.Random(42)
        shapes = [set(), {"lower"}, {"caps"}, {"title"}, {"caps", "title"}, {"lower", "caps"}]
        for _ in range(500):
            words = {"".join(rng.choice("abcdefghijklmnopqrstuvwxyz'") for _ in range(rng.randint(1, 6))).strip("'") or "a"
                     for _ in range(rng.randint(1, 30))}
            before = {w: round(rng.uniform(2.0, 7.5), 2) for w in words}
            scowl = {w: rng.choice(shapes) for w in words if rng.random() < 0.7}
            scowl = {w: s for w, s in scowl.items() if s}
            down = rng.choice([0.5, 1.0, 2.0])
            after = dict(before)
            apply_filters(after, Filters("down", "down", down), 2.0, {}, scowl)
            self.assertEqual(set(after), set(before))
            for w in before:
                self.assertLessEqual(after[w], before[w])
                self.assertGreaterEqual(after[w], min(before[w], 2.0))
                self.assertGreaterEqual(after[w], before[w] - down - 1e-9)
                s = scowl.get(w, set())
                if len(w.replace("'", "")) == 1 or "lower" in s or (s and s != {"caps"}):
                    self.assertEqual(after[w], before[w], w)


class CompactTest(unittest.TestCase):
    """eval-harness Req 5.9: en.v2.json is a deterministic, lossless re-encoding of en.v1.json."""

    def test_req_5_9_js_code_order(self):
        codes = {"22": 0, "3": 0, "4294967294": 0, "99999999999": 0, "4294967295": 0, "222": 0}
        self.assertEqual(js_code_order(codes), ["3", "22", "222", "4294967294", "99999999999", "4294967295"])

    def test_req_5_9_compact_is_lossless_and_deterministic(self):
        # Property: for random v1 dicts, v2 holds the same (word, zipfX10) pairs, every code's list
        # comes back in the same order, groups are strictly descending, and two writes are identical.
        rng = random.Random(9)
        for _ in range(300):
            v1 = random_v1(rng)
            v2 = compact_lexicon(v1, "0" * 64)
            self.assertEqual(expand_v2(v2), {c: v1["codes"][c] for c in v1["codes"]})
            zs = [z for z, _ in v2["words"]]
            self.assertEqual(zs, sorted(set(zs), reverse=True))
            self.assertEqual(compact_lexicon(v1, "0" * 64), v2)
        with tempfile.TemporaryDirectory() as d:
            a, b = Path(d) / "a.json", Path(d) / "b.json"
            write_compact(a, v2)
            write_compact(b, compact_lexicon(v1, "0" * 64))
            self.assertEqual(a.read_bytes(), b.read_bytes())
            self.assertEqual(json.loads(a.read_text(encoding="utf-8")), v2)

    @unittest.skipUnless(V1.exists() and V2.exists(), "data/lexicon files not built")
    def test_req_5_9_shipped_v2_matches_shipped_v1(self):
        # The committed en.v2.json is exactly what build_lexicon.py derives from the committed en.v1.json.
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "en.v2.json"
            write_compact_from(V1, out)
            self.assertEqual(out.read_bytes(), V2.read_bytes(), "run build_lexicon.py --compact-only")
        lex2 = json.loads(V2.read_text(encoding="utf-8"))
        self.assertEqual(lex2["derived_from"]["sha256"], hashlib.sha256(V1.read_bytes()).hexdigest())
        self.assertEqual(lex2["license"], "CC-BY-SA-4.0")


if __name__ == "__main__":
    unittest.main()

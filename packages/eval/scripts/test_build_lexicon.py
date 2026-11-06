"""Tests for the word-class filters in build_lexicon.py (eval-harness Req 5.8, ADR-data-002).
Run: .venv/bin/python -m unittest discover -s scripts -p 'test_*.py'"""

import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_lexicon import Filters, apply_filters  # noqa: E402

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


if __name__ == "__main__":
    unittest.main()

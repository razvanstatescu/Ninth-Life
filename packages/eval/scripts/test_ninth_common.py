"""Unit tests for the build helpers. Run: .venv/bin/python -m unittest discover -s scripts -p 'test_*.py'"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ninth_common import (  # noqa: E402
    encode_word,
    looks_like_acronym,
    normalize,
    scowl_shape,
    split_sentences,
    tokenize,
    tokenize_marked,
    word_class,
)


class CommonTest(unittest.TestCase):
    def test_encode_matches_contract_examples(self):
        self.assertEqual(encode_word("isn't"), "4768")
        self.assertEqual(encode_word("isn’t"), "4768")
        self.assertEqual(encode_word("good"), "4663")
        self.assertEqual(encode_word("Café"), "2233")
        self.assertIsNone(encode_word("4ever"))
        self.assertIsNone(encode_word("'"))

    def test_normalize(self):
        self.assertEqual(normalize("ȘTIȚI"), "stiti")
        self.assertEqual(normalize("Don’t"), "don't")
        self.assertEqual(normalize(normalize("Naïve")), normalize("Naïve"))

    def test_tokenize(self):
        self.assertEqual(tokenize("I'm fine, thanks!"), (["i'm", "fine", "thanks"], True))
        self.assertEqual(tokenize("a t-shirt"), (["a", "t", "shirt"], True))
        self.assertEqual(tokenize("'Cause it's late."), (["cause", "it's", "late"], True))
        words, clean = tokenize("around 15 minutes")
        self.assertFalse(clean)
        self.assertEqual(words, ["around", "minutes"])
        self.assertEqual(tokenize_marked("at 5 pm"), ["at", None, "pm"])

    def test_split_sentences(self):
        self.assertEqual(split_sentences("Hi. How are you?  Fine!"), ["Hi.", "How are you?", "Fine!"])

    def test_scowl_shape_and_class(self):
        self.assertEqual(scowl_shape("water"), "lower")
        self.assertEqual(scowl_shape("BBC"), "caps")
        self.assertEqual(scowl_shape("TV's"), "caps")
        self.assertEqual(scowl_shape("London"), "title")
        self.assertEqual(scowl_shape("iPhone"), "title")
        scowl = {"water": {"lower"}, "bbc": {"caps"}, "tv": {"caps", "title"}, "london": {"title"}}
        self.assertEqual(word_class("water", scowl), "dict")
        self.assertEqual(word_class("bbc", scowl), "acronym")
        self.assertEqual(word_class("tv", scowl), "proper")
        self.assertEqual(word_class("london", scowl), "proper")
        self.assertEqual(word_class("lol", scowl), "none")

    def test_looks_like_acronym(self):
        self.assertTrue(looks_like_acronym("bbc"))
        self.assertTrue(looks_like_acronym("nfl"))
        self.assertFalse(looks_like_acronym("my"))
        self.assertFalse(looks_like_acronym("b"))
        self.assertFalse(looks_like_acronym("water"))


if __name__ == "__main__":
    unittest.main()

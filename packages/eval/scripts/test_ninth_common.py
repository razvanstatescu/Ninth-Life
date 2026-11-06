"""Unit tests for the build helpers. Run: .venv/bin/python -m unittest discover -s scripts -p 'test_*.py'"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ninth_common import encode_word, normalize, split_sentences, tokenize, tokenize_marked  # noqa: E402


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


if __name__ == "__main__":
    unittest.main()

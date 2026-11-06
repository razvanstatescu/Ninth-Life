"""Shared helpers for the Ninth Life data build scripts.

These mirror the `@ninth/core` contract (docs/architecture/contracts.md section 1):
normalize() is NFKD + strip combining marks + lowercase + fold curly apostrophes, and
encode_word() maps a-z to keypad digits 2-9, skipping apostrophes.
"""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from pathlib import Path

EVAL_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = EVAL_DIR.parent.parent
CACHE_DIR = EVAL_DIR / ".cache"
DATA_DIR = REPO_ROOT / "data"

KEY_LETTERS = {
    "2": "abc",
    "3": "def",
    "4": "ghi",
    "5": "jkl",
    "6": "mno",
    "7": "pqrs",
    "8": "tuv",
    "9": "wxyz",
}
KEYMAP = {ch: d for d, letters in KEY_LETTERS.items() for ch in letters}

# U+2018 U+2019 U+02BC per the contract; U+00B4 and U+0060 per ADR-core-001. Folded before NFKD
# (which would turn U+00B4 into a space plus a combining accent) and again after it.
_APOSTROPHES = re.compile("[‘’ʼ´`]")
# A lexicon word: letters, optionally joined by single internal apostrophes.
WORD_RE = re.compile(r"[a-z]+(?:'[a-z]+)*")
WORD_FULL_RE = re.compile(r"^[a-z]+(?:'[a-z]+)*$")


def normalize(text: str) -> str:
    text = _APOSTROPHES.sub("'", text)
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.category(ch).startswith("M"))
    return _APOSTROPHES.sub("'", text.lower())


def encode_word(word: str) -> str | None:
    out = []
    for ch in normalize(word):
        if ch == "'":
            continue
        d = KEYMAP.get(ch)
        if d is None:
            return None
        out.append(d)
    return "".join(out) or None


# Characters that separate words inside a whitespace token ("t-shirt", "and/or").
_SPLIT_RE = re.compile(r"[-‐-―/_]+")
# Punctuation that may wrap a word and is dropped.
_EDGE_PUNCT = "\"'.,!?;:()[]{}<>*~`“”…"


def tokenize(text: str) -> tuple[list[str], bool]:
    """Split a sentence into lexicon-style words.

    Returns (words, clean). `clean` is False when some token could not be typed with
    letter keys (digits, symbols, non-Latin letters), so callers can drop the sentence
    rather than silently change what the person "said".
    """
    words: list[str] = []
    clean = True
    for raw in normalize(text).split():
        for part in _SPLIT_RE.split(raw):
            part = part.strip(_EDGE_PUNCT)
            if not part:
                continue
            if WORD_FULL_RE.match(part):
                words.append(part)
            else:
                clean = False
    return words, clean


_SENT_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")


def split_sentences(text: str) -> list[str]:
    return [s for s in _SENT_SPLIT_RE.split(text.strip()) if s]


def tokenize_marked(text: str) -> list[str | None]:
    """Like tokenize() but keeps a None where an untypable token was, so n-gram
    training can break the chain there instead of inventing a bigram across it."""
    out: list[str | None] = []
    for raw in normalize(text).split():
        for part in _SPLIT_RE.split(raw):
            part = part.strip(_EDGE_PUNCT)
            if not part:
                continue
            out.append(part if WORD_FULL_RE.match(part) else None)
    return out


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def read_lines(path: Path) -> list[str]:
    with open(path, encoding="utf-8") as f:
        return [ln.rstrip("\n").rstrip("\r") for ln in f]


_TURK_ID_RE = re.compile(r"^(chain\d+_[\d_]+)")


def load_turk(cache: Path = CACHE_DIR) -> list[dict]:
    """Turk dialogues that survived the offensive-content filter, with their split.

    turk-dialogues.txt is cleanly tab-separated (set, id, turn1..turn6). The filtered
    file has the same ids but its column delimiters are inconsistent (tabs sometimes
    replaced by runs of spaces, some records wrapped over lines), so turn boundaries
    cannot be recovered from it reliably. We therefore take the *set of ids* from the
    filtered file and the turn text and split label from the original file.
    Sorted by id for determinism.
    """
    keep = set()
    for ln in read_lines(cache / "turk" / "turk-dialogues-filtered.txt"):
        m = _TURK_ID_RE.match(ln)
        if m:
            keep.add(m.group(1))
    orig = read_lines(cache / "turk" / "turk-dialogues.txt")
    header = orig[0].split("\t")
    assert header[:2] == ["set", "id"], header
    out = []
    for ln in orig[1:]:
        if not ln.strip():
            continue
        cols = ln.split("\t")
        assert len(cols) == 8, (len(cols), ln[:80])
        if cols[1] not in keep:
            continue
        out.append({"id": cols[1], "split": cols[0], "turns": [t.strip() for t in cols[2:]]})
    out.sort(key=lambda d: d["id"])
    return out


def load_aac(split: str, cache: Path = CACHE_DIR) -> list[str]:
    path = cache / "imagine" / f"sent_{split}_aac.txt"
    return [ln.strip() for ln in read_lines(path) if ln.strip()]


def write_json(path: Path, obj, one_key_per_line: str | None = None) -> None:
    """Deterministic compact JSON. If one_key_per_line names a dict field, each of its
    entries goes on its own line (diff-friendly) at negligible size cost."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if one_key_per_line is None:
        text = json.dumps(obj, ensure_ascii=False, separators=(",", ":"), sort_keys=False)
    else:
        inner = obj[one_key_per_line]
        head = {k: v for k, v in obj.items() if k != one_key_per_line}
        head_txt = json.dumps(head, ensure_ascii=False, separators=(",", ":"))[:-1]
        lines = [
            json.dumps(k, ensure_ascii=False) + ":" + json.dumps(v, ensure_ascii=False, separators=(",", ":"))
            for k, v in inner.items()
        ]
        text = head_txt + "," + json.dumps(one_key_per_line) + ":{\n" + ",\n".join(lines) + "\n}}"
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text + "\n")


# --- SCOWL word-class signal (ADR-data-002) ------------------------------------------------
# SCOWL file names: <spelling>-<category>.<size>, e.g. american-words.95, english-upper.50.
_SCOWL_NAME_RE = re.compile(r"^([a-z_0-9]+)-(words|upper|abbreviations|contractions|proper-names)\.(\d+)$")
_VOWELS = set("aeiouy")


def scowl_shape(form: str) -> str:
    """'lower' (all lower case), 'caps' (two or more letters, all upper case: BBC, TV) or 'title'
    (anything else with a capital: London, iPhone). A trailing possessive 's is ignored."""
    base = form[:-2] if form.endswith(("'s", "’s")) else form
    letters = [c for c in base if c.isalpha()]
    if all(c.islower() for c in letters):
        return "lower"
    if len(letters) >= 2 and all(c.isupper() for c in letters):
        return "caps"
    return "title"


def load_scowl(final_dir: Path, max_level: int = 95) -> dict[str, set[str]]:
    """Normalized word -> set of shapes it has in SCOWL lists of size <= max_level (all spellings
    and categories). SCOWL files are ISO-8859-1. Sorted file order keeps this deterministic."""
    if not final_dir.is_dir():
        raise SystemExit(f"SCOWL word lists not found at {final_dir}; run `pnpm data:fetch` first")
    shapes: dict[str, set[str]] = {}
    for f in sorted(final_dir.iterdir()):
        m = _SCOWL_NAME_RE.match(f.name)
        if not m or int(m.group(3)) > max_level:
            continue
        for line in f.read_text(encoding="latin-1").splitlines():
            form = line.strip()
            if not form:
                continue
            shapes.setdefault(normalize(form), set()).add(scowl_shape(form))
    return shapes


def word_class(word: str, scowl: dict[str, set[str]]) -> str:
    """'dict' (a lower-case SCOWL word or contraction), 'acronym' (in SCOWL only in ALL CAPS),
    'proper' (in SCOWL only with a capital: names, places, brands) or 'none' (not in SCOWL)."""
    s = scowl.get(word)
    if not s:
        return "none"
    if "lower" in s:
        return "dict"
    return "acronym" if s == {"caps"} else "proper"


def looks_like_acronym(word: str) -> bool:
    """SCOWL-free heuristic: 2-5 letters and no vowel (a e i o u y), e.g. bbc, nfl, pcs."""
    letters = word.replace("'", "")
    return 2 <= len(letters) <= 5 and not (set(letters) & _VOWELS)

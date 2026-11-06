#!/usr/bin/env python3
"""Download the evaluation and bigram-training corpora into packages/eval/.cache/.

Only the files listed in FILES are fetched, each pinned by SHA-256. The AACText zip is
NOT downloaded because it bundles lm_test_switch.txt and lm_test_comm.txt, which are
not under CC BY 4.0 (see aactext.org/imagine). Those two names are also refused here.

Usage:  python packages/eval/scripts/fetch_datasets.py [--force]
"""

from __future__ import annotations

import argparse
import json
import ssl
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ninth_common import CACHE_DIR, sha256_file  # noqa: E402

# (cache path, url, sha256, license)
FILES = [
    ("imagine/readme.txt", "https://www.aactext.org/imagine/aac_comm/readme.txt",
     "556d1e4e136cf2f6b16296880df86301c260b669ea2eb4566ca164cdadc0f850", "CC-BY-4.0"),
    ("imagine/sent_train_aac.txt", "https://www.aactext.org/imagine/aac_comm/sent_train_aac.txt",
     "ddc0ad61652cec5f4a8b76f1dd63f92fa9d5c1197e0a65f7a13d71873aed91bd", "CC-BY-4.0"),
    ("imagine/sent_dev_aac.txt", "https://www.aactext.org/imagine/aac_comm/sent_dev_aac.txt",
     "ea15844416675800787f13767b3ab94d982a656094ee1865692af7947e8ad524", "CC-BY-4.0"),
    ("imagine/sent_test_aac.txt", "https://www.aactext.org/imagine/aac_comm/sent_test_aac.txt",
     "e42988d0a8345bc05499ea49cd79a0bb2518f9670cf6431e51ad58e08114091b", "CC-BY-4.0"),
    ("turk/readme.txt", "https://www.aactext.org/turk/turk/readme.txt",
     "3527c76f61d7d73a598d994274cc23e712c0ed7400a63e100ff357fd6c98770a", "CC-BY-4.0 (web page; readme says CC-BY-ND-3.0)"),
    ("turk/turk-dialogues.txt", "https://www.aactext.org/turk/turk/turk-dialogues.txt",
     "7bd80a8a8fe1e3ee91158072b4adc198db691f96196b27acf28ea8335507dafb", "CC-BY-4.0 (web page; readme says CC-BY-ND-3.0)"),
    ("turk/turk-dialogues-filtered.txt", "https://www.aactext.org/turk/turk/turk-dialogues-filtered.txt",
     "b820e18842b2155dfddd6e857e8211525fbbd62c751800551759c868d21416db", "CC-BY-4.0 (web page; readme says CC-BY-ND-3.0)"),
]

EXCLUDED = {"lm_test_switch.txt", "lm_test_comm.txt"}


def download(url: str, dest: Path) -> None:
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={"User-Agent": "ninth-life-eval/0.1"})
    with urllib.request.urlopen(req, context=ctx, timeout=60) as r:
        data = r.read()
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    tmp.write_bytes(data)
    tmp.replace(dest)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-download even if cached")
    args = ap.parse_args()

    manifest = []
    for rel, url, sha, lic in FILES:
        if Path(rel).name in EXCLUDED:
            raise SystemExit(f"refusing excluded file {rel}")
        dest = CACHE_DIR / rel
        if args.force or not dest.exists() or sha256_file(dest) != sha:
            print(f"fetch {url}")
            download(url, dest)
        got = sha256_file(dest)
        if got != sha:
            raise SystemExit(f"SHA-256 mismatch for {rel}: expected {sha}, got {got}. Upstream changed; "
                             "inspect the new file and update the pin deliberately.")
        manifest.append({"path": rel, "url": url, "sha256": sha, "license": lic, "bytes": dest.stat().st_size})
        print(f"ok    {rel}  {dest.stat().st_size} B")

    (CACHE_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())

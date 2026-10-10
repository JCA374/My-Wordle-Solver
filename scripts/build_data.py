"""Build the JSON data files served by the web app.

Reads the raw lists in data/ and writes docs/data/words.json and
docs/data/past_answers.json. Uses only the standard library.

    python scripts/build_data.py
    python scripts/build_data.py --refresh-past-answers   # re-scrape past answers first
"""

import argparse
import json
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "docs" / "data"

PAST_ANSWERS_URL = "https://www.rockpapershotgun.com/wordle-past-answers"

# Words in the source list that Wordle does not accept as guesses.
REJECTED = {"AERIO", "AEROS"}


def read_words():
    words = {line.strip().upper() for line in (DATA / "words.txt").read_text().splitlines()}
    return sorted(w for w in words if len(w) == 5 and w.isalpha() and w not in REJECTED)


def read_frequencies():
    freq = {}
    for line in (DATA / "frequency.tsv").read_text().splitlines():
        parts = line.strip().split("\t")
        if len(parts) == 2:
            freq[parts[0].upper()] = int(parts[1])
    return freq


def read_past_answers():
    path = DATA / "past_answers.txt"
    if not path.exists():
        return []
    return sorted({w.strip().upper() for w in path.read_text().splitlines() if w.strip()})


class _PastAnswersParser(HTMLParser):
    """Collects the text of <li> items inside <ul class="inline">."""

    def __init__(self):
        super().__init__()
        self.in_list = False
        self.in_item = False
        self.answers = []

    def handle_starttag(self, tag, attrs):
        if tag == "ul" and "inline" in (dict(attrs).get("class") or "").split():
            self.in_list = True
        elif tag == "li" and self.in_list:
            self.in_item = True

    def handle_endtag(self, tag):
        if tag == "ul":
            self.in_list = False
        elif tag == "li":
            self.in_item = False

    def handle_data(self, data):
        word = data.strip().upper()
        if self.in_item and len(word) == 5 and word.isalpha():
            self.answers.append(word)


def refresh_past_answers():
    request = urllib.request.Request(PAST_ANSWERS_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=15) as response:
        html = response.read().decode("utf-8", errors="replace")
    parser = _PastAnswersParser()
    parser.feed(html)
    if not parser.answers:
        raise RuntimeError("No answers found - the page layout may have changed.")
    merged = sorted(set(read_past_answers()) | set(parser.answers))
    (DATA / "past_answers.txt").write_text("\n".join(merged) + "\n")
    print(f"Past answers: {len(parser.answers)} scraped, {len(merged)} total")


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--refresh-past-answers", action="store_true",
                        help="re-scrape past Wordle answers before building")
    args = parser.parse_args()

    if args.refresh_past_answers:
        refresh_past_answers()

    words = read_words()
    freq = read_frequencies()
    valid = set(words)
    # Most common words first; ties broken alphabetically for stable output.
    entries = sorted(([w, freq.get(w, 0)] for w in words), key=lambda e: (-e[1], e[0]))
    past = [w for w in read_past_answers() if w in valid]

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "words.json").write_text(json.dumps(entries, separators=(",", ":")) + "\n")
    (OUT / "past_answers.json").write_text(json.dumps(past, separators=(",", ":")) + "\n")
    print(f"Wrote {len(entries)} words and {len(past)} past answers to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

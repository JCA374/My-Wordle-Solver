# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

```bash
python3 -m http.server -d docs              # run the site at http://localhost:8000
node --test                                 # solver unit tests (tests/*.test.mjs)
python3 scripts/build_data.py               # rebuild docs/data/*.json from data/
python3 scripts/build_data.py --refresh-past-answers   # also re-scrape past answers
python3 scripts/screenshots.py              # retake docs/img screenshots (needs Playwright)
```

## Architecture

A static site with no build step, served by GitHub Pages from `main` → `/docs`.

- `docs/solver.js`: pure logic with no DOM code, so Node can test it.
  - `score(guess, answer)` returns Wordle feedback as a 5-char pattern (`g`/`y`/`b`) and handles duplicate letters.
  - `filterCandidates(words, guesses)` keeps the words where `score(g.word, w) === g.pattern` for every guess. This is the only filter: don't add per-position constraint dicts, which is the bug the old Streamlit app had.
  - `bestSplitters(guessWords, targets)` scores every valid guess against the top 20 likely answers and ranks guesses by how evenly they split them. It uses the integer `patternId` fast path, which must stay in sync with `score` (a test checks this). `app.js` caches the result per set of targets.
  - `bestPairs(words, weights, excludeLetters)` returns two-word pairs with 10 distinct letters (the "Best start" / "Test new letters" panel). It pairs the 40 strongest distinct first words with their best partner, and ties go to the more common words. `app.js` draws pairs from the 5000 most common words and weights letters by how many of the top 3000 candidates (minus past answers) contain them. It falls back to `bestExploreWords` when no pair fits.
  - Ranking helpers: `topByFrequency`, `bestExploreWords` (5 distinct untried letters with no overlap between picks), `letterFrequency`, `letterStatuses`.
- `docs/app.js`: UI and state. The "How it works" tab is the `#how` article in `index.html`, shown when the hash is `#how`. It walks through one example game (the answer is BUDDY; guesses DEALS and MUDDY). Its tiles, counts and bars were computed with the real solver, so update them when the logic or the data changes. The "Load this example" button uses `data-example` and `data-answer`.
- `docs/img/*.png` are app screenshots (light and dark) used on that tab. Regenerate them after UI changes with `python3 scripts/screenshots.py` (needs Playwright).
  - State is `{ guesses: [{word, pattern}], input, pattern, excludePast }`, kept in `localStorage`.
  - `update()` saves the state and re-renders everything; rendering is cheap enough to redo in full.
- `docs/data/words.json` is `[[WORD, frequency], ...]`, most common first. `past_answers.json` is `[WORD, ...]`. Both are generated, so edit `data/` and rerun the build script instead of editing them by hand.
- Keep every path in the site relative: it is served under `/My-Wordle-Solver/`.

The old Python/Streamlit app and the notebooks were removed. Git history has them.

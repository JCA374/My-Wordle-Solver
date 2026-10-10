# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

```bash
python3 -m http.server -d docs              # run the site at http://localhost:8000
node --test                                 # solver unit tests (tests/*.test.mjs)
python3 scripts/build_data.py               # rebuild docs/data/*.json from data/
python3 scripts/build_data.py --refresh-past-answers   # also re-scrape past answers
```

## Architecture

A static site with no build step, served by GitHub Pages from `main` → `/docs`.

- `docs/solver.js`: pure logic with no DOM code, so Node can test it.
  - `score(guess, answer)` returns Wordle feedback as a 5-char pattern (`g`/`y`/`b`) and handles duplicate letters.
  - `filterCandidates(words, guesses)` keeps the words where `score(g.word, w) === g.pattern` for every guess. This is the only filter: don't add per-position constraint dicts, which is the bug the old Streamlit app had.
  - `bestSplitters(guessWords, targets)` scores every valid guess against the top 20 likely answers and ranks guesses by how evenly they split them. It uses the integer `patternId` fast path, which must stay in sync with `score` (a test checks this). `app.js` caches the result per set of targets.
  - Ranking helpers: `topByFrequency`, `bestExploreWords` (5 distinct untried letters with no overlap between picks), `letterFrequency`, `letterStatuses`.
- `docs/app.js`: UI and state.
  - State is `{ guesses: [{word, pattern}], input, pattern, excludePast }`, kept in `localStorage`.
  - `update()` saves the state and re-renders everything; rendering is cheap enough to redo in full.
- `docs/data/words.json` is `[[WORD, frequency], ...]`, most common first. `past_answers.json` is `[WORD, ...]`. Both are generated, so edit `data/` and rerun the build script instead of editing them by hand.
- Keep every path in the site relative: it is served under `/My-Wordle-Solver/`.

The old Python/Streamlit app and the notebooks were removed. Git history has them.

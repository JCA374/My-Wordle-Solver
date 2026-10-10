# My Wordle Solver 🎯

A small, fast Wordle helper that runs entirely in your browser.

**▶ Live: https://jca374.github.io/My-Wordle-Solver/**

## How to use

1. Type the word you guessed in Wordle (physical or on-screen keyboard).
2. Tap each tile until it matches Wordle's colours: gray → yellow → green.
   Number keys <kbd>1</kbd>–<kbd>5</kbd> also cycle the tiles.
3. Press <kbd>Enter</kbd>. The board, keyboard and suggestions update.
4. Tap any suggested word to use it as your next guess. **Undo** removes the last row and **Reset** starts over.

Your game is saved in the browser, so a reload won't lose it.

### What you get

- **Possible answers**: how many words still fit every clue.
- **Narrow it down**: when many lookalikes remain (BUDDY, MUDDY, CUDDY, …), this ignores what you already know and suggests the guess that best tells apart the 20 most likely answers, even if it can't be the answer itself.
- **Likely answers**: the remaining words, most common English words first.
- **Explore new letters**: words made of five letters you haven't tried yet, so you learn the most from one guess. Before your first guess this shows the best starting words.
- **Most common letters** among the remaining words.
- **Exclude past Wordle answers**: optionally hide words that have already been answers.

The filter uses exact Wordle scoring, so repeated letters are handled correctly. For example, if one E is yellow and the other is gray, the answer has exactly one E.

## Project layout

```
docs/                 the website (served by GitHub Pages)
  index.html, style.css, app.js
  solver.js           pure solver logic (scoring, filtering, ranking)
  data/*.json         generated word data
data/                 raw sources: word list, word frequencies, past answers
scripts/build_data.py turns data/ into docs/data/*.json
tests/                Node tests for solver.js
```

## Development

No build step and no dependencies.

```bash
# Run locally, then open http://localhost:8000
python3 -m http.server -d docs

# Run the tests (Node 20+)
node --test

# Regenerate docs/data/*.json after editing data/
python3 scripts/build_data.py

# Also fetch the latest past answers from rockpapershotgun.com
python3 scripts/build_data.py --refresh-past-answers
```

## Deploying

GitHub Pages serves the `docs/` folder on `main` (Settings → Pages → *Deploy from a branch* → `main` / `/docs`). Pushing to `main` publishes the site.

## Credits

Word list: https://gist.github.com/dracos/dd0668f281e685bad51479e5acaadb93 ·
Past answers: rockpapershotgun.com.
Built as a hobby project with AI assistance.

# My Wordle Solver 🎯

A small, fast Wordle helper that runs entirely in your browser.

**▶ Live: https://jca374.github.io/My-Wordle-Solver/**

## How to use

1. Pick a **Best start** pair and guess one of its words, or type your own. The on-screen keyboard only appears on touch devices.
2. Click each tile until it matches Wordle's colours: gray → yellow → green.
   Number keys <kbd>1</kbd>–<kbd>5</kbd> also cycle the tiles.
3. Press <kbd>Enter</kbd> or the **Enter** button.
4. Made a mistake? Click a tile in any row you already entered to change its colour. **Undo** removes the last row and **Reset** starts over.

Your game is saved in the browser, so a reload won't lose it.

The layout is made to sit in half a laptop screen next to Wordle (it fits about 640×720 and up) with no page scrolling.

### What you get

- **Possible answers**: how many words still fit every clue.
- **Best start**: two common words with no shared letters that together test the 10 most common letters (e.g. DEALS + INTRO). Guess one and the other is suggested next.
- **Test new letters**: after a guess, the guesses that rule out the most of the 20 likely answers. This helps when many lookalikes remain (BUDDY, MUDDY, CUDDY, …).
- **Likely answers**: the remaining words, most common English words first.
- **Common letters left** among the remaining words.
- **Hide past**: optionally hide words that have already been answers.

The **How it works** tab explains the logic in plain words and credits the word lists.

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

- Allowed words: [Wordle's valid word list](https://gist.github.com/dracos/dd0668f281e685bad51479e5acaadb93), collected by dracos.
- Word frequencies: Peter Norvig's [word counts](https://norvig.com/ngrams/) from the Google Web Trillion Word Corpus.
- Past answers: [Rock Paper Shotgun](https://www.rockpapershotgun.com/wordle-past-answers).

Built as a hobby project with AI assistance.

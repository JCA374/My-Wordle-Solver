# My Wordle Solver 🎯

A small, fast Wordle helper that runs entirely in your browser.

**▶ Live: https://jca374.github.io/My-Wordle-Solver/**

## How to use

1. Type the word you guessed in Wordle. The on-screen keyboard only appears on touch devices.
2. Tap each tile until it matches Wordle's colours: gray → yellow → green.
   Number keys <kbd>1</kbd>–<kbd>5</kbd> also cycle the tiles.
3. Press <kbd>Enter</kbd>. The board, keyboard and suggestions update.
4. Tap any suggested word to use it as your next guess. **Undo** removes the last row and **Reset** starts over.

Your game is saved in the browser, so a reload won't lose it.

The layout is made to sit in half a laptop screen next to Wordle (it fits about 640×720 and up) with no page scrolling.

### What you get

- **Possible answers**: how many words still fit every clue.
- **Narrow it down**: when many lookalikes remain (BUDDY, MUDDY, CUDDY, …), this ignores what you already know and suggests the guess that best tells apart the 20 most likely answers, even if it can't be the answer itself.
- **Likely answers**: the remaining words, most common English words first.
- **Best start / Test new letters**: two common words with no shared letters that together test the 10 most useful letters (S E A R I O L T N D at the start, e.g. DEALS + INTRO). After a guess, it uses only letters you haven't tried yet.
- **Common letters left** among the remaining words.
- **Hide past**: optionally hide words that have already been answers.

The **How it works** tab walks through an example game with screenshots and pictures, and credits the word lists.

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

# Retake the screenshots on the How it works tab (needs Playwright)
python3 scripts/screenshots.py
```

## Deploying

GitHub Pages serves the `docs/` folder on `main` (Settings → Pages → *Deploy from a branch* → `main` / `/docs`). Pushing to `main` publishes the site.

## Credits

- Allowed words: [Wordle's valid word list](https://gist.github.com/dracos/dd0668f281e685bad51479e5acaadb93), collected by dracos.
- Word frequencies: Peter Norvig's [word counts](https://norvig.com/ngrams/) from the Google Web Trillion Word Corpus.
- Past answers: [Rock Paper Shotgun](https://www.rockpapershotgun.com/wordle-past-answers).

Built as a hobby project with AI assistance.

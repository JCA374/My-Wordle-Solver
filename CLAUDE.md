# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

```bash
# Install dependencies
pip install -r requirements.txt

# Run the Streamlit app (opens at http://localhost:8501)
streamlit run app.py

# Check Python syntax
python -m py_compile app.py
```

## Architecture Overview

This is a **single-file Streamlit application** (`app.py`) with no testing framework or build process. The original Tkinter version exists in `Wordel Build 4.ipynb` but is not actively maintained.

### Session State Management

The app relies heavily on Streamlit's `st.session_state` to persist data across user interactions:

- `locked_positions` - Dict mapping position (1-5) to correct letters
- `excluded_positions` - Dict mapping position (1-5) to letters that are in word but wrong position
- `excluded_letters` - List of letters not in the word
- `guessed_words` - List tracking all words the user has guessed (for history)
- `current_word` - The current word being evaluated
- `letter_states` - Dict tracking visual state of each letter button (locked/excluded/wrong_place)
- `word_list` - Current filtered word list (~12k words)
- `word_frequency_dict` - Letter frequency data loaded from file

**Important**: When a user enters a new word, `letter_states` must be reset to avoid showing incorrect visual indicators from the previous word. Constraints in `locked_positions`, `excluded_positions`, and `excluded_letters` persist until reset.

### Constraint Persistence Pattern

Constraints accumulate across multiple guesses:
1. User enters word "AROSE" and marks letters → constraints saved
2. User enters word "THINK" → previous constraints from "AROSE" remain active
3. Recommendations filter using ALL accumulated constraints
4. Reset button clears all constraints and history

When clicking any letter button (Correct/Wrong Position/Not in Word), the current word is automatically added to `guessed_words` to track guess history.

### Dual Recommendation System

The app provides two distinct recommendation types:

1. **Top 20 Most Common Words** (frequency-based)
   - Searches `filtered_words` (words matching all constraints)
   - Sorts by English word frequency from `word_frequency_dict`
   - These are actual solution candidates

2. **Best Words with 5 Unique Letters**
   - Searches full `word_list` (NOT filtered by constraints)
   - Excludes letters from ALL guessed words + current word + locked positions
   - Finds words with 5 unique letters that don't share letters with each other
   - Ranked by letter frequency in remaining word list
   - Purpose: Help user test completely new letters for elimination

### Data Files

- `five_letter_words.txt` - Fetched from GitHub Gist on startup, falls back to local cache
- `five_letter_frequency_list.txt` - Tab-separated word frequency data (word \t frequency)
- `OldWords.txt` - Previously used Wordle answers, scraped from rockpapershotgun.com

Files are loaded once on app startup and cached in session state.

### Key Filtering Functions

- `filter_words_based_on_parameters()` - Main filtering function that applies all constraints sequentially:
  1. Locked positions (letters in correct spots)
  2. Excluded positions (letters in word but wrong spot)
  3. Wrong positions must be included in word
  4. Excluded letters removed (unless they're locked or in wrong position)

- `find_best_starting_words(word_list, top_n, exclude_letters)` - Finds words with all unique letters that don't overlap with excluded letters, ranked by letter frequency

## UI State Reset Pattern

When the user types a new word in the text input:
```python
if word_input != st.session_state.current_word:
    st.session_state.letter_states = {i: None for i in range(5)}
```

This ensures letter button indicators (green/yellow/gray) reset for the new word while preserving actual constraints.

## Development Notes

- No linting, testing, or CI/CD configured
- Uses custom CSS via `st.markdown()` for Wordle-style colors (#6aaa64 green, #c9b458 yellow, #787c7e gray)
- All recommendations display with white background cards for readability
- Commits should be pushed to branches starting with `claude/` and ending with session ID

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

### Running the Application
```bash
# Quick start (recommended)
./run.sh  # Linux/Mac
run.bat   # Windows

# Manual start
cd app && python app.py

# Run on specific port
cd app && python -c "from app import app; app.run(port=8080)"
```

### Development Setup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Test core solver module
python3 -c "import sys; sys.path.insert(0, 'app'); from wordle_solver import WordleSolver; s = WordleSolver(); print(f'Loaded {len(s.current_word_list)} words')"
```

### Testing the API
```bash
# Start server in background
cd app && python app.py &

# Test endpoints
curl http://localhost:5000/api/starting-words
curl -X POST http://localhost:5000/api/initialize -H "Content-Type: application/json" -d '{"exclude_old": true}'
```

## Architecture Overview

### Two-Part Application Structure

**Legacy:** Jupyter notebooks in root directory (historical development artifacts):
- `Wordel Build 4.ipynb` - Original Tkinter GUI implementation
- `Starting Words.ipynb`, `Frequency List.ipynb` - Utility notebooks
- These are kept for reference but not actively used

**Current:** Modern Flask web application in `app/` directory:
```
app/
├── app.py              # Flask server (singleton pattern for solver)
├── wordle_solver.py    # Core algorithm (stateful WordleSolver class)
├── templates/          # Jinja2 templates
└── static/             # Frontend assets (vanilla JS, no frameworks)
```

### Critical File Path Architecture

**Data files live in project root**, not in `app/`:
- `five_letter_words.txt` - Complete 5-letter word dictionary (~14,855 words)
- `five_letter_frequency_list.txt` - Tab-separated word frequency data (word\tfrequency)
- `OldWords.txt` - Previous Wordle answers (scraped from Rock Paper Shotgun)

**Path Resolution Pattern:**
```python
import os
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
file_path = os.path.join(base_dir, "five_letter_words.txt")
```

All data loading in `wordle_solver.py` uses this pattern to find files in the parent directory.

### WordleSolver Core Algorithm

The `WordleSolver` class is the heart of the application:

1. **Initialization** (`__init__`):
   - Fetches/loads word lists (with fallback to local files)
   - Builds frequency dictionary
   - Maintains `current_word_list` as working state

2. **Filtering Pipeline** (`filter_words_based_on_parameters`):
   ```
   current_word_list
     → filter_words_by_locked_positions (green tiles)
     → filter_words_by_excluded_positions (yellow tiles - wrong spot)
     → filter_words_by_wrong_positions (yellow tiles - must include letter)
     → exclude_words_with_letters (gray tiles)
     → filtered_words
   ```

3. **Scoring Algorithm** (`get_recommendations`):
   - Letter frequency scoring (normalized by total letters)
   - Repeat letter penalty (configurable multiplier, default 0.5)
   - Returns top N words ranked by combined score

4. **Position Indexing**: All position dicts use **1-based indexing** (position 1-5, not 0-4)
   - Frontend converts to 1-based before sending to API
   - Filter functions expect `{1: 'A', 3: 'O'}` not `{0: 'A', 2: 'O'}`

### Flask API Architecture

**Singleton Pattern**: Single `WordleSolver` instance shared across requests via `get_solver()`

**State Management**: The solver's `current_word_list` is mutable and persists between requests:
- `/api/initialize` resets to full word list
- `/api/solve` does NOT mutate state (filters on-the-fly)
- `/api/reset` calls `remove_old_words()` to reset

**API Contract** (`/api/solve`):
```json
Request: {
  "locked": {"1": "A", "3": "O"},        // Green tiles (position: letter)
  "wrong_position": {"2": "R"},          // Yellow tiles (position: letter)
  "excluded": ["E", "T"],                // Gray tiles (letters not in word)
  "repeat_multiplier": 0.5               // Penalty for repeated letters
}

Response: {
  "success": true,
  "word_count": 245,
  "recommendations": [
    {
      "word": "AROSE",
      "score": 0.1234,
      "frequency": 12345,
      "has_repeats": false
    }
  ],
  "letter_frequency": [{"letter": "A", "frequency": 123}]
}
```

### Frontend State Management

**Tile States** (3-state cycle):
- `empty` → `excluded` (gray) → `wrong-position` (yellow) → `locked` (green) → `excluded`

**No Framework**: Vanilla JavaScript with direct DOM manipulation
- Event delegation on tile clicks
- Fetch API for backend communication
- Toast notifications for user feedback

## Common Development Scenarios

### Adding a New Filter Type
1. Add filter function to `WordleSolver` class in `wordle_solver.py`
2. Integrate into `filter_words_based_on_parameters` pipeline
3. Update API contract in `app.py` `/api/solve` endpoint
4. Add frontend support in `app.js` `getGameState()` function
5. Update tile state logic if needed

### Modifying the Scoring Algorithm
- Edit `compute_letter_scores()` and `get_recommendations()` in `WordleSolver`
- Algorithm uses normalized frequencies (divide by total)
- Repeat penalty applied: `score * multiplier` if word has duplicates

### Changing Data Sources
- Word list: Update URL in `fetch_gist_content()`
- Old words: Update scraping URL in `get_old_words()`
- **Always maintain local file fallback** for offline development

### Debugging Filter Issues
```python
# Test filtering directly
from wordle_solver import WordleSolver
solver = WordleSolver()
result = solver.filter_words_based_on_parameters(
    locked_positions={1: 'A'},
    wrong_positions={2: 'R'},
    excluded_letters=['E', 'T']
)
print(f"Filtered to {len(result)} words")
print(result[:10])  # First 10 results
```

## Important Notes

### Data File Updates
- Word list updates automatically fetch from GitHub Gist on startup
- If fetch fails, falls back to local files (network-independent operation)
- Old words are scraped from Rock Paper Shotgun (may break if site changes)

### Performance Considerations
- Initial load processes ~14,855 words (< 1 second)
- Filtering is O(n) where n = current word list size
- Scoring is O(n * 5) for letter frequency
- No caching between requests (stateless filtering)

### Position vs Index Confusion
- **UI/API**: 1-based positions (1, 2, 3, 4, 5)
- **Python strings**: 0-based indexing internally (`word[position-1]`)
- **Filter functions**: Expect 1-based position dicts from API

### Flask Debug Mode
- Default runs with `debug=True` on port 5000
- Auto-reloads on file changes
- Debugger PIN printed on startup
- **Never deploy with debug=True in production**

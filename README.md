# My-Wordle-Solver 🎯

An intelligent Wordle puzzle solver with a modern web interface. This tool helps you solve Wordle puzzles by suggesting optimal words based on your feedback.

## Features

- 🎨 **Modern Streamlit UI** - Clean, intuitive interface with color-coded feedback
- 🧠 **Smart Recommendations** - Uses letter frequency analysis and scoring algorithms
- 📊 **Real-time Statistics** - See how many possible solutions remain
- 🌟 **Best Starting Words** - Automatically suggests optimal starting words
- 🔄 **Exclude Past Answers** - Option to filter out previously used Wordle words
- ⚙️ **Customizable Settings** - Adjust repeat letter penalties

## Quick Start

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/JCA374/My-Wordle-Solver.git
   cd My-Wordle-Solver
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

### Running the App

**Launch the Streamlit app:**
```bash
streamlit run app.py
```

The app will automatically open in your browser at `http://localhost:8501`

## How to Use

1. **Enter your guess** - Type a 5-letter word (default: "AROSE")
2. **Mark each letter:**
   - 🟩 **Correct** - Letter is in the right position
   - 🟨 **Wrong Position** - Letter is in the word but wrong position
   - ⬛ **Not in Word** - Letter is not in the word at all
3. **View recommendations** - See the top 20 suggested words with scores
4. **Repeat** - Enter your next guess based on the recommendations

## Project Structure

- `app.py` - Main Streamlit application
- `Wordel Build 4.ipynb` - Original Jupyter notebook (Tkinter version)
- `five_letter_words.txt` - Word list (~12,000 words)
- `five_letter_frequency_list.txt` - Letter frequency data
- `OldWords.txt` - Previously used Wordle answers
- `requirements.txt` - Python dependencies

## Algorithm

The solver uses:
- **Letter frequency analysis** - Prioritizes common letters
- **Position-based filtering** - Applies locked/excluded position constraints
- **Scoring system** - Ranks words by likelihood of success
- **Repeat letter penalty** - Adjustable penalty for words with repeated letters

## Technologies

- **Python** - Core language
- **Streamlit** - Web interface
- **BeautifulSoup** - Web scraping for past answers
- **Requests** - HTTP requests for word lists

## Credits

Word list source: https://gist.github.com/dracos/dd0668f281e685bad51479e5acaadb93

Built as a hobby project with AI assistance.

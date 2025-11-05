# 🎯 Wordle Solver

An intelligent Wordle solver with a beautiful, modern web interface. Get smart word recommendations based on your guesses and solve Wordle puzzles faster!

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.0.0-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ Features

- **🎨 Modern Web Interface** - Beautiful, responsive UI inspired by the official Wordle game
- **🧠 Smart Recommendations** - Advanced scoring algorithm that considers:
  - Letter frequency analysis
  - Position-based scoring
  - Repeated letter penalties
  - Word popularity from frequency data
- **🚀 Real-time Filtering** - Instantly see how many possible words remain
- **📊 Letter Frequency Analysis** - View the most common letters in remaining words
- **🌟 Best Starting Words** - Get optimal starting word suggestions
- **💾 Automatic Data Updates** - Fetches latest word lists and previous Wordle answers
- **⚡ Fast & Efficient** - Processes thousands of words in milliseconds
- **📱 Responsive Design** - Works perfectly on desktop, tablet, and mobile devices

## 🖼️ Screenshots

### Main Interface
The clean, intuitive interface makes it easy to track your guesses:
- Click tiles to cycle through states: Gray (excluded) → Yellow (wrong position) → Green (correct position)
- Get instant word recommendations ranked by score
- View letter frequency analysis to inform your next guess

### Key Features
- **Interactive Wordle Grid**: Visual feedback with color-coded tiles
- **Smart Recommendations**: Top 20 word suggestions with scoring breakdown
- **Letter Frequency Analysis**: See which letters appear most in remaining words
- **Starting Words**: Get the statistically best starting words

## 🚀 Quick Start

### Option 1: Easy Start (Recommended)

**For Linux/Mac:**
```bash
./run.sh
```

**For Windows:**
```batch
run.bat
```

The script will automatically:
1. Create a virtual environment
2. Install all dependencies
3. Start the web server

Then open your browser to: **http://localhost:5000**

### Option 2: Manual Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd My-Wordle-Solver
   ```

2. **Create a virtual environment** (recommended)
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**
   ```bash
   cd app
   python app.py
   ```

5. **Open your browser**
   Navigate to: **http://localhost:5000**

## 📖 How to Use

### 1. Enter Your Guess
Type a 5-letter word into the grid (or use one of the suggested starting words).

### 2. Mark Letter Status
Click each tile to cycle through its state:
- **Gray**: Letter is not in the word
- **Yellow**: Letter is in the word but in the wrong position
- **Green**: Letter is in the correct position

### 3. Get Recommendations
Click "Analyze & Get Recommendations" to see:
- Top 20 recommended words ranked by score
- How many possible words remain
- Most common letters in remaining words

### 4. Repeat
Continue entering guesses and updating tile states until you solve the puzzle!

## 🎮 Tips for Best Results

1. **Start with the suggested words** - They're optimized for maximum letter coverage
2. **Use the repeat letter penalty** - Adjust the slider to prefer words without repeated letters (usually better for early guesses)
3. **Watch the word count** - If it's getting too low, you're close to the answer!
4. **Check letter frequency** - Focus on using high-frequency letters in your next guess
5. **Exclude old words** - Keep the checkbox enabled to avoid previous Wordle answers

## 🏗️ Project Structure

```
My-Wordle-Solver/
├── app/
│   ├── app.py                 # Flask web application
│   ├── wordle_solver.py       # Core solving logic
│   ├── templates/
│   │   └── index.html         # Main HTML template
│   └── static/
│       ├── css/
│       │   └── style.css      # Styling and animations
│       └── js/
│           └── app.js         # Frontend JavaScript
├── five_letter_words.txt      # 5-letter word dictionary
├── five_letter_frequency_list.txt  # Word frequency data
├── OldWords.txt               # Previous Wordle answers
├── requirements.txt           # Python dependencies
├── run.sh                     # Linux/Mac startup script
├── run.bat                    # Windows startup script
└── README.md                  # This file
```

## 🔧 Technical Details

### Backend (Python/Flask)
- **Word Filtering**: Advanced filtering based on locked positions, wrong positions, and excluded letters
- **Scoring Algorithm**: Combines letter frequency, position analysis, and optional repeat penalties
- **Data Sources**:
  - Word list from [GitHub Gist](https://gist.github.com/dracos/dd0668f281e685bad51479e5acaadb93)
  - Previous answers from Rock Paper Shotgun
  - Frequency data for scoring

### Frontend (HTML/CSS/JavaScript)
- **Modern UI**: Clean, responsive design with smooth animations
- **Interactive Grid**: Click-to-cycle tile states
- **Real-time Updates**: Instant feedback as you interact
- **API Communication**: RESTful endpoints for all operations

## 🛠️ API Endpoints

The application exposes the following REST API endpoints:

- `GET /` - Main web interface
- `POST /api/initialize` - Initialize word lists
- `GET /api/starting-words` - Get best starting words
- `POST /api/solve` - Get word recommendations based on current state
- `POST /api/filter` - Quick filter to check remaining word count
- `POST /api/reset` - Reset solver to initial state

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Word list from [dracos's GitHub Gist](https://gist.github.com/dracos/dd0668f281e685bad51479e5acaadb93)
- Wordle game by Josh Wardle
- Previous answer tracking from Rock Paper Shotgun

## 🎯 About

This started as a hobby project to explore AI-assisted development and has evolved into a fully-featured Wordle solving tool. The project demonstrates:
- Clean code architecture
- Modern web development practices
- Effective use of algorithms for word games
- Beautiful UI/UX design

## 📧 Contact

For questions, suggestions, or feedback, please open an issue on GitHub.

---

**Happy Wordling!** 🎉

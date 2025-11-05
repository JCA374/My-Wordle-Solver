"""
Flask Web Application for Wordle Solver
Provides a modern web interface for solving Wordle puzzles.
"""

from flask import Flask, render_template, request, jsonify
import sys
import os

# Add parent directory to path to import wordle_solver
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from wordle_solver import WordleSolver

app = Flask(__name__)

# Initialize the solver (singleton instance)
solver = None


def get_solver():
    """Get or create the WordleSolver instance."""
    global solver
    if solver is None:
        solver = WordleSolver()
    return solver


@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')


@app.route('/api/initialize', methods=['POST'])
def initialize():
    """Initialize the word lists."""
    try:
        data = request.get_json()
        exclude_old = data.get('exclude_old', True)

        solver = get_solver()
        solver.remove_old_words(exclude_old)

        return jsonify({
            'success': True,
            'word_count': len(solver.current_word_list),
            'message': f'Initialized with {len(solver.current_word_list)} words'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/starting-words', methods=['GET'])
def get_starting_words():
    """Get best starting words."""
    try:
        solver = get_solver()
        best_words = solver.find_best_starting_words(num_words=2)

        return jsonify({
            'success': True,
            'starting_words': [
                {'word': word, 'score': float(score)}
                for word, score in best_words
            ]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/solve', methods=['POST'])
def solve():
    """
    Solve Wordle based on current state.

    Expected JSON format:
    {
        "locked": {"1": "A", "3": "O"},  // Green tiles (position: letter)
        "wrong_position": {"2": "R", "4": "S"},  // Yellow tiles
        "excluded": ["E", "T", "I"],  // Gray tiles
        "repeat_multiplier": 0.5
    }
    """
    try:
        data = request.get_json()

        # Parse the input
        locked_positions = {int(k): v.upper() for k, v in data.get('locked', {}).items()}
        wrong_positions = {int(k): v.upper() for k, v in data.get('wrong_position', {}).items()}
        excluded_letters = [letter.upper() for letter in data.get('excluded', [])]
        repeat_multiplier = float(data.get('repeat_multiplier', 0.5))

        solver = get_solver()

        # Filter words based on constraints
        filtered_words = solver.filter_words_based_on_parameters(
            locked_positions=locked_positions,
            wrong_positions=wrong_positions,
            excluded_letters=excluded_letters
        )

        # Get recommendations
        recommendations = solver.get_recommendations(
            filtered_words=filtered_words,
            top_n=20,
            repeat_multiplier=repeat_multiplier
        )

        # Get letter frequency info
        letter_freq = solver.get_letter_frequency_info(filtered_words, top_n=10)

        return jsonify({
            'success': True,
            'word_count': len(filtered_words),
            'recommendations': recommendations,
            'letter_frequency': [
                {'letter': letter, 'frequency': freq}
                for letter, freq in letter_freq
            ]
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/filter', methods=['POST'])
def filter_words():
    """
    Filter words based on current constraints without scoring.
    Useful for quick feedback on how many words remain.
    """
    try:
        data = request.get_json()

        locked_positions = {int(k): v.upper() for k, v in data.get('locked', {}).items()}
        wrong_positions = {int(k): v.upper() for k, v in data.get('wrong_position', {}).items()}
        excluded_letters = [letter.upper() for letter in data.get('excluded', [])]

        solver = get_solver()

        filtered_words = solver.filter_words_based_on_parameters(
            locked_positions=locked_positions,
            wrong_positions=wrong_positions,
            excluded_letters=excluded_letters
        )

        return jsonify({
            'success': True,
            'word_count': len(filtered_words)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/reset', methods=['POST'])
def reset():
    """Reset the solver to initial state."""
    try:
        data = request.get_json()
        exclude_old = data.get('exclude_old', True)

        solver = get_solver()
        solver.remove_old_words(exclude_old)

        return jsonify({
            'success': True,
            'word_count': len(solver.current_word_list),
            'message': 'Solver reset successfully'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    # Initialize solver on startup
    print("Initializing Wordle Solver...")
    get_solver()
    print(f"Loaded {len(solver.current_word_list)} words")

    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)

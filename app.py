import streamlit as st
import requests
from bs4 import BeautifulSoup
from collections import Counter
import os

# Page config
st.set_page_config(
    page_title="Wordle Solver",
    page_icon="🎯",
    layout="wide"
)

# Custom CSS for better styling
st.markdown("""
    <style>
    .main {
        padding: 2rem;
    }
    .stButton>button {
        width: 100%;
        height: 3rem;
        font-weight: 600;
    }
    .letter-box {
        font-size: 2rem;
        font-weight: bold;
        text-align: center;
        padding: 1rem;
        border: 2px solid #ddd;
        border-radius: 8px;
        margin: 0.5rem 0;
    }
    .word-result {
        padding: 0.5rem;
        margin: 0.25rem 0;
        background-color: #f0f2f6;
        border-radius: 4px;
    }
    </style>
""", unsafe_allow_html=True)

# ============================================================================
# WORD LIST FUNCTIONS
# ============================================================================

def fetch_gist_content(gist_url):
    """Fetch five-letter words from GitHub Gist with local fallback."""
    local_file_path = "five_letter_words.txt"

    try:
        gist_id = gist_url.split('/')[-1].split('.')[0]
        raw_url = f"https://gist.githubusercontent.com/dracos/{gist_id}/raw/"
        response = requests.get(raw_url, timeout=10)

        if response.status_code == 200:
            content = response.text
            with open(local_file_path, 'w') as file:
                file.write(content)
            return string_to_list(content)
        else:
            raise Exception("Failed to fetch content from GitHub Gist")
    except Exception as e:
        st.info(f"Using local word list due to: {e}")
        with open(local_file_path, 'r') as file:
            return string_to_list(file.read())

def string_to_list(input_string):
    """Convert newline-separated string to uppercase list."""
    return [word.upper() for word in input_string.strip().split("\n")]

def get_old_words():
    """Fetch past Wordle answers with local fallback."""
    url = "https://www.rockpapershotgun.com/wordle-past-answers"
    local_file_path = "OldWords.txt"

    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.content, "html.parser")
        oldwords = [li.text for li in soup.select("ul.inline li")]

        with open(local_file_path, 'w') as file:
            file.write('\n'.join(oldwords))
        return oldwords
    except Exception as e:
        st.info(f"Using local old words file due to: {e}")
        if os.path.exists(local_file_path):
            with open(local_file_path, 'r') as file:
                return file.read().splitlines()
        return []

def get_frequency_list():
    """Load word frequency dictionary from file."""
    file_name = "five_letter_frequency_list.txt"
    word_frequency_dict = {}

    try:
        with open(file_name, "r") as file:
            lines = file.readlines()
            for line in lines:
                parts = line.strip().split('\t')
                if len(parts) == 2:
                    word, number = parts
                    word_frequency_dict[word] = int(number)
    except FileNotFoundError:
        st.warning(f"File '{file_name}' not found.")

    return word_frequency_dict

# ============================================================================
# FILTERING FUNCTIONS
# ============================================================================

def filter_words_by_locked_positions(words_list, locked_positions):
    """Filter words that have locked letters in locked positions."""
    for position, letter in locked_positions.items():
        words_list = [word for word in words_list if len(word) >= position and word[position-1] == letter]
    return words_list

def filter_words_by_excluded_positions(words_list, excluded_positions):
    """Filter out words that have specified letters in excluded positions."""
    filtered_words = []
    for word in words_list:
        exclude_word = False
        for position, letter in excluded_positions.items():
            if word[position-1] == letter:
                exclude_word = True
                break
        if not exclude_word:
            filtered_words.append(word)
    return filtered_words

def exclude_words_with_letters(word_list, excluded_letters, locked_positions, excluded_positions):
    """Exclude words containing certain letters (unless they're locked or in wrong position)."""
    combined_letters = set(locked_positions.values()).union(set(excluded_positions.values()))
    filtered_excluded_letters = [letter for letter in excluded_letters if letter not in combined_letters]
    filtered_word_list = [word for word in word_list if not any(letter in word for letter in filtered_excluded_letters)]
    return filtered_word_list

def filter_words_by_wrong_positions(words_list, excluded_positions):
    """Ensure words contain letters that are in wrong positions."""
    for _, letter in excluded_positions.items():
        words_list = [word for word in words_list if letter in word]
    return words_list

def filter_words_based_on_parameters(words_list, letters_not_included, locked_positions, excluded_positions):
    """Main filtering function that applies all constraints."""
    words_list = filter_words_by_locked_positions(words_list, locked_positions)
    words_list = filter_words_by_excluded_positions(words_list, excluded_positions)
    words_list = filter_words_by_wrong_positions(words_list, excluded_positions)
    words_list = exclude_words_with_letters(words_list, letters_not_included, locked_positions, excluded_positions)
    return words_list

# ============================================================================
# SCORING FUNCTIONS
# ============================================================================

def count_letter_frequency(words_list):
    """Count frequency of each letter in the word list."""
    letter_frequency = Counter("".join(words_list))
    return sorted(letter_frequency.items(), key=lambda x: x[1], reverse=True)

def compute_letter_scores(words_list):
    """Compute normalized frequency scores for each letter."""
    letter_frequency = Counter("".join(words_list))
    total_letters = sum(letter_frequency.values())
    letter_scores = {letter: freq / total_letters for letter, freq in letter_frequency.items()}
    return letter_scores

def calculate_word_scores_simple(words_list, word_frequency_dict):
    """Calculate simple word scores based on letter frequency."""
    letter_frequency = Counter("".join(words_list))
    word_scores = {}

    for word in words_list:
        if word in word_frequency_dict:
            # Score based on letter frequency
            score = sum(letter_frequency.get(letter, 0) for letter in word)
            word_scores[word] = score

    return word_scores

def get_top_recommendations(words_list, word_frequency_dict, repeat_multiplier=0.5, top_n=20):
    """Get top word recommendations with scores."""
    if not words_list:
        return []

    letter_scores = compute_letter_scores(words_list)
    word_scores = {}

    for word in words_list:
        # Letter score
        word_letter_score = sum([letter_scores.get(letter, 0) for letter in word])

        # Apply multiplier for repeated letters
        multiplier = repeat_multiplier if len(word) > len(set(word)) else 1.0
        total_score = word_letter_score * multiplier

        # Get frequency if available
        freq = word_frequency_dict.get(word, 0)

        word_scores[word] = {
            'score': round(total_score, 4),
            'frequency': freq
        }

    # Sort by score
    sorted_words = sorted(word_scores.items(), key=lambda x: x[1]['score'], reverse=True)[:top_n]
    return sorted_words

def find_best_starting_words(word_list, top_n=2):
    """Find the best starting words with unique letters and no overlap."""
    letter_frequency = Counter("".join(word_list))

    # Calculate scores for words with all unique letters
    word_scores = {}
    for word in word_list:
        if len(word) == len(set(word)):  # All unique letters
            word_scores[word] = sum(letter_frequency[letter] for letter in word)

    # Sort by score
    sorted_words = sorted(word_scores.items(), key=lambda x: x[1], reverse=True)

    # Find top N words with no shared letters
    top_words = []
    for word, score in sorted_words:
        if not top_words:
            top_words.append((word, score))
        else:
            # Check if this word shares any letters with already selected words
            used_letters = set(''.join([w[0] for w in top_words]))
            if not any(letter in used_letters for letter in word):
                top_words.append((word, score))
                if len(top_words) >= top_n:
                    break

    return top_words

# ============================================================================
# STREAMLIT APP
# ============================================================================

def initialize_session_state():
    """Initialize session state variables."""
    if 'word_list' not in st.session_state:
        st.session_state.word_list = None
    if 'word_frequency_dict' not in st.session_state:
        st.session_state.word_frequency_dict = None
    if 'current_word' not in st.session_state:
        st.session_state.current_word = "AROSE"
    if 'letter_states' not in st.session_state:
        st.session_state.letter_states = {i: None for i in range(5)}
    if 'locked_positions' not in st.session_state:
        st.session_state.locked_positions = {}
    if 'excluded_positions' not in st.session_state:
        st.session_state.excluded_positions = {}
    if 'excluded_letters' not in st.session_state:
        st.session_state.excluded_letters = []
    if 'data_loaded' not in st.session_state:
        st.session_state.data_loaded = False

def load_data():
    """Load word lists and frequency data."""
    with st.spinner("Loading word lists..."):
        # Fetch word lists
        five_letter_words = fetch_gist_content("https://gist.github.com/dracos/dd0668f281e685bad51479e5acaadb93")

        # Get old words (optional - can be skipped for speed)
        oldwords = get_old_words()
        incorrect_words = ['AERIO', 'AEROS']  # Words not accepted by Wordle
        oldwords += incorrect_words

        # For now, use all words (user can toggle to exclude old words)
        st.session_state.word_list = five_letter_words
        st.session_state.full_word_list = five_letter_words
        st.session_state.old_words = oldwords

        # Load frequency dictionary
        st.session_state.word_frequency_dict = get_frequency_list()
        st.session_state.data_loaded = True

def reset_game():
    """Reset the game state."""
    st.session_state.current_word = "AROSE"
    st.session_state.letter_states = {i: None for i in range(5)}
    st.session_state.locked_positions = {}
    st.session_state.excluded_positions = {}
    st.session_state.excluded_letters = []
    if st.session_state.get('exclude_old_words', False):
        st.session_state.word_list = [w for w in st.session_state.full_word_list if w not in st.session_state.old_words]
    else:
        st.session_state.word_list = st.session_state.full_word_list

def main():
    """Main Streamlit app."""
    initialize_session_state()

    # Header
    st.title("🎯 Wordle Solver")
    st.markdown("### An intelligent assistant to help you solve Wordle puzzles")

    # Load data if not already loaded
    if not st.session_state.data_loaded:
        load_data()

    # Sidebar for settings
    with st.sidebar:
        st.header("⚙️ Settings")

        # Exclude old words toggle
        exclude_old = st.checkbox(
            "Exclude past Wordle answers",
            value=st.session_state.get('exclude_old_words', False),
            help="Filter out words that have already been used in Wordle"
        )
        if exclude_old != st.session_state.get('exclude_old_words', False):
            st.session_state.exclude_old_words = exclude_old
            if exclude_old and st.session_state.old_words:
                st.session_state.word_list = [w for w in st.session_state.full_word_list if w not in st.session_state.old_words]
            else:
                st.session_state.word_list = st.session_state.full_word_list

        # Repeat letter multiplier
        repeat_multiplier = st.slider(
            "Repeat Letter Penalty",
            min_value=0.0,
            max_value=1.0,
            value=0.5,
            step=0.1,
            help="Lower values penalize words with repeated letters more heavily"
        )

        st.divider()

        # Statistics
        st.header("📊 Statistics")
        st.metric("Total Words Available", len(st.session_state.word_list))
        if st.session_state.locked_positions or st.session_state.excluded_positions or st.session_state.excluded_letters:
            filtered = filter_words_based_on_parameters(
                st.session_state.word_list,
                st.session_state.excluded_letters,
                st.session_state.locked_positions,
                st.session_state.excluded_positions
            )
            st.metric("Possible Solutions", len(filtered))

        st.divider()

        # Best starting words
        st.header("🌟 Best Starting Words")
        if st.session_state.word_list:
            starting_words = find_best_starting_words(st.session_state.word_list, top_n=3)
            for i, (word, score) in enumerate(starting_words, 1):
                st.write(f"**{i}.** {word} (Score: {score:,})")

        st.divider()

        if st.button("🔄 Reset Game", use_container_width=True):
            reset_game()
            st.rerun()

    # Main content
    col1, col2 = st.columns([1, 1])

    with col1:
        st.header("📝 Enter Your Guess")

        # Word input
        word_input = st.text_input(
            "Word",
            value=st.session_state.current_word,
            max_chars=5,
            help="Enter the 5-letter word you guessed"
        ).upper()

        if len(word_input) == 5:
            st.session_state.current_word = word_input

            # Display letter status buttons
            st.markdown("### Mark each letter's status:")

            # Create 5 columns for each letter
            letter_cols = st.columns(5)

            for i, letter in enumerate(word_input):
                with letter_cols[i]:
                    st.markdown(f"<div class='letter-box'>{letter}</div>", unsafe_allow_html=True)

                    # Status buttons for each letter
                    if st.button("🟩 Correct", key=f"lock_{i}", use_container_width=True):
                        st.session_state.letter_states[i] = "locked"
                        st.session_state.locked_positions[i+1] = letter
                        if i+1 in st.session_state.excluded_positions:
                            del st.session_state.excluded_positions[i+1]
                        if letter in st.session_state.excluded_letters:
                            st.session_state.excluded_letters.remove(letter)
                        st.rerun()

                    if st.button("🟨 Wrong Position", key=f"wrong_{i}", use_container_width=True):
                        st.session_state.letter_states[i] = "wrong_place"
                        st.session_state.excluded_positions[i+1] = letter
                        if i+1 in st.session_state.locked_positions:
                            del st.session_state.locked_positions[i+1]
                        if letter in st.session_state.excluded_letters:
                            st.session_state.excluded_letters.remove(letter)
                        st.rerun()

                    if st.button("⬛ Not in Word", key=f"exclude_{i}", use_container_width=True):
                        st.session_state.letter_states[i] = "excluded"
                        if letter not in st.session_state.excluded_letters:
                            st.session_state.excluded_letters.append(letter)
                        if i+1 in st.session_state.locked_positions:
                            del st.session_state.locked_positions[i+1]
                        if i+1 in st.session_state.excluded_positions:
                            del st.session_state.excluded_positions[i+1]
                        st.rerun()

                    # Show current state
                    state = st.session_state.letter_states[i]
                    if state == "locked":
                        st.markdown(
                            "<div style='background-color: #6aaa64; color: white; padding: 0.5rem; border-radius: 4px; text-align: center; font-weight: 600;'>✓ Correct</div>",
                            unsafe_allow_html=True
                        )
                    elif state == "wrong_place":
                        st.markdown(
                            "<div style='background-color: #c9b458; color: white; padding: 0.5rem; border-radius: 4px; text-align: center; font-weight: 600;'>≈ Wrong Position</div>",
                            unsafe_allow_html=True
                        )
                    elif state == "excluded":
                        st.markdown(
                            "<div style='background-color: #787c7e; color: white; padding: 0.5rem; border-radius: 4px; text-align: center; font-weight: 600;'>✗ Not in Word</div>",
                            unsafe_allow_html=True
                        )

        elif len(word_input) > 0:
            st.warning("⚠️ Please enter exactly 5 letters")

    with col2:
        st.header("💡 Recommendations")

        # Filter words based on current constraints
        filtered_words = filter_words_based_on_parameters(
            st.session_state.word_list,
            st.session_state.excluded_letters,
            st.session_state.locked_positions,
            st.session_state.excluded_positions
        )

        if filtered_words:
            # Get recommendations
            recommendations = get_top_recommendations(
                filtered_words,
                st.session_state.word_frequency_dict,
                repeat_multiplier=repeat_multiplier,
                top_n=20
            )

            if recommendations:
                st.success(f"Found {len(filtered_words)} possible words. Top 20 recommendations:")

                # Display recommendations in a nice format
                for i, (word, data) in enumerate(recommendations, 1):
                    freq = data['frequency']
                    score = data['score']
                    freq_str = f"{freq:,}" if freq > 0 else "N/A"

                    st.markdown(
                        f"<div class='word-result'>"
                        f"<strong>{i}. {word}</strong> - "
                        f"Score: {score:.4f} | "
                        f"Frequency: {freq_str}"
                        f"</div>",
                        unsafe_allow_html=True
                    )

                # Show letter frequency
                st.divider()
                st.subheader("Most Common Letters (in remaining words)")
                letter_freq = count_letter_frequency(filtered_words)[:10]

                freq_cols = st.columns(5)
                for i, (letter, freq) in enumerate(letter_freq):
                    with freq_cols[i % 5]:
                        st.metric(letter, f"{freq:,}")
            else:
                st.info("Enter a word and mark the letters to get recommendations")
        else:
            if st.session_state.locked_positions or st.session_state.excluded_positions or st.session_state.excluded_letters:
                st.error("❌ No words match your constraints. Please check your inputs.")
            else:
                st.info("👆 Enter a word above and mark each letter's status to get started")

    # Show current constraints
    if st.session_state.locked_positions or st.session_state.excluded_positions or st.session_state.excluded_letters:
        st.divider()
        st.subheader("Current Constraints")

        constraint_cols = st.columns(3)

        with constraint_cols[0]:
            if st.session_state.locked_positions:
                st.write("**🟩 Correct Letters:**")
                for pos, letter in st.session_state.locked_positions.items():
                    st.write(f"Position {pos}: {letter}")

        with constraint_cols[1]:
            if st.session_state.excluded_positions:
                st.write("**🟨 Wrong Position Letters:**")
                for pos, letter in st.session_state.excluded_positions.items():
                    st.write(f"Not at position {pos}: {letter}")

        with constraint_cols[2]:
            if st.session_state.excluded_letters:
                st.write("**⬛ Excluded Letters:**")
                st.write(", ".join(st.session_state.excluded_letters))

if __name__ == "__main__":
    main()

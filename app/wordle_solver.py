"""
Wordle Solver - Core Logic Module
Provides word filtering, scoring, and recommendation functionality for Wordle solving.
"""

import requests
from bs4 import BeautifulSoup
from collections import Counter, defaultdict
from typing import List, Dict, Tuple, Set


class WordleSolver:
    """Main class for Wordle solving logic."""

    def __init__(self):
        """Initialize the Wordle solver with word lists and frequency data."""
        self.five_letter_words = []
        self.old_words = []
        self.word_frequency_dict = {}
        self.current_word_list = []
        self.initialize_word_lists()

    def initialize_word_lists(self):
        """Load all necessary word lists and frequency data."""
        self.five_letter_words = self.fetch_gist_content(
            "https://gist.github.com/dracos/dd0668f281e685bad51479e5acaadb93"
        )
        self.old_words = self.get_old_words()
        self.word_frequency_dict = self.get_frequency_list()

        # Start with all words (can be filtered to remove old words)
        self.current_word_list = self.five_letter_words.copy()

    def fetch_gist_content(self, gist_url: str) -> List[str]:
        """
        Fetch five-letter word list from GitHub Gist.
        Falls back to local file if fetch fails.
        """
        # Look for file in parent directory (project root)
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        local_file_path = os.path.join(base_dir, "five_letter_words.txt")

        try:
            gist_id = gist_url.split('/')[-1].split('.')[0]
            raw_url = f"https://gist.githubusercontent.com/dracos/{gist_id}/raw/"
            response = requests.get(raw_url, timeout=5)

            if response.status_code == 200:
                content = response.text
                with open(local_file_path, 'w') as file:
                    file.write(content)
                return self._string_to_list(content)
            else:
                raise Exception("Failed to fetch content from GitHub Gist")
        except Exception as e:
            print(f"Using local file {local_file_path} due to: {e}")
            try:
                with open(local_file_path, 'r') as file:
                    return self._string_to_list(file.read())
            except FileNotFoundError:
                return []

    def _string_to_list(self, input_string: str) -> List[str]:
        """Convert newline-separated string to uppercase word list."""
        return [word.upper() for word in input_string.strip().split("\n")]

    def get_old_words(self) -> List[str]:
        """
        Scrape previous Wordle answers from Rock Paper Shotgun.
        Falls back to local file if scraping fails.
        """
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        url = "https://www.rockpapershotgun.com/wordle-past-answers"
        local_file_path = os.path.join(base_dir, "OldWords.txt")

        try:
            response = requests.get(url, timeout=5)
            soup = BeautifulSoup(response.content, "html.parser")
            oldwords = [li.text.upper() for li in soup.select("ul.inline li")]

            with open(local_file_path, 'w') as file:
                file.write('\n'.join(oldwords))

            return oldwords
        except Exception as e:
            print(f"Using local file {local_file_path} due to: {e}")
            try:
                with open(local_file_path, 'r') as file:
                    return [word.upper() for word in file.read().splitlines()]
            except FileNotFoundError:
                return []

    def get_frequency_list(self) -> Dict[str, int]:
        """Load word frequency data from local file."""
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        file_name = os.path.join(base_dir, "five_letter_frequency_list.txt")
        word_frequency_dict = {}

        try:
            with open(file_name, "r") as file:
                lines = file.readlines()
                for line in lines:
                    parts = line.strip().split('\t')
                    if len(parts) == 2:
                        word, number = parts
                        word_frequency_dict[word.upper()] = int(number)
        except FileNotFoundError:
            print(f"File '{file_name}' not found.")

        return word_frequency_dict

    def remove_old_words(self, exclude_old: bool = True) -> List[str]:
        """Remove old Wordle answers from the word list."""
        if exclude_old:
            self.current_word_list = [
                word for word in self.five_letter_words
                if word not in self.old_words
            ]
        else:
            self.current_word_list = self.five_letter_words.copy()
        return self.current_word_list

    def count_letter_frequency(self, words_list: List[str]) -> List[Tuple[str, int]]:
        """Count the frequency of each letter in the given word list."""
        letter_frequency = Counter("".join(words_list))
        return sorted(letter_frequency.items(), key=lambda x: x[1], reverse=True)

    def filter_words_by_locked_positions(
        self,
        words_list: List[str],
        locked_positions: Dict[int, str]
    ) -> List[str]:
        """Filter words that have the locked letters in the locked positions."""
        filtered = words_list.copy()
        for position, letter in locked_positions.items():
            filtered = [
                word for word in filtered
                if len(word) >= position and word[position - 1] == letter
            ]
        return filtered

    def filter_words_by_excluded_positions(
        self,
        words_list: List[str],
        excluded_positions: Dict[int, str]
    ) -> List[str]:
        """Filter out words that have specified letters in excluded positions."""
        filtered_words = []
        for word in words_list:
            exclude_word = False
            for position, letter in excluded_positions.items():
                if word[position - 1] == letter:
                    exclude_word = True
                    break
            if not exclude_word:
                filtered_words.append(word)
        return filtered_words

    def filter_words_by_wrong_positions(
        self,
        words_list: List[str],
        wrong_positions: Dict[int, str]
    ) -> List[str]:
        """Filter words to only include those containing letters from wrong positions."""
        filtered = words_list.copy()
        for position, letter in wrong_positions.items():
            filtered = [word for word in filtered if letter in word]
        return filtered

    def exclude_words_with_letters(
        self,
        word_list: List[str],
        excluded_letters: List[str],
        locked_positions: Dict[int, str],
        wrong_positions: Dict[int, str]
    ) -> List[str]:
        """
        Exclude words containing specified letters, unless those letters
        are in locked or wrong positions.
        """
        # Combine letters that should not be excluded
        protected_letters = set(locked_positions.values()).union(
            set(wrong_positions.values())
        )

        # Filter excluded letters to remove protected ones
        filtered_excluded = [
            letter for letter in excluded_letters
            if letter not in protected_letters
        ]

        # Filter out words containing the excluded letters
        return [
            word for word in word_list
            if not any(letter in word for letter in filtered_excluded)
        ]

    def filter_words_based_on_parameters(
        self,
        locked_positions: Dict[int, str] = None,
        wrong_positions: Dict[int, str] = None,
        excluded_letters: List[str] = None
    ) -> List[str]:
        """
        Main filtering function that applies all constraints.

        Args:
            locked_positions: Dict of {position: letter} for green tiles
            wrong_positions: Dict of {position: letter} for yellow tiles
            excluded_letters: List of letters that are not in the word (gray tiles)

        Returns:
            Filtered list of possible words
        """
        if locked_positions is None:
            locked_positions = {}
        if wrong_positions is None:
            wrong_positions = {}
        if excluded_letters is None:
            excluded_letters = []

        filtered = self.current_word_list.copy()

        # Apply locked positions (green tiles)
        if locked_positions:
            filtered = self.filter_words_by_locked_positions(filtered, locked_positions)

        # Apply wrong positions (yellow tiles) - letter is in word but wrong spot
        if wrong_positions:
            # First, exclude words with letters in wrong positions
            filtered = self.filter_words_by_excluded_positions(filtered, wrong_positions)
            # Then, ensure words contain these letters somewhere
            filtered = self.filter_words_by_wrong_positions(filtered, wrong_positions)

        # Apply excluded letters (gray tiles)
        if excluded_letters:
            filtered = self.exclude_words_with_letters(
                filtered, excluded_letters, locked_positions, wrong_positions
            )

        return filtered

    def compute_letter_scores(self, words_list: List[str]) -> Dict[str, float]:
        """Compute normalized frequency scores for each letter."""
        letter_frequency = Counter("".join(words_list))
        total_letters = sum(letter_frequency.values())

        return {
            letter: freq / total_letters
            for letter, freq in letter_frequency.items()
        }

    def compute_unique_letter_scores(self, words_list: List[str]) -> Dict[str, int]:
        """Compute scores for words based on unique letter frequencies."""
        letter_frequency = Counter("".join(words_list))

        word_scores = {
            word: sum([letter_frequency[letter] for letter in set(word)])
            for word in words_list
        }

        return dict(sorted(word_scores.items(), key=lambda x: x[1], reverse=True))

    def get_recommendations(
        self,
        filtered_words: List[str] = None,
        top_n: int = 20,
        repeat_multiplier: float = 0.5
    ) -> List[Dict]:
        """
        Get top recommended words based on letter frequency and scoring.

        Args:
            filtered_words: List of possible words (uses current_word_list if None)
            top_n: Number of recommendations to return
            repeat_multiplier: Penalty for words with repeated letters

        Returns:
            List of dicts with word, score, and frequency information
        """
        if filtered_words is None:
            filtered_words = self.current_word_list

        if not filtered_words:
            return []

        letter_scores = self.compute_letter_scores(filtered_words)

        word_scores = {}
        for word in filtered_words:
            # Calculate letter score
            letter_score = sum([letter_scores.get(letter, 0) for letter in word])

            # Apply penalty for repeated letters
            multiplier = repeat_multiplier if len(word) > len(set(word)) else 1.0
            word_scores[word] = letter_score * multiplier

        # Sort by score
        sorted_words = sorted(word_scores.items(), key=lambda x: x[1], reverse=True)[:top_n]

        # Format results
        recommendations = []
        for word, score in sorted_words:
            recommendations.append({
                'word': word,
                'score': round(score, 4),
                'frequency': self.word_frequency_dict.get(word, 0),
                'has_repeats': len(word) != len(set(word))
            })

        return recommendations

    def find_best_starting_words(self, num_words: int = 2) -> List[Tuple[str, float]]:
        """
        Find the best starting words with maximum letter coverage.

        Args:
            num_words: Number of starting words to find

        Returns:
            List of (word, score) tuples
        """
        letter_frequency = Counter("".join(self.current_word_list))

        def calculate_word_score(word: str) -> float:
            return sum(letter_frequency[letter] for letter in word)

        # Get all words with unique letters only
        unique_letter_words = [
            word for word in self.current_word_list
            if len(word) == len(set(word))
        ]

        # Calculate scores
        word_scores = {
            word: calculate_word_score(word)
            for word in unique_letter_words
        }

        # Sort by score
        sorted_words = sorted(word_scores.items(), key=lambda x: x[1], reverse=True)

        # Find words with no overlapping letters
        best_words = []
        used_letters = set()

        for word, score in sorted_words:
            word_letters = set(word)
            if not word_letters.intersection(used_letters):
                best_words.append((word, score))
                used_letters.update(word_letters)
                if len(best_words) >= num_words:
                    break

        return best_words

    def get_letter_frequency_info(self, words_list: List[str] = None, top_n: int = 10) -> List[Tuple[str, int]]:
        """Get the most common letters in the word list."""
        if words_list is None:
            words_list = self.current_word_list

        return self.count_letter_frequency(words_list)[:top_n]

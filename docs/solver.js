// Pure solver logic: no DOM access, so it runs in the browser and under `node --test`.
// Words are uppercase 5-letter strings. A pattern is 5 chars: g = green, y = yellow, b = gray.

export const WORD_LENGTH = 5;

/** Wordle feedback for `guess` when the answer is `answer`. Handles duplicate letters. */
export function score(guess, answer) {
  const result = Array(WORD_LENGTH).fill('b');
  const unmatched = {};
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) result[i] = 'g';
    else unmatched[answer[i]] = (unmatched[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'g') continue;
    if (unmatched[guess[i]] > 0) {
      result[i] = 'y';
      unmatched[guess[i]]--;
    }
  }
  return result.join('');
}

/** Words that would have produced exactly the given feedback for every guess. */
export function filterCandidates(words, guesses) {
  return words.filter((w) => guesses.every((g) => score(g.word, w) === g.pattern));
}

/** The `n` most common words. `freq` maps word -> frequency. */
export function topByFrequency(words, freq, n = 20) {
  return [...words].sort((a, b) => (freq.get(b) || 0) - (freq.get(a) || 0)).slice(0, n);
}

/** Letter counts across `words`, most common first, as [letter, count] pairs. */
export function letterFrequency(words) {
  const counts = {};
  for (const w of words) for (const c of w) counts[c] = (counts[c] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

/**
 * Words with 5 distinct letters that avoid `excludeLetters` and share no letters
 * with each other, ranked by how common their letters are among the allowed words.
 * Returns [word, score] pairs.
 */
export function bestExploreWords(words, excludeLetters = new Set(), n = 5) {
  const allowed = words.filter((w) => ![...w].some((c) => excludeLetters.has(c)));
  const counts = Object.fromEntries(letterFrequency(allowed));
  const ranked = allowed
    .filter((w) => new Set(w).size === WORD_LENGTH)
    .map((w) => [w, [...w].reduce((sum, c) => sum + counts[c], 0)])
    .sort((a, b) => b[1] - a[1]);

  const picked = [];
  const used = new Set();
  for (const [w, s] of ranked) {
    if ([...w].some((c) => used.has(c))) continue;
    picked.push([w, s]);
    for (const c of w) used.add(c);
    if (picked.length >= n) break;
  }
  return picked;
}

/** Best known status per letter across all guesses: 'g' beats 'y' beats 'b'. */
export function letterStatuses(guesses) {
  const rank = { b: 0, y: 1, g: 2 };
  const status = {};
  for (const { word, pattern } of guesses) {
    for (let i = 0; i < WORD_LENGTH; i++) {
      const c = word[i], p = pattern[i];
      if (!(c in status) || rank[p] > rank[status[c]]) status[c] = p;
    }
  }
  return status;
}

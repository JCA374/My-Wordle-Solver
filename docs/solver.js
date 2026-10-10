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

/**
 * Guesses (from any valid word, ignoring known letters) that best tell apart `targets`.
 * Each guess splits the targets into groups by the colours it would show; fewer and
 * smaller groups are better. Ranked by expected group size (sum of squared sizes),
 * then preferring guesses that could themselves be the answer, then `guessWords` order.
 * Returns [{ word, groups, worst, isTarget }].
 */
export function bestSplitters(guessWords, targets, n = 5) {
  const targetSet = new Set(targets);
  const targetCodes = targets.map(toCodes);
  const counts = new Uint16Array(243);   // 3^5 possible colour patterns
  const ids = new Uint8Array(targets.length);
  const results = [];
  for (const word of guessWords) {
    const g = toCodes(word);
    for (let j = 0; j < targetCodes.length; j++) counts[ids[j] = patternId(g, targetCodes[j])]++;
    let groups = 0, worst = 0, sumSq = 0;
    for (let j = 0; j < ids.length; j++) {
      const c = counts[ids[j]];
      if (!c) continue;            // group already counted
      groups++;
      sumSq += c * c;
      if (c > worst) worst = c;
      counts[ids[j]] = 0;
    }
    results.push({ word, groups, worst, sumSq, isTarget: targetSet.has(word) });
  }
  results.sort((a, b) => a.sumSq - b.sumSq || b.isTarget - a.isTarget);
  return results.slice(0, n).map(({ word, groups, worst, isTarget }) => ({ word, groups, worst, isTarget }));
}

// Fast path for bestSplitters: letters as 0-25 codes, pattern as a base-3 number.
// Must agree with score(); the tests check that.
const letterCounts = new Uint8Array(26);

const codeCache = new Map();

function toCodes(word) {
  let codes = codeCache.get(word);
  if (!codes) {
    codes = Uint8Array.from(word, (c) => c.charCodeAt(0) - 65);
    codeCache.set(word, codes);
  }
  return codes;
}

export function patternId(guess, answer) {
  let green = 0;
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) green |= 1 << i;
    else letterCounts[answer[i]]++;
  }
  // Digit i (base 3) is position i: 0 gray, 1 yellow, 2 green.
  // Yellows are assigned left to right, matching score().
  let id = 0;
  for (let i = 0, place = 1; i < WORD_LENGTH; i++, place *= 3) {
    if (green & (1 << i)) id += 2 * place;
    else if (letterCounts[guess[i]] > 0) {
      letterCounts[guess[i]]--;
      id += place;
    }
  }
  for (let i = 0; i < WORD_LENGTH; i++) letterCounts[answer[i]] = 0;   // cheaper than fill()
  return id;
}

/**
 * Pairs of words that together test 10 different letters, avoiding `excludeLetters`.
 * `weights` maps letter -> how useful it is to test (e.g. how many likely answers contain it).
 * `words` should be most common first; among equal scores the more common words win.
 * Returns [{ words: [first, second], letters }], best first, with no word or letter set repeated.
 */
export function bestPairs(words, weights, excludeLetters = new Set(), n = 3) {
  const items = [];
  words.forEach((word, rank) => {
    let mask = 0, s = 0;
    for (const c of word) {
      const bit = 1 << (c.charCodeAt(0) - 65);
      if (mask & bit || excludeLetters.has(c)) return;
      mask |= bit;
      s += weights[c] || 0;
    }
    items.push({ word, mask, rank, s });
  });
  items.sort((a, b) => b.s - a.s || a.rank - b.rank);

  // Try the strongest distinct first words, each with its best non-overlapping partner.
  const firsts = [];
  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.mask)) continue;   // an anagram of a word already tried
    seen.add(it.mask);
    firsts.push(it);
    if (firsts.length >= 40) break;
  }
  const pairs = [];
  for (const a of firsts) {
    const b = items.find((x) => !(x.mask & a.mask));
    if (b) pairs.push({ words: [a.word, b.word], mask: a.mask | b.mask, s: a.s + b.s, rank: a.rank + b.rank });
  }
  pairs.sort((x, y) => y.s - x.s || x.rank - y.rank);

  const out = [];
  const usedWords = new Set();
  const usedMasks = new Set();
  for (const p of pairs) {
    if (usedMasks.has(p.mask) || p.words.some((w) => usedWords.has(w))) continue;
    usedMasks.add(p.mask);
    p.words.forEach((w) => usedWords.add(w));
    out.push({ words: p.words, letters: p.words.join('') });
    if (out.length >= n) break;
  }
  return out;
}

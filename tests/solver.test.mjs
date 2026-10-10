import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  score, filterCandidates, topByFrequency, letterFrequency, bestExploreWords, letterStatuses,
} from '../docs/solver.js';

test('score: basic patterns', () => {
  assert.equal(score('CRANE', 'CRANE'), 'ggggg');
  assert.equal(score('AROSE', 'CRANE'), 'ygbbg');
  assert.equal(score('QUICK', 'CRANE'), 'bbbyb');
});

test('score: duplicate letters', () => {
  assert.equal(score('SPEED', 'ABIDE'), 'bbyby');
  assert.equal(score('LLAMA', 'HELLO'), 'yybbb');
  assert.equal(score('EERIE', 'THEME'), 'ybbbg');
  assert.equal(score('ROBOT', 'FLOOR'), 'yybgb');
});

test('filterCandidates keeps only consistent words', () => {
  const words = ['CRANE', 'CRATE', 'TRACE', 'GRACE', 'BRAVE'];
  const guesses = [{ word: 'CRATE', pattern: score('CRATE', 'GRACE') }];
  assert.deepEqual(filterCandidates(words, guesses), ['GRACE']);
});

test('filterCandidates: two yellows at the same position across guesses both apply', () => {
  // The old app stored one letter per position, so the second yellow overwrote the first.
  const answer = 'TRAIN';
  const guesses = [
    { word: 'ARISE', pattern: score('ARISE', answer) },
    { word: 'IRONS', pattern: score('IRONS', answer) },
  ];
  const words = ['TRAIN', 'BRAIN', 'IRATE', 'ATRIA', 'GRAIN'];
  const result = filterCandidates(words, guesses);
  assert.ok(result.includes('TRAIN'));
  for (const w of result) {
    for (const g of guesses) assert.equal(score(g.word, w), g.pattern);
  }
});

test('filterCandidates: gray duplicate caps the letter count', () => {
  // SPEED vs ABIDE: one E is yellow, the other gray => exactly one E.
  const guesses = [{ word: 'SPEED', pattern: score('SPEED', 'ABIDE') }];
  const result = filterCandidates(['ABIDE', 'EERIE', 'IDLER'], guesses);
  assert.ok(result.includes('ABIDE'));
  assert.ok(!result.includes('EERIE'));
});

test('topByFrequency sorts by frequency', () => {
  const freq = new Map([['AAAAA', 1], ['BBBBB', 10], ['CCCCC', 5]]);
  assert.deepEqual(topByFrequency(['AAAAA', 'BBBBB', 'CCCCC', 'DDDDD'], freq, 3), ['BBBBB', 'CCCCC', 'AAAAA']);
});

test('letterFrequency counts letters', () => {
  assert.deepEqual(letterFrequency(['ABA', 'BB']).slice(0, 2), [['B', 3], ['A', 2]]);
});

test('bestExploreWords: unique letters, no overlap, respects exclusions', () => {
  const words = ['CRANE', 'SLOTH', 'CRATE', 'DUMPY', 'EERIE', 'BLINK', 'FIGHT'];
  const exclude = new Set(['A']);
  const picked = bestExploreWords(words, exclude, 5).map(([w]) => w);
  const seen = new Set();
  for (const w of picked) {
    assert.equal(new Set(w).size, 5);
    for (const c of w) {
      assert.ok(!exclude.has(c), `${w} contains excluded ${c}`);
      assert.ok(!seen.has(c), `${w} overlaps with an earlier pick`);
      seen.add(c);
    }
  }
  assert.ok(picked.length > 0);
});

test('letterStatuses keeps the best status per letter', () => {
  const s = letterStatuses([
    { word: 'AROSE', pattern: 'ybbbb' },
    { word: 'CLAMP', pattern: 'bbgbb' },
  ]);
  assert.equal(s.A, 'g');
  assert.equal(s.R, 'b');
});

import {
  WORD_LENGTH, filterCandidates, topByFrequency, letterFrequency, bestExploreWords, letterStatuses,
  bestSplitters, bestPairs,
} from './solver.js';

const STORAGE_KEY = 'wordle-solver-state-v1';
const MIN_ROWS = 6;
const NEXT = { b: 'y', y: 'g', g: 'b' };
const SPLIT_TARGETS = 20;   // how many likely answers the splitter tries to tell apart
const COMMON_WORDS = 5000;  // suggested start pairs come from the most common words
const LETTER_BASE = 3000;   // letter counts for start pairs use this many most likely answers
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', '+ZXCVBNM-'];

const $ = (id) => document.getElementById(id);

let allWords = [];          // every valid word, most common first
let freq = new Map();       // word -> frequency
let pastAnswers = new Set();

let state = {
  guesses: [],              // [{ word, pattern }]
  input: '',
  pattern: 'bbbbb',
  excludePast: false,
};

// ---------------------------------------------------------------- storage

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.guesses)) state = { ...state, ...saved };
  } catch { /* storage unavailable or corrupt: start fresh */ }
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

// ---------------------------------------------------------------- actions

/** Default colours for a freshly typed letter: green if it was green at that spot before. */
function defaultStatus(i, letter) {
  return state.guesses.some((g) => g.word[i] === letter && g.pattern[i] === 'g') ? 'g' : 'b';
}

function setPatternAt(i, status) {
  state.pattern = state.pattern.slice(0, i) + status + state.pattern.slice(i + 1);
}

function typeLetter(letter) {
  if (state.input.length >= WORD_LENGTH) return;
  const i = state.input.length;
  state.input += letter;
  setPatternAt(i, defaultStatus(i, letter));
  update();
}

function backspace() {
  if (!state.input) return;
  state.input = state.input.slice(0, -1);
  setPatternAt(state.input.length, 'b');
  update();
}

function setInput(word) {
  state.input = '';
  state.pattern = 'bbbbb';
  for (const c of word) typeLetter(c);
}

function cycleTile(i) {
  if (i >= state.input.length) return;
  setPatternAt(i, NEXT[state.pattern[i]]);
  update();
}

function submit() {
  if (state.input.length < WORD_LENGTH) {
    flash('Enter all five letters first.');
    return;
  }
  state.guesses.push({ word: state.input, pattern: state.pattern });
  state.input = '';
  state.pattern = 'bbbbb';
  update();
}

function undo() {
  if (state.input) setInput('');
  else if (state.guesses.length) {
    const last = state.guesses.pop();
    state.input = last.word;
    state.pattern = last.pattern;
  }
  update();
}

function reset() {
  state = { ...state, guesses: [], input: '', pattern: 'bbbbb' };
  update();
}

let flashTimer;
function flash(text) {
  $('message').textContent = text;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(render, 2500);
}

// ---------------------------------------------------------------- rendering

function tile(letter, status, { current = false, index = -1 } = {}) {
  const el = document.createElement(current && letter ? 'button' : 'div');
  el.className = 'tile';
  el.textContent = letter || '';
  if (letter) el.classList.add('filled', `s-${status}`);
  if (current && letter) {
    el.type = 'button';
    el.classList.add('editable');
    el.setAttribute('aria-label', `${letter}, ${statusName(status)}. Tap to change.`);
    el.addEventListener('click', () => cycleTile(index));
  }
  return el;
}

function statusName(s) {
  return { g: 'correct spot', y: 'wrong spot', b: 'not in word' }[s];
}

function renderBoard(solved) {
  const board = $('board');
  board.replaceChildren();
  const rows = [...state.guesses.map((g) => ({ ...g, current: false }))];
  if (!solved) rows.push({ word: state.input, pattern: state.pattern, current: true });
  while (rows.length < MIN_ROWS) rows.push({ word: '', pattern: 'bbbbb', current: false });

  for (const row of rows) {
    const el = document.createElement('div');
    el.className = 'row' + (row.current ? ' current' : '');
    el.setAttribute('role', 'row');
    for (let i = 0; i < WORD_LENGTH; i++) {
      el.append(tile(row.word[i], row.pattern[i], { current: row.current, index: i }));
    }
    board.append(el);
  }
}

function renderKeyboard() {
  const statuses = letterStatuses(state.guesses);
  const kb = $('keyboard');
  kb.replaceChildren();
  for (const keys of KEY_ROWS) {
    const row = document.createElement('div');
    row.className = 'kb-row';
    for (const k of keys) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'key';
      if (k === '+') {
        btn.textContent = 'Enter';
        btn.classList.add('wide');
        btn.addEventListener('click', submit);
      } else if (k === '-') {
        btn.textContent = '⌫';
        btn.setAttribute('aria-label', 'Backspace');
        btn.classList.add('wide');
        btn.addEventListener('click', backspace);
      } else {
        btn.textContent = k;
        if (statuses[k]) btn.classList.add(`s-${statuses[k]}`);
        btn.addEventListener('click', () => typeLetter(k));
      }
      row.append(btn);
    }
    kb.append(row);
  }
}

function wordButton(word, detail = '') {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'word';
  btn.title = 'Use as next guess';
  const w = document.createElement('span');
  w.className = 'w';
  w.textContent = word;
  btn.append(w);
  if (detail) {
    const d = document.createElement('span');
    d.className = 'd';
    d.textContent = detail;
    btn.append(d);
  }
  btn.addEventListener('click', () => {
    setInput(word);
    $('board').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  return btn;
}

function wordItem(word, detail) {
  const li = document.createElement('li');
  li.append(wordButton(word, detail));
  return li;
}

function pairItem({ words: [a, b] }) {
  const li = document.createElement('li');
  li.className = 'pair';
  const plus = document.createElement('span');
  plus.className = 'plus';
  plus.textContent = '+';
  li.append(wordButton(a), plus, wordButton(b));
  return li;
}

/** How many of the likely, not-yet-used answers contain each letter. */
function letterWeights(candidates) {
  const likely = candidates.slice(0, LETTER_BASE);   // candidates are most common first
  const fresh = likely.filter((w) => !pastAnswers.has(w));
  const weights = {};
  for (const w of fresh.length ? fresh : likely) for (const c of new Set(w)) weights[c] = (weights[c] || 0) + 1;
  return weights;
}

function renderResults(candidates, solved, onlyPastMatch) {
  $('count').textContent = candidates.length.toLocaleString('en');
  $('count-label').textContent = 'possible';

  renderExplore(candidates, solved);

  const likely = topByFrequency(candidates, freq, 20);
  renderSplitters(candidates, solved);
  $('likely').replaceChildren(...likely.map((w) => wordItem(w)));
  if (!likely.length) $('likely').replaceChildren(emptyItem('No words match.'));

  const letters = letterFrequency(candidates).slice(0, 10);
  $('letters').replaceChildren(...letters.map(([c, n]) => {
    const el = document.createElement('div');
    el.className = 'letter';
    el.innerHTML = `<span class="l"></span><span class="n"></span>`;
    el.querySelector('.l').textContent = c;
    el.querySelector('.n').textContent = Intl.NumberFormat('en', { notation: 'compact' }).format(n);
    el.title = `${c} appears ${n.toLocaleString('en')} times in the remaining words`;
    return el;
  }));

  const hint = !solved && !state.guesses.length && candidates.length > 1;
  let message = '';
  if (solved) message = `Solved in ${state.guesses.length}! 🎉`;
  else if (onlyPastMatch) message = 'Only past answers match. Untick "Hide past".';
  else if (candidates.length === 0) message = 'No words match. A tile colour may be off.';
  else if (candidates.length === 1) message = `It must be ${candidates[0]}.`;
  else if (hint) message = 'Type a word · click tiles for colours · Enter';
  $('message').textContent = message;
  $('message').classList.toggle('is-hint', hint);
}

// Two words that test ten untried letters; falls back to single words when no pair fits.
function renderExplore(candidates, solved) {
  const tried = new Set(state.guesses.flatMap((g) => [...g.word]));
  const first = !state.guesses.length;
  const weights = letterWeights(candidates);
  let pairs = bestPairs(allWords.slice(0, COMMON_WORDS), weights, tried, 3);
  if (!pairs.length) pairs = bestPairs(allWords, weights, tried, 3);

  const list = $('explore');
  const sub = $('explore-sub');
  list.classList.toggle('pair-list', pairs.length > 0);
  if (pairs.length) {
    $('explore-title').textContent = first ? 'Best start' : 'Test new letters';
    sub.textContent = first ? '2 words, 10 letters' : '2 words, 10 untried letters';
    sub.title = (first
      ? 'Two common words with no shared letters that together test the 10 letters found in the most likely answers.'
      : 'Probably not the answer, but together they test 10 letters you haven\'t tried, picked by how many possible answers contain them.')
      + ' Click a word to use it.';
    list.replaceChildren(...pairs.map(pairItem));
  } else {
    const words = bestExploreWords(allWords, tried, 5);
    $('explore-title').textContent = 'Test new letters';
    sub.textContent = '5 untried letters each';
    sub.title = 'Probably not the answer, but each tests five letters you haven\'t tried yet.';
    list.replaceChildren(...words.map(([w]) => wordItem(w)));
  }
  $('explore-panel').hidden = solved || !list.children.length;
}

// Scoring every valid guess against the targets takes a moment, so cache it per set of clues.
let splitCache = { key: null, value: [] };

function renderSplitters(candidates, solved) {
  const panel = $('split-panel');
  panel.hidden = solved || !state.guesses.length || candidates.length < 3;
  if (panel.hidden) return;

  const targets = topByFrequency(candidates, freq, SPLIT_TARGETS);
  const key = targets.join();
  if (splitCache.key !== key) splitCache = { key, value: bestSplitters(allWords, targets, 5) };

  const n = targets.length;
  const sub = $('split-sub');
  sub.textContent = `best splits of the top ${n}`;
  sub.title = `Ignores what you already know and picks guesses that best tell apart the ${n} most likely answers.`
    + ' "solves it" means the colours would pin down the answer. ★ could also be the answer.';
  $('split').replaceChildren(...splitCache.value.map((s) => {
    const li = wordItem(s.word, s.worst === 1 ? 'solves it' : '');
    if (s.isTarget) li.querySelector('.word').classList.add('could-win');
    return li;
  }));
}

function emptyItem(text) {
  const li = document.createElement('li');
  li.className = 'empty';
  li.textContent = text;
  return li;
}

function render() {
  const solved = state.guesses.some((g) => g.pattern === 'g'.repeat(WORD_LENGTH));
  const pool = state.excludePast ? allWords.filter((w) => !pastAnswers.has(w)) : allWords;
  const candidates = filterCandidates(pool, state.guesses);
  renderBoard(solved);
  renderKeyboard();
  const onlyPastMatch = state.excludePast && !candidates.length
    && filterCandidates(allWords, state.guesses).length > 0;
  renderResults(candidates, solved, onlyPastMatch);
  $('undo').disabled = !state.guesses.length && !state.input;
  $('exclude-past').checked = state.excludePast;
}

function update() {
  save();
  render();
}

// ---------------------------------------------------------------- startup

function showTab() {
  const how = location.hash === '#how';
  $('how').hidden = !how;
  document.querySelector('.layout').hidden = how;
  document.body.classList.toggle('on-how', how);
  for (const [id, on] of [['tab-solver', !how], ['tab-how', how]]) {
    if (on) $(id).setAttribute('aria-current', 'page');
    else $(id).removeAttribute('aria-current');
  }
  if (how) $('how').scrollTop = 0;
}

function onKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (!$('how').hidden) return;
  if (e.target.closest('input')) return;
  if (e.key === 'Enter') {
    // Let Enter/Space activate a focused button (tile, suggestion) normally.
    if (e.target.closest('button')) return;
    e.preventDefault();
    submit();
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    backspace();
  } else if (/^[a-z]$/i.test(e.key)) {
    typeLetter(e.key.toUpperCase());
  } else if (/^[1-5]$/.test(e.key)) {
    cycleTile(Number(e.key) - 1);
  }
}

async function init() {
  showTab();
  window.addEventListener('hashchange', showTab);
  load();
  try {
    const [words, past] = await Promise.all([
      fetch('data/words.json').then((r) => r.json()),
      fetch('data/past_answers.json').then((r) => r.json()),
    ]);
    allWords = words.map(([w]) => w);
    freq = new Map(words);
    pastAnswers = new Set(past);
  } catch (err) {
    $('message').textContent = 'Could not load the word list. Try reloading the page.';
    console.error(err);
    return;
  }

  document.addEventListener('keydown', onKeyDown);
  $('undo').addEventListener('click', undo);
  $('reset').addEventListener('click', reset);
  $('exclude-past').addEventListener('change', (e) => {
    state.excludePast = e.target.checked;
    update();
  });
  render();
}

init();

import {
  WORD_LENGTH, filterCandidates, topByFrequency, letterFrequency, bestExploreWords, letterStatuses,
} from './solver.js';

const STORAGE_KEY = 'wordle-solver-state-v1';
const MIN_ROWS = 6;
const NEXT = { b: 'y', y: 'g', g: 'b' };
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

function wordItem(word, detail) {
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'word';
  btn.title = 'Use as next guess';
  const w = document.createElement('span');
  w.className = 'w';
  w.textContent = word;
  const d = document.createElement('span');
  d.className = 'd';
  d.textContent = detail;
  btn.append(w, d);
  btn.addEventListener('click', () => {
    setInput(word);
    $('board').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  li.append(btn);
  return li;
}

function formatFreq(word) {
  const f = freq.get(word) || 0;
  if (!f) return 'rare';
  return Intl.NumberFormat('en', { notation: 'compact' }).format(f);
}

function renderResults(candidates, solved, onlyPastMatch) {
  $('count').textContent = candidates.length.toLocaleString('en');
  $('count-label').textContent = candidates.length === 1 ? 'possible answer' : 'possible answers';

  // Explore words: any valid word that avoids every letter already tried.
  const used = new Set([...state.guesses.flatMap((g) => [...g.word]), ...state.input]);
  const explore = bestExploreWords(allWords, used, state.guesses.length ? 5 : 3);
  $('explore-title').textContent = state.guesses.length ? 'Explore new letters' : 'Best starting words';
  $('explore-caption').textContent = state.guesses.length
    ? 'Not likely the answer, but each tests five letters you haven\'t tried yet.'
    : 'Five distinct, common letters with no overlap between words.';
  $('explore').replaceChildren(...explore.map(([w]) => wordItem(w, formatFreq(w))));
  if (!explore.length) $('explore').replaceChildren(emptyItem('No words left with five untried letters.'));

  const likely = topByFrequency(candidates, freq, 20);
  $('likely').replaceChildren(...likely.map((w) => wordItem(w, formatFreq(w))));
  if (!likely.length) $('likely').replaceChildren(emptyItem('No words match.'));

  const letters = letterFrequency(candidates).slice(0, 10);
  $('letters').replaceChildren(...letters.map(([c, n]) => {
    const el = document.createElement('div');
    el.className = 'letter';
    el.innerHTML = `<span class="l"></span><span class="n"></span>`;
    el.querySelector('.l').textContent = c;
    el.querySelector('.n').textContent = n.toLocaleString('en');
    return el;
  }));

  if (solved) $('message').textContent = `Solved in ${state.guesses.length}! 🎉`;
  else if (onlyPastMatch) $('message').textContent = 'Only past answers match. Untick "Exclude past Wordle answers".';
  else if (candidates.length === 0) $('message').textContent = 'No words match. A tile colour may be off.';
  else if (candidates.length === 1) $('message').textContent = `It must be ${candidates[0]}.`;
  else $('message').textContent = '';
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

function onKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
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

import {
  WORD_LENGTH, filterCandidates, topByFrequency, letterFrequency, letterStatuses, bestSplitters, bestPairs,
} from './solver.js?v=7';

const STORAGE_KEY = 'wordle-solver-state-v1';
const MIN_ROWS = 6;
const NEXT = { b: 'y', y: 'g', g: 'b' };
const SPLIT_TARGETS = 20;   // how many likely answers "Test new letters" tries to tell apart
const COMMON_WORDS = 5000;  // suggested start pairs come from the most common words
const LETTER_BASE = 3000;   // letter counts for start pairs use this many most likely answers
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', '+ZXCVBNM-'];

const $ = (id) => document.getElementById(id);

let allWords = [];          // every valid word, most common first
let freq = new Map();       // word -> frequency
let pastAnswers = new Set();
let startPairs = [];        // the Best start pairs currently shown

let state = {
  guesses: [],              // [{ word, pattern }]
  input: '',
  pattern: 'bbbbb',
  excludePast: false,
  partner: null,            // other half of the start pair, after guessing one of its words
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

/** Fix a colour in a guess that was already entered. */
function cycleGuessTile(row, i) {
  const g = state.guesses[row];
  g.pattern = g.pattern.slice(0, i) + NEXT[g.pattern[i]] + g.pattern.slice(i + 1);
  update();
}

function submit() {
  if (state.input.length < WORD_LENGTH) {
    flash('Enter all five letters first.');
    return;
  }
  if (!state.guesses.length) {
    const pair = startPairs.find((p) => p.words.includes(state.input));
    state.partner = pair ? pair.words.find((w) => w !== state.input) : null;
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
  state = { ...state, guesses: [], input: '', pattern: 'bbbbb', partner: null };
  update();
}

let flashTimer;
function flash(text) {
  $('message').textContent = text;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(render, 2500);
}

// ---------------------------------------------------------------- rendering

function tile(letter, status, onClick) {
  const el = document.createElement(letter && onClick ? 'button' : 'div');
  el.className = 'tile';
  el.textContent = letter || '';
  if (letter) el.classList.add('filled', `s-${status}`);
  if (letter && onClick) {
    el.type = 'button';
    el.classList.add('editable');
    el.setAttribute('aria-label', `${letter}, ${statusName(status)}. Tap to change.`);
    el.title = 'Click to change the colour';
    el.addEventListener('click', onClick);
  }
  return el;
}

function statusName(s) {
  return { g: 'correct spot', y: 'wrong spot', b: 'not in word' }[s];
}

function renderBoard(solved) {
  const board = $('board');
  board.replaceChildren();
  const rows = state.guesses.map((g, r) => ({ ...g, onClick: (i) => () => cycleGuessTile(r, i) }));
  if (!solved) rows.push({ word: state.input, pattern: state.pattern, current: true, onClick: (i) => () => cycleTile(i) });
  while (rows.length < MIN_ROWS) rows.push({ word: '', pattern: 'bbbbb' });

  for (const row of rows) {
    const el = document.createElement('div');
    el.className = 'row' + (row.current ? ' current' : '');
    el.setAttribute('role', 'row');
    for (let i = 0; i < WORD_LENGTH; i++) {
      el.append(tile(row.word[i], row.pattern[i], row.onClick?.(i)));
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

  renderStart(candidates);
  renderNext(candidates, solved);

  const likely = topByFrequency(candidates, freq, 20);
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

/** Before the first guess: pairs of words that together test the 10 most useful letters. */
function renderStart(candidates) {
  const panel = $('start-panel');
  panel.hidden = state.guesses.length > 0;
  if (panel.hidden) return;
  startPairs = bestPairs(allWords.slice(0, COMMON_WORDS), letterWeights(candidates), new Set(), 3);
  $('start').replaceChildren(...startPairs.map(pairItem));
}

// Scoring every valid guess against the targets takes a moment, so cache it per set of clues.
let splitCache = { key: null, value: [] };

/** After a guess: the other start word, then the guesses that rule out the most likely answers. */
function renderNext(candidates, solved) {
  const panel = $('next-panel');
  panel.hidden = solved || !state.guesses.length || candidates.length < 3;
  if (panel.hidden) return;

  const targets = topByFrequency(candidates, freq, SPLIT_TARGETS);
  const key = targets.join();
  if (splitCache.key !== key) splitCache = { key, value: bestSplitters(allWords, targets, 6) };

  const items = [];
  const partner = state.guesses.length === 1 ? state.partner : null;
  if (partner) {
    const li = wordItem(partner, '2nd start word');
    li.querySelector('.word').classList.add('partner');
    items.push(li);
  }
  for (const s of splitCache.value) {
    if (s.word === partner || items.length >= (partner ? 5 : 6)) continue;   // the partner takes two cells
    const li = wordItem(s.word, s.worst === 1 ? 'solves it' : '');
    if (s.isTarget) li.querySelector('.word').classList.add('could-win');
    items.push(li);
  }
  $('next').replaceChildren(...items);
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
  $('enter').hidden = solved;
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
  $('enter').addEventListener('click', submit);
  $('undo').addEventListener('click', undo);
  $('reset').addEventListener('click', reset);
  $('exclude-past').addEventListener('change', (e) => {
    state.excludePast = e.target.checked;
    update();
  });
  render();
}

init();

/**
 * Wordle Solver - Main JavaScript Application
 * Handles UI interactions and API communication
 */

// Application State
const state = {
    rows: [],
    currentRow: 0,
    maxRows: 6,
    excludeOld: true,
    repeatMultiplier: 0.5
};

// Tile states
const TileState = {
    EMPTY: 'empty',
    EXCLUDED: 'excluded',
    WRONG_POSITION: 'wrong-position',
    LOCKED: 'locked'
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Initialize the application
 */
async function initializeApp() {
    setupEventListeners();
    createWordGrid();
    await initializeSolver();
    await loadStartingWords();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Analyze button
    document.getElementById('analyzeBtn').addEventListener('click', analyzeCurrent);

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetSolver);

    // Repeat multiplier slider
    const slider = document.getElementById('repeatMultiplier');
    const valueDisplay = document.getElementById('repeatMultiplierValue');
    slider.addEventListener('input', (e) => {
        state.repeatMultiplier = parseFloat(e.target.value);
        valueDisplay.textContent = e.target.value;
    });

    // Exclude old words checkbox
    document.getElementById('excludeOldWords').addEventListener('change', async (e) => {
        state.excludeOld = e.target.checked;
        await initializeSolver();
    });
}

/**
 * Create the word grid
 */
function createWordGrid() {
    const grid = document.getElementById('wordGrid');
    grid.innerHTML = '';

    for (let i = 0; i < state.maxRows; i++) {
        const row = createRow(i);
        grid.appendChild(row);
        state.rows.push({
            element: row,
            tiles: [],
            active: i === 0
        });
    }
}

/**
 * Create a single row of tiles
 */
function createRow(rowIndex) {
    const row = document.createElement('div');
    row.className = 'word-row';
    row.dataset.row = rowIndex;

    for (let i = 0; i < 5; i++) {
        const tile = createTile(rowIndex, i);
        row.appendChild(tile);
        state.rows[rowIndex].tiles.push(tile);
    }

    return row;
}

/**
 * Create a single tile
 */
function createTile(rowIndex, tileIndex) {
    const tile = document.createElement('div');
    tile.className = 'tile empty';
    tile.dataset.row = rowIndex;
    tile.dataset.tile = tileIndex;
    tile.dataset.state = TileState.EMPTY;

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 1;
    input.dataset.row = rowIndex;
    input.dataset.tile = tileIndex;

    // Input event handlers
    input.addEventListener('input', (e) => handleTileInput(e, rowIndex, tileIndex));
    input.addEventListener('keydown', (e) => handleTileKeydown(e, rowIndex, tileIndex));

    // Click to cycle state
    tile.addEventListener('click', () => cycleTileState(tile));

    tile.appendChild(input);
    return tile;
}

/**
 * Handle tile input
 */
function handleTileInput(e, rowIndex, tileIndex) {
    const value = e.target.value.toUpperCase();
    e.target.value = value;

    if (value && tileIndex < 4) {
        // Move to next tile
        const nextInput = document.querySelector(
            `input[data-row="${rowIndex}"][data-tile="${tileIndex + 1}"]`
        );
        if (nextInput) nextInput.focus();
    }

    // Update tile state
    const tile = e.target.parentElement;
    if (value) {
        tile.classList.remove('empty');
    } else {
        tile.classList.add('empty');
    }
}

/**
 * Handle keyboard navigation
 */
function handleTileKeydown(e, rowIndex, tileIndex) {
    if (e.key === 'Backspace' && !e.target.value && tileIndex > 0) {
        // Move to previous tile
        const prevInput = document.querySelector(
            `input[data-row="${rowIndex}"][data-tile="${tileIndex - 1}"]`
        );
        if (prevInput) prevInput.focus();
    } else if (e.key === 'ArrowLeft' && tileIndex > 0) {
        const prevInput = document.querySelector(
            `input[data-row="${rowIndex}"][data-tile="${tileIndex - 1}"]`
        );
        if (prevInput) prevInput.focus();
    } else if (e.key === 'ArrowRight' && tileIndex < 4) {
        const nextInput = document.querySelector(
            `input[data-row="${rowIndex}"][data-tile="${tileIndex + 1}"]`
        );
        if (nextInput) nextInput.focus();
    } else if (e.key === 'Enter') {
        analyzeCurrent();
    }
}

/**
 * Cycle through tile states (empty -> excluded -> wrong-position -> locked -> excluded...)
 */
function cycleTileState(tile) {
    const input = tile.querySelector('input');
    if (!input.value) return; // Don't cycle empty tiles

    const currentState = tile.dataset.state;
    let nextState;

    switch (currentState) {
        case TileState.EMPTY:
        case TileState.EXCLUDED:
            nextState = TileState.WRONG_POSITION;
            break;
        case TileState.WRONG_POSITION:
            nextState = TileState.LOCKED;
            break;
        case TileState.LOCKED:
            nextState = TileState.EXCLUDED;
            break;
        default:
            nextState = TileState.EXCLUDED;
    }

    // Update tile
    tile.dataset.state = nextState;
    tile.className = `tile ${nextState}`;
}

/**
 * Get current game state from all rows
 */
function getGameState() {
    const locked = {};
    const wrongPosition = {};
    const excluded = [];
    const allLetters = new Set();

    state.rows.forEach((row) => {
        row.tiles.forEach((tile, index) => {
            const input = tile.querySelector('input');
            const letter = input.value.toUpperCase();
            const tileState = tile.dataset.state;
            const position = index + 1;

            if (!letter) return;

            allLetters.add(letter);

            switch (tileState) {
                case TileState.LOCKED:
                    locked[position] = letter;
                    break;
                case TileState.WRONG_POSITION:
                    wrongPosition[position] = letter;
                    break;
                case TileState.EXCLUDED:
                    // Only add to excluded if not in locked or wrong position
                    if (!Object.values(locked).includes(letter) &&
                        !Object.values(wrongPosition).includes(letter)) {
                        if (!excluded.includes(letter)) {
                            excluded.push(letter);
                        }
                    }
                    break;
            }
        });
    });

    return {
        locked,
        wrong_position: wrongPosition,
        excluded,
        repeat_multiplier: state.repeatMultiplier
    };
}

/**
 * Initialize the solver
 */
async function initializeSolver() {
    showLoading(true);

    try {
        const response = await fetch('/api/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exclude_old: state.excludeOld })
        });

        const data = await response.json();

        if (data.success) {
            updateWordCount(data.word_count);
            showToast(data.message, 'success');
        } else {
            showToast('Error initializing solver: ' + data.error, 'error');
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Load best starting words
 */
async function loadStartingWords() {
    const container = document.getElementById('startingWords');
    container.innerHTML = '<div class="loading">Loading...</div>';

    try {
        const response = await fetch('/api/starting-words');
        const data = await response.json();

        if (data.success && data.starting_words.length > 0) {
            container.innerHTML = '';
            data.starting_words.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'starting-word-item';
                div.innerHTML = `
                    <span class="starting-word-text">${item.word}</span>
                    <span class="starting-word-score">Score: ${item.score.toFixed(0)}</span>
                `;
                div.addEventListener('click', () => fillWord(item.word, 0));
                container.appendChild(div);
            });
        } else {
            container.innerHTML = '<div class="empty-state"><p>No starting words available</p></div>';
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state"><p>Error loading starting words</p></div>';
    }
}

/**
 * Fill a word into a specific row
 */
function fillWord(word, rowIndex) {
    const row = state.rows[rowIndex];
    if (!row) return;

    word = word.toUpperCase();
    row.tiles.forEach((tile, index) => {
        const input = tile.querySelector('input');
        if (index < word.length) {
            input.value = word[index];
            tile.classList.remove('empty');
        }
    });

    showToast(`Filled "${word}" in row ${rowIndex + 1}`, 'success');
}

/**
 * Analyze current state and get recommendations
 */
async function analyzeCurrent() {
    const gameState = getGameState();

    // Check if there's any input
    const hasInput = Object.keys(gameState.locked).length > 0 ||
                     Object.keys(gameState.wrong_position).length > 0 ||
                     gameState.excluded.length > 0;

    if (!hasInput) {
        showToast('Please enter at least one letter and set its state', 'error');
        return;
    }

    showLoading(true);

    try {
        const response = await fetch('/api/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gameState)
        });

        const data = await response.json();

        if (data.success) {
            updateWordCount(data.word_count);
            displayRecommendations(data.recommendations);
            displayLetterFrequency(data.letter_frequency);
            showToast(`Found ${data.word_count} possible words`, 'success');
        } else {
            showToast('Error: ' + data.error, 'error');
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Display recommendations
 */
function displayRecommendations(recommendations) {
    const container = document.getElementById('recommendations');

    if (!recommendations || recommendations.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No recommendations available</p></div>';
        return;
    }

    container.innerHTML = '';

    recommendations.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'recommendation-item';

        const badge = item.has_repeats
            ? '<span class="recommendation-badge">REPEATS</span>'
            : '';

        div.innerHTML = `
            <span class="recommendation-rank">${index + 1}</span>
            <span class="recommendation-word">${item.word}</span>
            ${badge}
            <div class="recommendation-stats">
                <span class="recommendation-score">Score: ${item.score.toFixed(3)}</span>
                <span class="recommendation-freq">Freq: ${item.frequency}</span>
            </div>
        `;

        div.addEventListener('click', () => {
            copyToClipboard(item.word);
            showToast(`Copied "${item.word}" to clipboard`, 'success');
        });

        container.appendChild(div);
    });
}

/**
 * Display letter frequency
 */
function displayLetterFrequency(letterFreq) {
    const container = document.getElementById('letterFrequency');

    if (!letterFreq || letterFreq.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No frequency data available</p></div>';
        return;
    }

    container.innerHTML = '';

    letterFreq.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'letter-freq-item';
        div.innerHTML = `
            <span class="letter-freq-letter">${item.letter}</span>
            <span class="letter-freq-count">${item.frequency}</span>
        `;
        container.appendChild(div);
    });
}

/**
 * Reset solver
 */
async function resetSolver() {
    if (!confirm('Reset the solver? This will clear all your inputs.')) {
        return;
    }

    // Clear the grid
    state.rows.forEach(row => {
        row.tiles.forEach(tile => {
            const input = tile.querySelector('input');
            input.value = '';
            tile.className = 'tile empty';
            tile.dataset.state = TileState.EMPTY;
        });
    });

    // Clear recommendations
    document.getElementById('recommendations').innerHTML = `
        <div class="empty-state">
            <p>👆 Enter your guess and click "Analyze" to get word recommendations</p>
        </div>
    `;

    document.getElementById('letterFrequency').innerHTML = `
        <div class="empty-state">
            <p>Letter frequency will appear after analysis</p>
        </div>
    `;

    // Reinitialize
    await initializeSolver();

    showToast('Solver reset successfully', 'success');
}

/**
 * Update word count display
 */
function updateWordCount(count) {
    document.getElementById('wordCount').textContent = count.toLocaleString();
}

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
    } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

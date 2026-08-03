```javascript
const boardEl = document.getElementById("board");
const padEl = document.getElementById("colorPad");

const mistakesEl = document.getElementById("mistakes");
const hintsEl = document.getElementById("hints");
const timerEl = document.getElementById("timer");

let solved;
let puzzle;
let current;
let notes;

let selected = null;
let selectedColor = null;

let mistakes = 0;
let hintsRemaining = 3;

let undoStack = [];
let difficulty = "medium";
let noteMode = false;

let seconds = 0;
let timerInterval = null;

/* ===== TIMER ===== */

function startTimer() {
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    seconds++;
    updateTimer();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function updateTimer() {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainingSeconds = String(seconds % 60).padStart(2, "0");

  timerEl.innerText = `${minutes}:${remainingSeconds}`;
}

/* ===== STATUS ===== */

function updateStatus() {
  mistakesEl.innerText = `${mistakes}/3`;
  hintsEl.innerText = `Hints: ${hintsRemaining}`;
}

/* ===== UTILITIES ===== */

function shuffle(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[randomIndex]] = [
      copy[randomIndex],
      copy[i]
    ];
  }

  return copy;
}

function emptyNotes() {
  return Array.from(
    { length: 9 },
    () => Array.from(
      { length: 9 },
      () => new Set()
    )
  );
}

function snapshot() {
  undoStack.push({
    current: current.map(row => [...row]),
    notes: notes.map(row =>
      row.map(cell => [...cell])
    ),
    mistakes,
    hintsRemaining,
    selected: selected ? { ...selected } : null,
    selectedColor
  });
}

function restore(savedState) {
  current = savedState.current.map(row => [...row]);

  notes = savedState.notes.map(row =>
    row.map(cell => new Set(cell))
  );

  mistakes = savedState.mistakes;
  hintsRemaining = savedState.hintsRemaining;
  selected = savedState.selected
    ? { ...savedState.selected }
    : null;
  selectedColor = savedState.selectedColor;

  updateStatus();
}

/* ===== SUDOKU GENERATION ===== */

function isValid(board, row, col, number) {
  for (let i = 0; i < 9; i++) {
    if (
      board[row][i] === number ||
      board[i][col] === number
    ) {
      return false;
    }
  }

  const boxStartRow = Math.floor(row / 3) * 3;
  const boxStartCol = Math.floor(col / 3) * 3;

  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      if (
        board[boxStartRow + boxRow][boxStartCol + boxCol] === number
      ) {
        return false;
      }
    }
  }

  return true;
}

function solve(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== 0) {
        continue;
      }

      const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

      for (const number of numbers) {
        if (!isValid(board, row, col, number)) {
          continue;
        }

        board[row][col] = number;

        if (solve(board)) {
          return true;
        }

        board[row][col] = 0;
      }

      return false;
    }
  }

  return true;
}

function generateSolvedBoard() {
  const board = Array.from(
    { length: 9 },
    () => Array(9).fill(0)
  );

  solve(board);

  return board;
}

function createPuzzle() {
  solved = generateSolvedBoard();
  puzzle = solved.map(row => [...row]);

  const removalCount = {
    easy: 30,
    medium: 45,
    hard: 50
  };

  let cellsToRemove = removalCount[difficulty];

  while (cellsToRemove > 0) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);

    if (puzzle[row][col] !== 0) {
      puzzle[row][col] = 0;
      cellsToRemove--;
    }
  }

  current = puzzle.map(row => [...row]);
  notes = emptyNotes();
}

/* ===== GAME ACTIONS ===== */

function clickCell(row, col) {
  selected = { r: row, c: col };

  if (current[row][col] !== 0) {
    selectedColor = current[row][col];
  }

  render();
}

function place() {
  if (!selected || !selectedColor) {
    return;
  }

  const { r, c } = selected;

  if (puzzle[r][c] !== 0) {
    return;
  }

  if (current[r][c] !== 0) {
    return;
  }

  if (noteMode) {
    toggleNote(r, c, selectedColor);
    return;
  }

  snapshot();

  if (solved[r][c] === selectedColor) {
    current[r][c] = selectedColor;
    notes[r][c].clear();

    removeRelatedNotes(r, c, selectedColor);

    render();

    if (isBoardComplete()) {
      showCompleted();
    }

    return;
  }

  mistakes++;
  updateStatus();

  const cellIndex = r * 9 + c;
  const selectedCell = boardEl.children[cellIndex];

  if (selectedCell) {
    selectedCell.classList.add("flash");
  }

  if (mistakes >= 3) {
    showGameOver();
  }
}

function toggleNote(row, col, color) {
  if (current[row][col] !== 0) {
    return;
  }

  snapshot();

  if (notes[row][col].has(color)) {
    notes[row][col].delete(color);
  } else {
    notes[row][col].add(color);
  }

  render();
}

function removeRelatedNotes(row, col, color) {
  for (let i = 0; i < 9; i++) {
    notes[row][i].delete(color);
    notes[i][col].delete(color);
  }

  const boxStartRow = Math.floor(row / 3) * 3;
  const boxStartCol = Math.floor(col / 3) * 3;

  for (
    let currentRow = boxStartRow;
    currentRow < boxStartRow + 3;
    currentRow++
  ) {
    for (
      let currentCol = boxStartCol;
      currentCol < boxStartCol + 3;
      currentCol++
    ) {
      notes[currentRow][currentCol].delete(color);
    }
  }
}

function useHint() {
  if (hintsRemaining <= 0) {
    return;
  }

  let hintCell = null;

  /*
   Use the selected cell when it is an editable,
   currently empty cell.
  */
  if (
    selected &&
    puzzle[selected.r][selected.c] === 0 &&
    current[selected.r][selected.c] === 0
  ) {
    hintCell = {
      r: selected.r,
      c: selected.c
    };
  }

  /*
   Otherwise choose a random empty editable cell.
  */
  if (!hintCell) {
    const emptyCells = [];

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (
          puzzle[row][col] === 0 &&
          current[row][col] === 0
        ) {
          emptyCells.push({
            r: row,
            c: col
          });
        }
      }
    }

    if (emptyCells.length === 0) {
      return;
    }

    hintCell =
      emptyCells[
        Math.floor(Math.random() * emptyCells.length)
      ];
  }

  snapshot();

  const { r, c } = hintCell;
  const correctColor = solved[r][c];

  current[r][c] = correctColor;
  notes[r][c].clear();

  removeRelatedNotes(r, c, correctColor);

  selected = { r, c };
  selectedColor = correctColor;

  hintsRemaining--;
  updateStatus();
  render();

  if (isBoardComplete()) {
    showCompleted();
  }
}

function undo() {
  if (undoStack.length === 0) {
    return;
  }

  const savedState = undoStack.pop();

  restore(savedState);
  render();
}

function erase() {
  if (!selected) {
    return;
  }

  const { r, c } = selected;

  if (puzzle[r][c] !== 0) {
    return;
  }

  if (
    current[r][c] === 0 &&
    notes[r][c].size === 0
  ) {
    return;
  }

  snapshot();

  current[r][c] = 0;
  notes[r][c].clear();

  render();
}

function isBoardComplete() {
  return current.every((row, rowIndex) =>
    row.every(
      (value, colIndex) =>
        value === solved[rowIndex][colIndex]
    )
  );
}

/* ===== GAME RESULT ===== */

function showCompleted() {
  stopTimer();

  const overlay = document.getElementById("overlay");
  const overlayText = document.getElementById("overlayText");

  overlay.classList.remove("hidden");

  overlayText.innerText =
    `Completed 🎉\n` +
    `Time: ${timerEl.innerText}\n` +
    `Mistakes: ${mistakes}/3`;
}

function showGameOver() {
  stopTimer();

  document
    .getElementById("overlay")
    .classList.remove("hidden");

  document.getElementById("overlayText").innerText =
    "Game Over";
}

/* ===== RENDER BOARD ===== */

function render() {
  boardEl.innerHTML = "";

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement("div");

      cell.className = "cell";

      if (selected) {
        if (
          selected.r === row ||
          selected.c === col
        ) {
          cell.classList.add("highlight");
        }

        const selectedBoxRow =
          Math.floor(selected.r / 3) * 3;

        const selectedBoxCol =
          Math.floor(selected.c / 3) * 3;

        if (
          row >= selectedBoxRow &&
          row < selectedBoxRow + 3 &&
          col >= selectedBoxCol &&
          col < selectedBoxCol + 3
        ) {
          cell.classList.add("highlight");
        }

        if (
          selected.r === row &&
          selected.c === col
        ) {
          cell.classList.add("selected");
        }
      }

      const value = current[row][col];

      if (
        selectedColor &&
        value === selectedColor
      ) {
        cell.classList.add("same");
      }

      if (value !== 0) {
        const colorDot = document.createElement("div");

        colorDot.className = `color-dot c${value}`;

        cell.appendChild(colorDot);
      } else if (notes[row][col].size > 0) {
        const noteBox = document.createElement("div");

        noteBox.className = "note-grid";

        for (let number = 1; number <= 9; number++) {
          const noteSlot = document.createElement("div");

          noteSlot.className = "note-slot";

          if (notes[row][col].has(number)) {
            const noteDot = document.createElement("div");

            noteDot.className = `note-dot c${number}`;

            noteSlot.appendChild(noteDot);
          }

          noteBox.appendChild(noteSlot);
        }

        cell.appendChild(noteBox);
      }

      cell.onclick = () => clickCell(row, col);

      boardEl.appendChild(cell);
    }
  }

  updatePad();
}

/* ===== COLOR PAD ===== */

function updatePad() {
  padEl.innerHTML = "";

  const count = Array(10).fill(0);

  current.flat().forEach(value => {
    if (value !== 0) {
      count[value]++;
    }
  });

  for (let color = 1; color <= 9; color++) {
    const button = document.createElement("div");

    button.className = `color-btn c${color}`;

    if (selectedColor === color) {
      button.classList.add("selected-color");
    }

    const remaining = 9 - count[color];

    const badge = document.createElement("div");

    badge.className = "count";
    badge.innerText = remaining;

    button.appendChild(badge);

    if (remaining === 0) {
      button.classList.add("disabled");
    }

    button.onclick = () => {
      selectedColor = color;
      place();
      render();
    };

    padEl.appendChild(button);
  }
}

/* ===== NEW GAME ===== */

function startNewGame() {
  mistakes = 0;
  hintsRemaining = 3;

  selected = null;
  selectedColor = null;

  undoStack = [];
  noteMode = false;

  seconds = 0;

  document
    .getElementById("overlay")
    .classList.add("hidden");

  document
    .getElementById("noteBtn")
    .classList.remove("active");

  updateTimer();
  updateStatus();

  createPuzzle();
  render();
  startTimer();
}

/* ===== CONTROLS ===== */

document.getElementById("newGameBtn").onclick =
  startNewGame;

document.getElementById("undoBtn").onclick =
  undo;

document.getElementById("hintBtn").onclick =
  useHint;

document.getElementById("eraseBtn").onclick =
  erase;

document.getElementById("noteBtn").onclick = () => {
  noteMode = !noteMode;

  document
    .getElementById("noteBtn")
    .classList.toggle("active", noteMode);
};

document.getElementById("restartBtn").onclick =
  startNewGame;

/* ===== DIFFICULTY ===== */

document.querySelectorAll(".diff").forEach(button => {
  button.onclick = () => {
    document
      .querySelectorAll(".diff")
      .forEach(item =>
        item.classList.remove("active")
      );

    button.classList.add("active");

    difficulty = button.dataset.level;

    startNewGame();
  };
});

/* ===== START ===== */

startNewGame();
```

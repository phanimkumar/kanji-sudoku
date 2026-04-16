const boardElement = document.getElementById("board");

/* ================= SYMBOLS ================= */

const SYMBOLS = {
  1: "水", 2: "木", 3: "火",
  4: "山", 5: "空", 6: "月",
  7: "花", 8: "風", 9: "日"
};

const SYMBOL_MEANINGS = {
  1: "Water 💧",
  2: "Tree 🌳",
  3: "Fire 🔥",
  4: "Mountain ⛰️",
  5: "Sky ☁️",
  6: "Moon 🌙",
  7: "Flower 🌸",
  8: "Wind 🌬️",
  9: "Sun ☀️"
};

/* ================= STATE ================= */

let board = [];
let solution = [];
let fixedCells = [];
let selectedCell = null;
let gameOver = false;

let startTime = null;
let elapsedTime = 0;
let timerInterval = null;

let lives = 3;
const MAX_LIVES = 3;

const FREE_HINTS = 2;
let hintsUsed = 0;

/* ================= HELPERS ================= */

function deepCopyBoard(b) {
  return b.map(r => [...r]);
}

function updateLivesDisplay() {
  document.getElementById("lives").textContent = "❤️".repeat(lives);
}

function updateTimerDisplay() {
  const total = Math.floor(elapsedTime / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  document.getElementById("timer").textContent = `${m}:${s}`;
}

function updateHintsDisplay() {
  const el = document.getElementById("hints");
  if (!el) return;
  const remaining = Math.max(0, FREE_HINTS - hintsUsed);
  el.textContent = `Hints: ${remaining}`;
}

function startTimer() {
  clearInterval(timerInterval);
  startTime = Date.now();

  timerInterval = setInterval(() => {
    elapsedTime = Date.now() - startTime;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

/* ================= GENERATOR ================= */

function isValid(b, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (b[row][i] === num || b[i][col] === num) return false;
  }

  const sr = Math.floor(row / 3) * 3;
  const sc = Math.floor(col / 3) * 3;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (b[sr + r][sc + c] === num) return false;
    }
  }

  return true;
}

function solve(b) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (b[r][c] === 0) {
        for (let n = 1; n <= 9; n++) {
          if (isValid(b, r, c, n)) {
            b[r][c] = n;
            if (solve(b)) return true;
            b[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generateSolvedBoard() {
  const b = Array.from({ length: 9 }, () => Array(9).fill(0));
  solve(b);
  return b;
}

function createPuzzle(sol, clues) {
  const puzzle = deepCopyBoard(sol);
  let remove = 81 - clues;

  while (remove > 0) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);

    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      remove--;
    }
  }

  return puzzle;
}

function getClues(level) {
  return level === "easy" ? 40 : level === "hard" ? 26 : 32;
}

/* ================= RENDER ================= */

function renderBoard() {
  boardElement.innerHTML = "";

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = r;
      cell.dataset.col = c;

      const val = board[r][c];

      if (val !== 0) {
        cell.textContent = SYMBOLS[val];
      }

      if (selectedCell) {
        if (r === selectedCell.row && c === selectedCell.col) {
          cell.classList.add("selected");
        } else if (r === selectedCell.row || c === selectedCell.col) {
          cell.classList.add("same-value");
        }
      }

      if (fixedCells[r][c]) {
        cell.classList.add("fixed");
      }

      boardElement.appendChild(cell);
    }
  }

  // 🔥 Meaning always synced from state
  if (selectedCell) {
    const value =
      board[selectedCell.row][selectedCell.col] ||
      solution[selectedCell.row][selectedCell.col];

    showSymbolMeaning(value);
  } else {
    showSymbolMeaning(0);
  }
}

/* ================= BOARD CLICK ================= */

boardElement.addEventListener("click", (e) => {
  const cell = e.target.closest(".cell");
  if (!cell || gameOver) return;

  selectedCell = {
    row: Number(cell.dataset.row),
    col: Number(cell.dataset.col)
  };

  renderBoard();
});

/* ================= NUMPAD ================= */

function createNumpad() {
  const numpad = document.getElementById("numpad");
  numpad.innerHTML = "";

  for (let i = 1; i <= 9; i++) {
    const btn = document.createElement("button");
    btn.className = "num-btn";
    btn.textContent = SYMBOLS[i];

    btn.onclick = () => {
      if (!selectedCell || gameOver) return;

      const { row, col } = selectedCell;
      if (fixedCells[row][col]) return;

      board[row][col] = i;

      if (solution[row][col] !== i) {
        lives--;
        updateLivesDisplay();
        highlightError(row, col);

        if (lives <= 0) {
          gameOver = true;
          stopTimer();
          alert("Game Over");
        }
      } else if (isBoardComplete()) {
        gameOver = true;
        stopTimer();
        alert("You Win!");
      }

      renderBoard();
    };

    numpad.appendChild(btn);
  }

  const clearBtn = document.createElement("button");
  clearBtn.className = "num-btn";
  clearBtn.textContent = "X";

  clearBtn.onclick = () => {
    if (!selectedCell || gameOver) return;

    const { row, col } = selectedCell;
    if (fixedCells[row][col]) return;

    board[row][col] = 0;
    renderBoard();
  };

  numpad.appendChild(clearBtn);
}

/* ================= UTIL ================= */

function showSymbolMeaning(value) {
  const el = document.getElementById("symbol-meaning");
  if (!el) return;

  if (!value || !SYMBOLS[value]) {
    el.textContent = "Select a symbol";
    return;
  }

  el.textContent = `${SYMBOLS[value]} = ${SYMBOL_MEANINGS[value]}`;
}

function highlightError(row, col) {
  const index = row * 9 + col;
  const cell = boardElement.children[index];
  if (!cell) return;

  cell.classList.add("conflict");
  setTimeout(() => cell.classList.remove("conflict"), 400);
}

function isBoardComplete() {
  return board.every((r, i) =>
    r.every((c, j) => c === solution[i][j])
  );
}

/* ================= INIT ================= */

function newGame(level = "medium") {
  solution = generateSolvedBoard();
  board = createPuzzle(solution, getClues(level));

  fixedCells = board.map(r => r.map(v => v !== 0));

  lives = MAX_LIVES;
  hintsUsed = 0;
  selectedCell = null;
  gameOver = false;
  elapsedTime = 0;

  startTimer();
  updateTimerDisplay();
  updateLivesDisplay();
  updateHintsDisplay();
  showSymbolMeaning(0);

  renderBoard();
  createNumpad();
}

document.addEventListener("DOMContentLoaded", () => {
  const newBtn = document.getElementById("new-game-btn");
  const difficulty = document.getElementById("difficulty");

  if (newBtn) newBtn.onclick = () => newGame(difficulty.value);
  if (difficulty) difficulty.onchange = (e) => newGame(e.target.value);

  newGame();
});

const boardElement = document.getElementById("board");

/* ================= SYMBOLS ================= */

const symbols = typeof SYMBOLS !== "undefined"
  ? SYMBOLS
  : ["水","木","火","山","空","月","日","花","風"];

const SYMBOL_MEANINGS = {
  1: "Symbol 1",
  2: "Symbol 2",
  3: "Symbol 3",
  4: "Symbol 4",
  5: "Symbol 5",
  6: "Symbol 6",
  7: "Symbol 7",
  8: "Symbol 8",
  9: "Symbol 9"
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

let notesMode = false;

/* ================= HELPERS ================= */

function deepCopyBoard(b) {
  return b.map(r => [...r]);
}

function shuffle(arr) {
  const copy = [...arr];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function updateLivesDisplay() {
  const el = document.getElementById("lives");

  if (el) {
    el.textContent = "❤️".repeat(lives);
  }
}

function updateTimerDisplay() {
  const total = Math.floor(elapsedTime / 1000);

  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");

  const el = document.getElementById("timer");

  if (el) {
    el.textContent = `${m}:${s}`;
  }
}

function updateHintsDisplay() {
  const el = document.getElementById("hints");

  if (!el) return;

  const remaining = Math.max(0, FREE_HINTS - hintsUsed);

  el.textContent = `Hints: ${remaining}`;
}

function showSymbolMeaning(value) {
  const el = document.getElementById("symbol-meaning");

  if (!el) return;

  if (!value || !symbols[value - 1]) {
    el.innerHTML = "Select a symbol";
    return;
  }

  el.innerHTML = `
    <span style="font-size:18px;margin-right:6px;">
      ${symbols[value - 1]}
    </span>
  `;
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
    if (i !== col && b[row][i] === num) return false;
    if (i !== row && b[i][col] === num) return false;
  }

  const sr = Math.floor(row / 3) * 3;
  const sc = Math.floor(col / 3) * 3;

  for (let r = sr; r < sr + 3; r++) {
    for (let c = sc; c < sc + 3; c++) {
      if ((r !== row || c !== col) && b[r][c] === num) {
        return false;
      }
    }
  }

  return true;
}

function solve(b) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (b[r][c] === 0) {

        const nums = shuffle([1,2,3,4,5,6,7,8,9]);

        for (const n of nums) {
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
  return level === "easy"
    ? 40
    : level === "hard"
    ? 26
    : 32;
}

/* ================= BOARD ================= */

function renderBoard() {
  boardElement.innerHTML = "";

  const selectedValue =
    selectedCell
      ? board[selectedCell.row][selectedCell.col]
      : 0;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {

      const cell = document.createElement("div");

      cell.className = "cell";

      cell.dataset.row = r;
      cell.dataset.col = c;

      const val = board[r][c];

      if (val !== 0) {
        cell.textContent = symbols[val - 1];
      }

      if (selectedCell) {

        if (r === selectedCell.row &&
            c === selectedCell.col) {

          cell.classList.add("selected");

        } else if (
          r === selectedCell.row ||
          c === selectedCell.col
        ) {

          cell.classList.add("same-value");
        }

        if (selectedValue !== 0 &&
            val === selectedValue) {

          cell.classList.add("symbol-match");
        }
      }

      if (fixedCells[r][c]) {
        cell.classList.add("fixed");
      }

      boardElement.appendChild(cell);
    }
  }
}

/* ================= SELECT CELL ================= */

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

  if (!numpad) return;

  numpad.innerHTML = "";

  for (let i = 1; i <= 9; i++) {

    const btn = document.createElement("button");

    btn.className = "num-btn";

    btn.textContent = symbols[i - 1];

    btn.onclick = () => {

      if (!selectedCell || gameOver) return;

      const { row, col } = selectedCell;

      if (fixedCells[row][col]) return;

      board[row][col] = i;

      if (solution[row][col] !== i) {

        lives--;

        updateLivesDisplay();

        if (lives <= 0) {

          gameOver = true;

          stopTimer();

          alert("Game Over");
        }

        renderBoard();

        return;
      }

      renderBoard();

      if (isBoardComplete()) {

        gameOver = true;

        stopTimer();

        alert("You Win!");
      }
    };

    numpad.appendChild(btn);
  }

  const clearBtn = document.createElement("button");

  clearBtn.className = "num-btn";

  clearBtn.textContent = "⌫";

  clearBtn.onclick = () => {

    if (!selectedCell || gameOver) return;

    const { row, col } = selectedCell;

    if (fixedCells[row][col]) return;

    board[row][col] = 0;

    renderBoard();
  };

  numpad.appendChild(clearBtn);
}

/* ================= CHECK ================= */

function isBoardComplete() {

  return board.every((row, r) =>
    row.every((val, c) =>
      val === solution[r][c]
    )
  );
}

/* ================= NEW GAME ================= */

function newGame(level = "medium") {

  solution = generateSolvedBoard();

  board = createPuzzle(
    solution,
    getClues(level)
  );

  fixedCells = board.map(r =>
    r.map(v => v !== 0)
  );

  lives = MAX_LIVES;

  hintsUsed = 0;

  selectedCell = null;

  gameOver = false;

  elapsedTime = 0;

  startTimer();

  updateTimerDisplay();

  updateLivesDisplay();

  updateHintsDisplay();

  renderBoard();

  createNumpad();
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {

  const newBtn =
    document.getElementById("new-game-btn");

  const difficulty =
    document.getElementById("difficulty");

  if (newBtn) {

    newBtn.onclick = () =>
      newGame(
        difficulty
          ? difficulty.value
          : "medium"
      );
  }

  if (difficulty) {

    difficulty.onchange = (e) =>
      newGame(e.target.value);
  }

  newGame();
});

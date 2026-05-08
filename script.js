const boardElement = document.getElementById("board");

/* ================= SYMBOLS ================= */

const symbols = typeof SYMBOLS !== "undefined"
  ? SYMBOLS
  : ["水","木","火","山","空","月","日","花","風"];

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

/* ================= VALIDATION ================= */

function isValid(b, row, col, num) {

  for (let i = 0; i < 9; i++) {

    if (b[row][i] === num && i !== col) {
      return false;
    }

    if (b[i][col] === num && i !== row) {
      return false;
    }
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {

      if (
        b[r][c] === num &&
        (r !== row || c !== col)
      ) {
        return false;
      }
    }
  }

  return true;
}

/* ================= SOLVER ================= */

function solve(b) {

  for (let r = 0; r < 9; r++) {

    for (let c = 0; c < 9; c++) {

      if (b[r][c] === 0) {

        const nums = shuffle([1,2,3,4,5,6,7,8,9]);

        for (const n of nums) {

          if (isValid(b, r, c, n)) {

            b[r][c] = n;

            if (solve(b)) {
              return true;
            }

            b[r][c] = 0;
          }
        }

        return false;
      }
    }
  }

  return true;
}

/* ================= GENERATION ================= */

function generateSolvedBoard() {

  const b = Array.from(
    { length: 9 },
    () => Array(9).fill(0)
  );

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

  if (level === "easy") return 40;

  if (level === "hard") return 26;

  return 32;
}

/* ================= BOARD ================= */

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
        cell.textContent = symbols[val - 1];
      }

      if (
        selectedCell &&
        selectedCell.row === r &&
        selectedCell.col === c
      ) {
        cell.classList.add("selected");
      }

      if (fixedCells[r][c]) {
        cell.classList.add("fixed");
      }

      cell.addEventListener("click", () => {

        if (gameOver) return;

        selectedCell = { row: r, col: c };

        renderBoard();
      });

      boardElement.appendChild(cell);
    }
  }
}

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

      } else {

        if (isBoardComplete()) {

          gameOver = true;

          stopTimer();

          alert("You Win!");
        }
      }

      renderBoard();
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

/* ================= COMPLETE ================= */

function isBoardComplete() {

  for (let r = 0; r < 9; r++) {

    for (let c = 0; c < 9; c++) {

      if (board[r][c] !== solution[r][c]) {
        return false;
      }
    }
  }

  return true;
}

/* ================= NEW GAME ================= */

function newGame(level = "medium") {

  solution = generateSolvedBoard();

  board = createPuzzle(
    solution,
    getClues(level)
  );

  fixedCells = board.map(row =>
    row.map(v => v !== 0)
  );

  selectedCell = null;

  gameOver = false;

  lives = MAX_LIVES;

  hintsUsed = 0;

  elapsedTime = 0;

  updateLivesDisplay();

  updateHintsDisplay();

  updateTimerDisplay();

  startTimer();

  renderBoard();

  createNumpad();
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {

  const difficulty =
    document.getElementById("difficulty");

  const newBtn =
    document.getElementById("new-game-btn");

  if (newBtn) {

    newBtn.onclick = () => {

      const level =
        difficulty
          ? difficulty.value
          : "medium";

      newGame(level);
    };
  }

  if (difficulty) {

    difficulty.onchange = (e) => {
      newGame(e.target.value);
    };
  }

  newGame();
});

const boardElement = document.getElementById("board");

/* ================= SYMBOLS ================= */

const SYMBOLS = {
  1: "水", 2: "木", 3: "火",
  4: "山", 5: "空", 6: "月",
  7: "花", 8: "風", 9: "日"
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

/* ================= HELPERS ================= */

function deepCopyBoard(b) {
  return b.map(r => [...r]);
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
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
  startTime = Date.now() - elapsedTime;

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
    if (b[row][i] === num && i !== col) return false;
    if (b[i][col] === num && i !== row) return false;
  }

  const sr = Math.floor(row / 3) * 3;
  const sc = Math.floor(col / 3) * 3;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const rr = sr + r;
      const cc = sc + c;
      if (b[rr][cc] === num && (rr !== row || cc !== col)) return false;
    }
  }

  return true;
}

/* ================= GENERATOR ================= */

function solve(b) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (b[r][c] === 0) {
        for (const n of shuffle([1,2,3,4,5,6,7,8,9])) {
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

      const val = board[r][c];

      if (val !== 0) {
        cell.textContent = SYMBOLS[val];
      }

      cell.onclick = () => {
  if (gameOver) return;

  selectedCell = { row: r, col: c };

  showSymbolMeaning(board[r][c]);

  renderBoard();
};

      if (fixedCells[r][c]) cell.classList.add("fixed");

      if (selectedCell?.row === r && selectedCell?.col === c) {
        cell.classList.add("selected");
      }

      boardElement.appendChild(cell);
    }
  }
}

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

        if (lives <= 0) {
          gameOver = true;
          stopTimer();
          alert("Game Over");
        }
      } else {
        if (isBoardComplete()) {
          gameOver = true;
          stopTimer();
          showWin();
        }
      }

      renderBoard();
    };

    numpad.appendChild(btn);
  }
}

/* ================= HINT ================= */

function findHintTarget() {
  if (selectedCell && !fixedCells[selectedCell.row][selectedCell.col]) {
    return selectedCell;
  }

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!fixedCells[r][c] && board[r][c] === 0) {
        return { row: r, col: c };
      }
    }
  }
}

function applyHint(target) {
  const { row, col } = target;
  board[row][col] = solution[row][col];
  selectedCell = { row, col };
  renderBoard();
}

function handleHintRequest() {
  if (gameOver) return;

  const target = findHintTarget();
  if (!target) return;

  if (hintsUsed < FREE_HINTS) {
    hintsUsed++;
    applyHint(target);
    updateHintsDisplay();
    return;
  }

  simulateAd(() => {
    applyHint(target);
  });
}

/* ================= AD ================= */

function simulateAd(callback) {
  if (typeof callback !== "function") return;

  const overlay = document.getElementById("ad-overlay");
  if (!overlay) return;

  overlay.classList.add("show");

  setTimeout(() => {
    overlay.classList.remove("show");
    callback();
  }, 2000);
}

/* ================= WIN ================= */

function showWin() {
  const overlay = document.getElementById("win-overlay");
  const timeEl = document.getElementById("final-time");

  if (!overlay || !timeEl) return;

  const total = Math.floor(elapsedTime / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");

  timeEl.textContent = `Time: ${m}:${s}`;
  overlay.classList.add("show");
}

function isBoardComplete() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

/* ================= GAME ================= */

function newGame(level = "medium") {
  solution = generateSolvedBoard();
  board = createPuzzle(solution, getClues(level));

  fixedCells = board.map(r => r.map(v => v !== 0));
  selectedCell = null;
  gameOver = false;
  lives = MAX_LIVES;
  hintsUsed = 0;
  elapsedTime = 0;

  startTimer();
  updateTimerDisplay();
  updateLivesDisplay();
  updateHintsDisplay();

  renderBoard();
  createNumpad();
}

/* ================= EVENTS ================= */

document.addEventListener("DOMContentLoaded", () => {
  const hintBtn = document.getElementById("hint-btn");
  const newBtn = document.getElementById("new-game-btn");
  const difficulty = document.getElementById("difficulty");

  hintBtn.onclick = handleHintRequest;

  newBtn.onclick = () => newGame(difficulty.value);

  difficulty.onchange = () => {
    if (confirm("Start new game?")) {
      newGame(difficulty.value);
    }
  };

  newGame();
});

function showSymbolMeaning(value) {
  const el = document.getElementById("symbol-meaning");
  if (!el) return;

  if (!value) {
    el.textContent = "Select a symbol";
    return;
  }

  el.textContent = `${SYMBOLS[value]} = ${SYMBOL_MEANINGS[value]}`;
}



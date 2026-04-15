const boardElement = document.getElementById("board");
const newGameBtn = document.getElementById("new-game-btn");

const SYMBOLS = {
  1: "水", 2: "木", 3: "火",
  4: "山", 5: "空", 6: "月",
  7: "花", 8: "風", 9: "日"
};

let board = [];
let selectedCell = null;
let fixedCells = [];
let solution = [];
let gameOver = false;

// TIMER
let startTime = null;
let elapsedTime = 0;
let timerInterval = null;

let lives = 3;
const MAX_LIVES = 3;

let hintsUsed = 0;
const FREE_HINTS = 2;

let lastHintDate = null;

// NOTES
let notesMode = false;
let notes = Array.from({ length: 9 }, () =>
  Array.from({ length: 9 }, () => new Set())
);

/* ================= BOARD ================= */

function renderBoard() {
  boardElement.innerHTML = "";

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      const value = board[row][col];

      // ✅ VALUE OR NOTES
      if (value !== 0) {
        cell.textContent = SYMBOLS[value];
      } else if (notes[row][col].size > 0) {
        cell.innerHTML = `<div class="notes">${
          [...notes[row][col]].map(n => SYMBOLS[n]).join("")
        }</div>`;
      } else {
        cell.textContent = "";
      }

      cell.addEventListener("click", () => {
        if (gameOver) return;
        selectedCell = { row, col };
        renderBoard();
      });

      if (fixedCells[row][col]) cell.classList.add("fixed");

      if (value !== 0 && !isValid(board, row, col, value)) {
        cell.classList.add("conflict");
      }

      if (selectedCell) {
        const selectedValue = board[selectedCell.row][selectedCell.col];

        if (selectedValue !== 0 && value === selectedValue) {
          cell.classList.add("same-value");
        }

        if (selectedCell.row === row && selectedCell.col === col) {
          cell.classList.add("selected");
        }
      }

      boardElement.appendChild(cell);
    }
  }
}

/* ================= DATE ================= */

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function checkDailyHintReset() {
  const today = getTodayDate();
  if (lastHintDate !== today) {
    hintsUsed = 0;
    lastHintDate = today;
    saveGame();
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

      // NOTES MODE
      if (notesMode) {
        const set = notes[row][col];
        set.has(i) ? set.delete(i) : set.add(i);
        renderBoard();
        return;
      }

      // NORMAL MODE
      board[row][col] = i;

      if (solution[row][col] !== i) {
        lives--;
        updateLivesDisplay();
        elapsedTime += 5000;

        if (lives <= 0) {
          gameOver = true;
          stopTimer();
          renderBoard();
          setTimeout(() => showGameOverOption(), 100);
          return;
        }
      } else {
        notes[row][col].clear(); // ✅ clear notes

        if (isBoardComplete()) {
          gameOver = true;
          selectedCell = null;
          stopTimer();
          renderBoard();
          setTimeout(() => alert("Game Completed!"), 100);
          return;
        }
      }

      saveGame();
      selectedCell = null;
      renderBoard();
    };

    numpad.appendChild(btn);
  }

  // CLEAR
  const clearBtn = document.createElement("button");
  clearBtn.className = "num-btn";
  clearBtn.textContent = "X";

  clearBtn.onclick = () => {
    if (!selectedCell || gameOver) return;

    const { row, col } = selectedCell;
    if (fixedCells[row][col]) return;

    board[row][col] = 0;
    notes[row][col].clear();

    saveGame();
    renderBoard();
  };

  numpad.appendChild(clearBtn);
}

/* ================= VALIDATION ================= */

function isValid(board, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num && i !== col) return false;
    if (board[i][col] === num && i !== row) return false;
  }

  const sr = Math.floor(row / 3) * 3;
  const sc = Math.floor(col / 3) * 3;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const rr = sr + r, cc = sc + c;
      if (board[rr][cc] === num && (rr !== row || cc !== col)) return false;
    }
  }

  return true;
}

/* ================= GENERATION ================= */

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function solve(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        for (let n of shuffle([1,2,3,4,5,6,7,8,9])) {
          if (isValid(board, r, c, n)) {
            board[r][c] = n;
            if (solve(board)) return true;
            board[r][c] = 0;
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

function createPuzzle(solution, clues) {
  let p = solution.map(r => [...r]);
  let cells = shuffle([...Array(81).keys()]);
  let remove = 81 - clues;

  for (let i = 0; i < cells.length && remove > 0; i++) {
    let r = Math.floor(cells[i] / 9);
    let c = cells[i] % 9;
    let backup = p[r][c];
    p[r][c] = 0;
    if (!solve(p.map(r => [...r]))) p[r][c] = backup;
    else remove--;
  }

  return p;
}

/* ================= TIMER ================= */

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

function updateTimerDisplay() {
  const s = Math.floor(elapsedTime / 1000);
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");

  document.getElementById("timer").textContent = `${m}:${sec}`;
}

/* ================= SAVE ================= */

function saveGame() {
  localStorage.setItem("kanjiSudoku", JSON.stringify({
    board, solution, fixedCells,
    elapsedTime, lives, hintsUsed, lastHintDate
  }));
}

/* ================= GAME ================= */

function newGame(level = "medium") {
  solution = generateSolvedBoard();
  board = createPuzzle(solution, 32);

  fixedCells = board.map(r => r.map(v => v !== 0));

  notes = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set())
  );

  lives = MAX_LIVES;
  hintsUsed = 0;
  lastHintDate = getTodayDate();

  elapsedTime = 0;
  startTimer();

  updateLivesDisplay();
  saveGame();

  renderBoard();
  createNumpad();
}

/* ================= HELPERS ================= */

function updateLivesDisplay() {
  document.getElementById("lives").textContent = "❤️".repeat(lives);
}

function showGameOverOption() {
  if (confirm("Game Over!\nWatch Ad to continue?")) revivePlayer();
}

function revivePlayer() {
  lives = 1;
  gameOver = false;
  startTimer();
  updateLivesDisplay();	
  renderBoard();
}

/* ================= NOTES TOGGLE ================= */

document.getElementById("notes-btn")?.addEventListener("click", () => {
  notesMode = !notesMode;
});

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  newGame();
});
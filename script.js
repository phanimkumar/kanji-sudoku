const boardElement = document.getElementById("board");

/* ================= SYMBOLS ================= */

const SYMBOLS = {
  1: "水",
  2: "木",
  3: "火",
  4: "山",
  5: "空",
  6: "月",
  7: "花",
  8: "風",
  9: "日"
};

/* ================= STATE ================= */

let board = [];
let solution = [];
let fixedCells = [];
let selectedCell = null;
let gameOver = false;

// timer
let startTime = null;
let elapsedTime = 0;
let timerInterval = null;

// lives
let lives = 3;
const MAX_LIVES = 3;

// hints
const FREE_HINTS = 2;
let hintsUsed = 0;

// notes
let notesMode = false;
let notes = createEmptyNotes();

/* ================= HELPERS ================= */

function createEmptyNotes() {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set())
  );
}

function deepCopyBoard(b) {
  return b.map(row => [...row]);
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function updateLivesDisplay() {
  const livesEl = document.getElementById("lives");
  if (livesEl) {
    livesEl.textContent = "❤️".repeat(lives);
  }
}

function updateTimerDisplay() {
  const timerEl = document.getElementById("timer");
  if (!timerEl) return;

  const totalSeconds = Math.floor(elapsedTime / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  timerEl.textContent = `${minutes}:${seconds}`;
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

function isBoardComplete() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

/* ================= VALIDATION ================= */

function isValid(b, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (b[row][i] === num && i !== col) return false;
    if (b[i][col] === num && i !== row) return false;
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const rr = startRow + r;
      const cc = startCol + c;
      if (b[rr][cc] === num && (rr !== row || cc !== col)) return false;
    }
  }

  return true;
}

/* ================= SOLVER / GENERATOR ================= */

function solve(b) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (b[r][c] === 0) {
        for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
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

function countSolutions(b) {
  let count = 0;

  function solveCount(temp) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (temp[r][c] === 0) {
          for (let n = 1; n <= 9; n++) {
            if (isValid(temp, r, c, n)) {
              temp[r][c] = n;
              solveCount(temp);
              temp[r][c] = 0;
            }
          }
          return;
        }
      }
    }
    count++;
  }

  solveCount(deepCopyBoard(b));
  return count;
}

function createPuzzle(sol, clues) {
  const puzzle = deepCopyBoard(sol);
  const cells = shuffle([...Array(81).keys()]);
  let remove = 81 - clues;

  for (let i = 0; i < cells.length && remove > 0; i++) {
    const r = Math.floor(cells[i] / 9);
    const c = cells[i] % 9;

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    if (countSolutions(puzzle) !== 1) {
      puzzle[r][c] = backup;
    } else {
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
  if (!boardElement) return;

  boardElement.innerHTML = "";

  if (!board.length) return;

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      const value = board[row][col];

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

      if (fixedCells[row]?.[col]) {
        cell.classList.add("fixed");
      }

      if (value !== 0 && !isValid(board, row, col, value)) {
        cell.classList.add("conflict");
      }

      if (selectedCell) {
        const selectedValue = board[selectedCell.row]?.[selectedCell.col];

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

/* ================= NUMPAD ================= */

function createNumpad() {
  const numpad = document.getElementById("numpad");
  if (!numpad) return;

  numpad.innerHTML = "";

  for (let i = 1; i <= 9; i++) {
    const btn = document.createElement("button");
    btn.className = "num-btn";
    btn.textContent = SYMBOLS[i];

    btn.addEventListener("click", () => {
      if (!selectedCell || gameOver) return;

      const { row, col } = selectedCell;
      if (fixedCells[row][col]) return;

      if (notesMode) {
        const set = notes[row][col];
        if (set.has(i)) {
          set.delete(i);
        } else {
          set.add(i);
        }
        renderBoard();
        return;
      }

      board[row][col] = i;

      if (solution[row][col] !== i) {
        lives--;
        updateLivesDisplay();
        elapsedTime += 5000;

        if (lives <= 0) {
          gameOver = true;
          stopTimer();
          saveGame();
          renderBoard();
          setTimeout(() => showGameOverOption(), 100);
          return;
        }
      } else {
        notes[row][col].clear();

        if (isBoardComplete()) {
          gameOver = true;
          stopTimer();
          saveGame();
          renderBoard();
          setTimeout(() => alert("Game Completed!"), 100);
          return;
        }
      }

      saveGame();
      selectedCell = null;
      renderBoard();
    });

    numpad.appendChild(btn);
  }

  const clearBtn = document.createElement("button");
  clearBtn.className = "num-btn";
  clearBtn.textContent = "X";

  clearBtn.addEventListener("click", () => {
    if (!selectedCell || gameOver) return;

    const { row, col } = selectedCell;
    if (fixedCells[row][col]) return;

    board[row][col] = 0;
    notes[row][col].clear();
    saveGame();
    renderBoard();
  });

  numpad.appendChild(clearBtn);
}

/* ================= HINTS ================= */

function findHintTarget() {
  if (selectedCell) {
    const { row, col } = selectedCell;
    if (!fixedCells[row][col] && board[row][col] !== solution[row][col]) {
      return { row, col };
    }
  }

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!fixedCells[r][c] && board[r][c] !== solution[r][c]) {
        return { row: r, col: c };
      }
    }
  }

  return null;
}

function applyHintToTarget(target) {
  if (!target) return;

  const { row, col } = target;
  board[row][col] = solution[row][col];
  notes[row][col].clear();

  selectedCell = { row, col };
  saveGame();
  renderBoard();

  if (isBoardComplete()) {
    gameOver = true;
    stopTimer();
    setTimeout(() => alert("Game Completed!"), 100);
  }
}

function handleHintRequest() {
  if (gameOver) return;

  const target = findHintTarget();
  if (!target) return;

  if (hintsUsed < FREE_HINTS) {
    hintsUsed++;
    applyHintToTarget(target);
    return;
  }

  const watchAd = confirm("No free hints left.\nWatch Ad for 1 extra hint?");
  if (!watchAd) return;

  simulateAd(() => {
    hintsUsed++;
    applyHintToTarget(target);
  });
}

/* ================= AD / REVIVE ================= */

function simulateAd(callback) {
  const overlay = document.getElementById("ad-overlay");
  if (!overlay) {
    callback();
    return;
  }

  overlay.classList.remove("hidden");

  setTimeout(() => {
    overlay.classList.add("hidden");
    callback();
  }, 2000);
}

function showGameOverOption() {
  const watchAd = confirm("Game Over!\nWatch Ad to continue?");
  if (!watchAd) return;
  simulateAd(() => revivePlayer());
}

function revivePlayer() {
  lives = 1;
  gameOver = false;
  startTimer();
  updateLivesDisplay();
  saveGame();
  renderBoard();
}

/* ================= SAVE / LOAD ================= */

function saveGame() {
  localStorage.setItem("kanjiSudoku", JSON.stringify({
    board,
    solution,
    fixedCells,
    selectedCell,
    gameOver,
    elapsedTime,
    lives,
    hintsUsed,
    notes: notes.map(row => row.map(set => [...set]))
  }));
}

function loadGame() {
  const saved = localStorage.getItem("kanjiSudoku");
  if (!saved) return false;

  const data = JSON.parse(saved);

  board = data.board;
  solution = data.solution;
  fixedCells = data.fixedCells;
  selectedCell = data.selectedCell;
  gameOver = data.gameOver ?? false;
  elapsedTime = data.elapsedTime || 0;
  lives = data.lives ?? MAX_LIVES;
  hintsUsed = data.hintsUsed ?? 0;
  notes = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => new Set(data.notes?.[r]?.[c] || []))
  );

  return true;
}

/* ================= GAME ================= */

function newGame(level = "medium") {
  solution = generateSolvedBoard();
  const clues = getClues(level);
  board = createPuzzle(solution, clues);

  fixedCells = board.map(row => row.map(v => v !== 0));
  selectedCell = null;
  gameOver = false;
  lives = MAX_LIVES;
  hintsUsed = 0;
  elapsedTime = 0;
  notes = createEmptyNotes();

  startTimer();
  updateTimerDisplay();
  updateLivesDisplay();
  saveGame();
  renderBoard();
  createNumpad();
}

/* ================= EVENTS ================= */

document.addEventListener("DOMContentLoaded", () => {
  const newGameBtn = document.getElementById("new-game-btn");
  const hintBtn = document.getElementById("hint-btn");
  const notesBtn = document.getElementById("notes-btn");
  const difficultyEl = document.getElementById("difficulty");

  newGameBtn?.addEventListener("click", () => {
    const level = difficultyEl?.value || "medium";
    newGame(level);
  });

  hintBtn?.addEventListener("click", handleHintRequest);

  notesBtn?.addEventListener("click", () => {
    notesMode = !notesMode;
    notesBtn.textContent = notesMode ? "Notes ON" : "Notes OFF";
  });

  difficultyEl?.addEventListener("change", (e) => {
    const level = e.target.value;
    const proceed = confirm("Start new game with new difficulty?");
    if (!proceed) return;
    newGame(level);
  });

  createNumpad();

  if (!loadGame()) {
    newGame();
  } else {
    startTimer();
    updateTimerDisplay();
    updateLivesDisplay();
    renderBoard();
    createNumpad();
  }
});

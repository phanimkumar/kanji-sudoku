const boardEl = document.getElementById("board");
const keypadEl = document.getElementById("keypad");
const messageEl = document.getElementById("message");
const timerEl = document.getElementById("timer");
const livesEl = document.getElementById("lives");
const hintsEl = document.getElementById("hints");
const hintBtn = document.getElementById("hintBtn");
const notesBtn = document.getElementById("notesBtn");

let selectedIndex = null;
let selectedKey = null;
let seconds = 0;
let timer = null;

let puzzle = [];
let solution = [];
let current = [];
let notes = [];
let difficulty = "medium";

let lives = 3;
let hints = 3;
let notesMode = false;
let gameOver = false;

/* ================== SVG ICONS ================== */

function piece(type, shape) {
  const color = type === "dark" ? "#d6a857" : "#f0c475";

  return `
    <svg viewBox="0 0 100 100">
      <text x="50%" y="60%" text-anchor="middle" font-size="60" fill="${color}">
        ${shape}
      </text>
    </svg>
  `;
}

const icons = {
  1: piece("light", "♔"),
  2: piece("light", "♕"),
  3: piece("light", "♖"),
  4: piece("light", "♗"),
  5: piece("light", "♘"),
  6: piece("light", "♙"),
  7: piece("dark", "♚"),
  8: piece("dark", "♛"),
  9: piece("dark", "♜")
};

/* ================== GENERATOR ================== */

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateFullBoard() {
  const base = 3;

  const rows = shuffle([...Array(base).keys()]).flatMap(g =>
    shuffle([...Array(base).keys()]).map(r => g * base + r)
  );

  const cols = shuffle([...Array(base).keys()]).flatMap(g =>
    shuffle([...Array(base).keys()]).map(c => g * base + c)
  );

  const nums = shuffle([1,2,3,4,5,6,7,8,9]);

  return rows.map(r =>
    cols.map(c =>
      nums[(base * (r % base) + Math.floor(r / base) + c) % 9]
    )
  );
}

/* ================== UNIQUE PUZZLE ================== */

function createPuzzle(board, difficulty) {
  const p = board.map(r => [...r]);

  let targetRemove = { easy: 32, medium: 42, hard: 50 }[difficulty] || 42;

  const cells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      cells.push({ r, c });
    }
  }

  shuffle(cells);

  let removed = 0;

  for (const { r, c } of cells) {
    if (removed >= targetRemove) break;

    const backup = p[r][c];
    p[r][c] = 0;

    const copy = p.map(row => [...row]);

    if (countSolutions(copy) === 1) {
      removed++;
    } else {
      p[r][c] = backup;
    }
  }

  return p;
}

/* ================== SOLVER ================== */

function countSolutions(board) {
  let count = 0;

  function solve() {
    if (count > 1) return;

    const empty = findEmpty(board);
    if (!empty) {
      count++;
      return;
    }

    const [r, c] = empty;

    for (let n = 1; n <= 9; n++) {
      if (isSafe(board, r, c, n)) {
        board[r][c] = n;
        solve();
        board[r][c] = 0;
      }
    }
  }

  solve();
  return count;
}

function findEmpty(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return [r, c];
    }
  }
  return null;
}

function isSafe(board, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
  }

  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;

  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }

  return true;
}

/* ================== GAME ================== */

function startGame() {
  const full = generateFullBoard();

  solution = full.map(r => [...r]);
  puzzle = createPuzzle(full, difficulty);
  current = puzzle.map(r => [...r]);

  notes = Array.from({ length: 81 }, () => new Set());

  selectedIndex = null;
  selectedKey = null;
  seconds = 0;
  lives = 3;
  hints = 3;
  notesMode = false;
  gameOver = false;

  messageEl.textContent = "";
  notesBtn.textContent = "Notes OFF";

  renderBoard();
  renderKeypad();
  renderStatus();
  startTimer();
}

function setDifficulty(level) {
  difficulty = level;

  document.querySelectorAll(".difficulty button").forEach(btn => {
    btn.classList.remove("active");
  });

  document.querySelector(`.difficulty button[onclick="setDifficulty('${level}')"]`)
    ?.classList.add("active");

  startGame();
}

/* ================== RENDER ================== */

function renderBoard() {
  boardEl.innerHTML = "";

  const selectedValue =
    selectedIndex !== null
      ? current[Math.floor(selectedIndex / 9)][selectedIndex % 9]
      : 0;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const index = r * 9 + c;
      const cell = document.createElement("div");

      cell.className = "cell";

      if (puzzle[r][c] !== 0) cell.classList.add("fixed");

      if (selectedIndex !== null) {
        const sr = Math.floor(selectedIndex / 9);
        const sc = selectedIndex % 9;

        if (index === selectedIndex) {
          cell.classList.add("selected");
        } else if (r === sr || c === sc) {
          cell.classList.add("related");
        }

        if (selectedValue !== 0 && current[r][c] === selectedValue) {
          cell.classList.add("same-piece");
        }
      }

      if (current[r][c] !== 0) {
        cell.innerHTML = icons[current[r][c]];
      } else if (notes[index].size > 0) {
        cell.innerHTML = renderNotes(index);
      }

      cell.onclick = () => selectCell(index);

      boardEl.appendChild(cell);
    }
  }

  updateErrors();
}

function renderNotes(index) {
  let html = `<div class="notes-grid">`;

  for (let i = 1; i <= 9; i++) {
    html += `<div class="note-mark">${notes[index].has(i) ? icons[i] : ""}</div>`;
  }

  html += `</div>`;
  return html;
}

function renderKeypad() {
  keypadEl.innerHTML = "";

  const counts = countRemaining();

  for (let i = 1; i <= 9; i++) {
    const key = document.createElement("div");
    key.className = "key";

    if (selectedKey === i) key.classList.add("active");

    key.innerHTML = `
      ${icons[i]}
      <div class="count">${counts[i]}</div>
    `;

    if (counts[i] === 0 && !notesMode) {
      key.style.opacity = "0.3";
      key.style.pointerEvents = "none";
    } else {
      key.onclick = () => placeValue(i);
    }

    keypadEl.appendChild(key);
  }
}

function renderStatus() {
  livesEl.textContent = "❤️".repeat(lives);
  hintsEl.textContent = `Hints: ${hints}`;
}

/* ================== GAME LOGIC ================== */

function selectCell(index) {
  if (gameOver) return;

  selectedIndex = index;
  renderBoard();
}

function placeValue(value) {
  if (selectedIndex === null || gameOver) return;

  selectedKey = value;

  const r = Math.floor(selectedIndex / 9);
  const c = selectedIndex % 9;

  if (puzzle[r][c] !== 0) return;

  if (notesMode) {
    if (current[r][c] !== 0) return;

    if (notes[selectedIndex].has(value)) {
      notes[selectedIndex].delete(value);
    } else {
      notes[selectedIndex].add(value);
    }

    renderBoard();
    renderKeypad();
    return;
  }

  current[r][c] = value;
  notes[selectedIndex].clear();

  renderBoard();

  if (value !== solution[r][c]) {
    lives--;
    renderStatus();

    boardEl.children[selectedIndex].classList.add("error");

    setTimeout(() => {
      current[r][c] = 0;
      renderBoard();
      renderKeypad();
    }, 600);

    if (lives <= 0) {
      gameOver = true;
      clearInterval(timer);
      messageEl.textContent = "Game Over";
    }

    return;
  }

  renderKeypad();
  checkWin();
}

function eraseValue() {
  if (selectedIndex === null || gameOver) return;

  const r = Math.floor(selectedIndex / 9);
  const c = selectedIndex % 9;

  if (puzzle[r][c] !== 0) return;

  current[r][c] = 0;
  notes[selectedIndex].clear();

  renderBoard();
  renderKeypad();
}

function useHint() {
  if (gameOver || hints <= 0) return;

  let target = null;

  if (selectedIndex !== null) {
    const r = Math.floor(selectedIndex / 9);
    const c = selectedIndex % 9;

    if (current[r][c] === 0) {
      target = selectedIndex;
    }
  }

  if (target === null) {
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;

      if (current[r][c] === 0) {
        target = i;
        break;
      }
    }
  }

  if (target === null) return;

  const r = Math.floor(target / 9);
  const c = target % 9;

  current[r][c] = solution[r][c];
  notes[target].clear();
  selectedIndex = target;

  hints--;
  renderStatus();
  renderBoard();
  renderKeypad();
  checkWin();
}

function toggleNotes() {
  notesMode = !notesMode;
  notesBtn.textContent = notesMode ? "Notes ON" : "Notes OFF";
  renderKeypad();
}

/* ================== ERROR CHECK ================== */

function updateErrors() {
  document.querySelectorAll(".cell").forEach(c => c.classList.remove("error"));

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = current[r][c];
      if (!val) continue;

      current[r][c] = 0;

      if (!isSafe(current, r, c, val)) {
        boardEl.children[r * 9 + c].classList.add("error");
      }

      current[r][c] = val;
    }
  }
}

/* ================== KEYPAD COUNT ================== */

function countRemaining() {
  const counts = {};
  for (let i = 1; i <= 9; i++) counts[i] = 9;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = current[r][c];
      if (val !== 0) counts[val]--;
    }
  }

  return counts;
}

/* ================== WIN ================== */

function checkWin() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (current[r][c] !== solution[r][c]) return;
    }
  }

  clearInterval(timer);
  gameOver = true;
  messageEl.textContent = "Completed";
}

/* ================== TIMER ================== */

function startTimer() {
  clearInterval(timer);

  timer = setInterval(() => {
    seconds++;
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
  }, 1000);
}

/* ================== EVENTS ================== */

document.getElementById("eraseBtn").onclick = eraseValue;
document.getElementById("newGameBtn").onclick = startGame;
document.getElementById("hintBtn").onclick = useHint;
document.getElementById("notesBtn").onclick = toggleNotes;

/* ================== START ================== */

setTimeout(() => setDifficulty("medium"), 0);

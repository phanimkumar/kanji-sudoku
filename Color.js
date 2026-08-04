const boardEl = document.getElementById("board");
const padEl = document.getElementById("colorPad");
const shareBtn = document.getElementById("shareBtn");
const dailyBtn = document.getElementById("dailyBtn");
const dailyInfo = document.getElementById("dailyInfo");

let solved, puzzle, current, notes;
let selected = null;
let selectedColor = null;
let mistakes = 0;
let hintsRemaining = 3;
let hintsUsed = 0;
let undoStack = [];
let difficulty = "medium";
let noteMode = false;
let isDailyChallenge = false;
let dailyDateKey = "";
let dailyDisplayDate = "";
let randomSource = Math.random;

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
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");

  document.getElementById("timer").innerText = `${m}:${s}`;
}

/* ===== STATUS ===== */

function updateStatus() {
  document.getElementById("mistakes").innerText = `${mistakes}/3`;
  document.getElementById("hints").innerText = `Hints: ${hintsRemaining}`;
}

/* ===== UTIL ===== */

function getUtcDateData() {

  const now = new Date();

  dailyDateKey =
    now.getUTCFullYear() + "-" +
    String(now.getUTCMonth() + 1).padStart(2, "0") + "-" +
    String(now.getUTCDate()).padStart(2, "0");

  dailyDisplayDate = now.toLocaleDateString(
    "en-GB",
    {
      timeZone: "UTC",
      day: "2-digit",
      month: "long",
      year: "numeric"
    }
  );

}

function hashString(str) {

  let hash = 2166136261;

  for (let i = 0; i < str.length; i++) {

    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);

  }

  return hash >>> 0;

}

function seededRandom(seed) {

  let value = seed >>> 0;

  return function () {

    value += 0x6D2B79F5;

    let t = value;

    t = Math.imul(t ^ (t >>> 15), t | 1);

    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;

  };

}

function shuffle(array) {

  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {

    const j = Math.floor(randomSource() * (i + 1));

    [copy[i], copy[j]] =
      [copy[j], copy[i]];

  }

  return copy;

}
function emptyNotes() {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set())
  );
}

function snapshot() {
  undoStack.push({
    current: current.map(row => [...row]),
    notes: notes.map(row => row.map(cell => [...cell])),
    mistakes,
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
  selected = savedState.selected
    ? { ...savedState.selected }
    : null;
  selectedColor = savedState.selectedColor;

  updateStatus();
}
/* ===== SUDOKU ===== */

function isValid(board, row, col, number) {
  for (let i = 0; i < 9; i++) {
    if (
      board[row][i] === number ||
      board[i][col] === number
    ) {
      return false;
    }
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[boxRow + r][boxCol + c] === number) {
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
        if (isValid(board, row, col, number)) {
          board[row][col] = number;

          if (solve(board)) {
            return true;
          }

          board[row][col] = 0;
        }
      }

      return false;
    }
  }

  return true;
}

function generate() {
  const board = Array.from(
    { length: 9 },
    () => Array(9).fill(0)
  );

  solve(board);

  return board;
}

function createPuzzle() {

  if (isDailyChallenge) {

    getUtcDateData();

    randomSource = seededRandom(
      hashString("color-" + dailyDateKey)
    );

  } else {

    randomSource = Math.random;

  }

  solved = generate();
  puzzle = solved.map(row => [...row]);

  const removalMap = {
    easy: 30,
    medium: 45,
    hard: 50
  };

  let remove = isDailyChallenge
    ? 45
    : removalMap[difficulty];

  while (remove > 0) {

    const row =
      Math.floor(randomSource() * 9);

    const col =
      Math.floor(randomSource() * 9);

    if (puzzle[row][col] !== 0) {

      puzzle[row][col] = 0;
      remove--;

    }

  }

  current = puzzle.map(row => [...row]);
  notes = emptyNotes();

  randomSource = Math.random;

}

/* ===== GAME ===== */

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

  const index = r * 9 + c;
  const cell = boardEl.children[index];

  if (cell) {
    cell.classList.add("flash");
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

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      notes[r][c].delete(color);
    }
  }
}

/* ===== HINT ===== */

function useHint() {
  if (hintsRemaining <= 0) {
    return;
  }

  let target = null;

  // Use selected cell when it is editable and empty.
  if (
    selected &&
    puzzle[selected.r][selected.c] === 0 &&
    current[selected.r][selected.c] === 0
  ) {
    target = {
      r: selected.r,
      c: selected.c
    };
  }

  // Otherwise choose a random empty editable cell.
  if (!target) {
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

    target =
      emptyCells[
        Math.floor(Math.random() * emptyCells.length)
      ];
  }

  snapshot();

  const { r, c } = target;
  const correctColor = solved[r][c];

  current[r][c] = correctColor;
  notes[r][c].clear();

  removeRelatedNotes(r, c, correctColor);

  selected = { r, c };
  selectedColor = correctColor;

  hintsRemaining--;
  hintsUsed++;

  updateStatus();
  render();

  if (isBoardComplete()) {
    showCompleted();
  }
}

function undo() {
  if (!undoStack.length) {
    return;
  }

  restore(undoStack.pop());
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

function showCompleted() {
  stopTimer();

  document
    .getElementById("overlay")
    .classList.remove("hidden");

  const time =
    document.getElementById("timer").innerText;

  if (isDailyChallenge) {
    if (typeof gtag === "function") {
      gtag("event", "daily_challenge_complete", {
        challenge_date: dailyDateKey,
        time_seconds: seconds,
        mistakes: mistakes,
        hints_used: hintsUsed
      });
    }

    document.getElementById("overlayText").innerText =
      "🏆 Daily Challenge Complete\n\n" +
      dailyDisplayDate + "\n\n" +
      "Time: " + time + "\n" +
      "Mistakes: " + mistakes + "/3\n" +
      "Hints Used: " + hintsUsed;

    shareBtn.classList.remove("hidden");
  } else {
    document.getElementById("overlayText").innerText =
      "Completed 🎉\n" +
      "Time: " + time + "\n" +
      "Mistakes: " + mistakes + "/3";

    shareBtn.classList.add("hidden");
  }
}


function showGameOver() {

  stopTimer();

  document
    .getElementById("overlay")
    .classList.remove("hidden");

  document.getElementById("overlayText").innerText =
    isDailyChallenge
      ? "Daily Challenge Over"
      : "Game Over";

  if (shareBtn) {
    shareBtn.classList.add("hidden");
  }

}

async function shareDailyResult() {
if (typeof gtag === "function") {
  gtag("event", "daily_challenge_share", {
    challenge_date: dailyDateKey,
    time_seconds: seconds,
    mistakes: mistakes,
    hints_used: hintsUsed
  });
}
  const result =
`🎨 Sudoku Multiverse Daily Challenge

📅 ${dailyDisplayDate}

⏱ ${document.getElementById("timer").innerText}

❌ Mistakes: ${mistakes}

💡 Hints Used: ${hintsUsed}

https://sudokumultiverse.com/Color.html`;

  if (navigator.share) {

    await navigator.share({
      title: "Color Sudoku",
      text: result
    });

    return;
  }

  await navigator.clipboard.writeText(result);

  if (shareBtn) {

    shareBtn.innerText = "Copied!";

    setTimeout(() => {

      shareBtn.innerText = "Share Result";

    }, 1500);

  }

}



/* ===== RENDER ===== */

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
        const dot = document.createElement("div");

        dot.className = `color-dot c${value}`;

        cell.appendChild(dot);
      } else if (notes[row][col].size > 0) {
        const noteBox = document.createElement("div");

        noteBox.className = "note-grid";

        for (let number = 1; number <= 9; number++) {
          const slot = document.createElement("div");

          slot.className = "note-slot";

          if (notes[row][col].has(number)) {
            const mini = document.createElement("div");

            mini.className = `note-dot c${number}`;

            slot.appendChild(mini);
          }

          noteBox.appendChild(slot);
        }

        cell.appendChild(noteBox);
      }

      cell.onclick = () => clickCell(row, col);

      boardEl.appendChild(cell);
    }
  }

  updatePad();
}

/* ===== PAD ===== */

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
  hintsUsed = 0;

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

  shareBtn.classList.add("hidden");
  shareBtn.innerText = "Share Result";

  createPuzzle();

  if (isDailyChallenge) {
    dailyBtn.classList.add("active");
    dailyBtn.innerText = "⭐ Daily Challenge";

    dailyInfo.innerText =
      "Today's Challenge • " + dailyDisplayDate;

    dailyInfo.classList.remove("hidden");
  } else {
    dailyBtn.classList.remove("active");
    dailyBtn.innerText = "⭐ Play Daily Challenge";
    dailyInfo.classList.add("hidden");
  }

  updateTimer();
  updateStatus();
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

dailyBtn.onclick = () => {
  isDailyChallenge = true;
  startNewGame();

  if (typeof gtag === "function") {
    gtag("event", "daily_challenge_start", {
      challenge_date: dailyDateKey,
      difficulty: "medium"
    });
  }
};

shareBtn.onclick = shareDailyResult;

/* ===== DIFFICULTY ===== */

document.querySelectorAll(".diff").forEach(button => {
  button.onclick = () => {
    difficulty = button.dataset.level;
    isDailyChallenge = false;

    startNewGame();
  };
});

/* ===== START ===== */

startNewGame();


/* ===== START ===== */

startNewGame();
document.querySelectorAll(".diff").forEach(button => {
  button.onclick = () => {
    document
      .querySelectorAll(".diff")
      .forEach(item =>
        item.classList.remove("active")
      );

    button.classList.add("active");

    difficulty = button.dataset.level;
isDailyChallenge = false;

startNewGame();
  };
});

/* ===== START ===== */

startNewGame();

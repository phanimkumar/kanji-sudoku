const boardEl = document.getElementById("board");
const padEl = document.getElementById("colorPad");

let solved, puzzle, current, notes;
let selected = null;
let selectedColor = null;
let mistakes = 0;
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
  let m = String(Math.floor(seconds / 60)).padStart(2, "0");
  let s = String(seconds % 60).padStart(2, "0");
  document.getElementById("timer").innerText = `${m}:${s}`;
}

/* ===== UTIL ===== */
function shuffle(a) {
  return a.sort(() => Math.random() - 0.5);
}

function emptyNotes() {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set())
  );
}

function cloneNotes(source) {
  return source.map(row => row.map(cell => new Set([...cell])));
}

function snapshot() {
  undoStack.push({
    current: current.map(r => [...r]),
    notes: notes.map(row => row.map(cell => [...cell])),
    mistakes
  });
}

function restore(snapshot) {
  current = snapshot.current.map(r => [...r]);
  notes = snapshot.notes.map(row => row.map(cell => new Set(cell)));
  mistakes = snapshot.mistakes;
  document.getElementById("mistakes").innerText = `${mistakes}/3`;
}

/* ===== SUDOKU ===== */
function isValid(b, r, c, n) {
  for (let i = 0; i < 9; i++) {
    if (b[r][i] === n || b[i][c] === n) return false;
  }

  let br = Math.floor(r / 3) * 3;
  let bc = Math.floor(c / 3) * 3;

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (b[br + i][bc + j] === n) return false;
    }
  }

  return true;
}

function solve(b) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (b[r][c] === 0) {
        for (let n of shuffle([1,2,3,4,5,6,7,8,9])) {
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

function generate() {
  let b = Array.from({ length: 9 }, () => Array(9).fill(0));
  solve(b);
  return b;
}

function createPuzzle() {
  solved = generate();
  puzzle = solved.map(r => [...r]);

  let map = {
    easy: 30,
    medium: 45,
    hard: 50
  };

  let remove = map[difficulty];

  while (remove > 0) {
    let r = Math.floor(Math.random() * 9);
    let c = Math.floor(Math.random() * 9);

    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      remove--;
    }
  }

  current = puzzle.map(r => [...r]);
  notes = emptyNotes();
}

/* ===== GAME ===== */
function clickCell(r, c) {
  selected = { r, c };

  if (current[r][c] !== 0) {
    selectedColor = current[r][c];
  }

  render();
}

function place() {
  if (!selected || !selectedColor) return;

  let { r, c } = selected;

  if (puzzle[r][c] !== 0) return;
  if (current[r][c] !== 0) return;

  if (noteMode) {
    toggleNote(r, c, selectedColor);
    return;
  }

  snapshot();

  if (solved[r][c] === selectedColor) {
    current[r][c] = selectedColor;
    notes[r][c].clear();
    removeRelatedNotes(r, c, selectedColor);

    if (current.flat().every(v => v !== 0)) {
      render();
      showCompleted();
      return;
    }

    render();

  } else {
    mistakes++;
    document.getElementById("mistakes").innerText = `${mistakes}/3`;

    let idx = r * 9 + c;
    boardEl.children[idx].classList.add("flash");

    if (mistakes >= 3) {
      showGameOver();
    }
  }
}

function toggleNote(r, c, color) {
  if (current[r][c] !== 0) return;

  snapshot();

  if (notes[r][c].has(color)) {
    notes[r][c].delete(color);
  } else {
    notes[r][c].add(color);
  }

  render();
}

function removeRelatedNotes(row, col, color) {
  for (let i = 0; i < 9; i++) {
    notes[row][i].delete(color);
    notes[i][col].delete(color);
  }

  let br = Math.floor(row / 3) * 3;
  let bc = Math.floor(col / 3) * 3;

  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      notes[r][c].delete(color);
    }
  }
}

function undo() {
  if (!undoStack.length) return;

  restore(undoStack.pop());
  render();
}

function erase() {
  if (!selected) return;

  let { r, c } = selected;

  if (puzzle[r][c] !== 0) return;

  snapshot();

  current[r][c] = 0;
  notes[r][c].clear();

  render();
}

function showCompleted() {
  stopTimer();

  document.getElementById("overlay").classList.remove("hidden");
  document.getElementById("overlayText").innerText =
    `Completed 🎉\nTime: ${document.getElementById("timer").innerText}\nMistakes: ${mistakes}/3`;
}

function showGameOver() {
  stopTimer();

  document.getElementById("overlay").classList.remove("hidden");
  document.getElementById("overlayText").innerText = "Game Over";
}

/* ===== RENDER ===== */
function render() {
  boardEl.innerHTML = "";

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      let cell = document.createElement("div");
      cell.className = "cell";

      if (selected) {
        if (selected.r === r || selected.c === c) {
          cell.classList.add("highlight");
        }

        let br = Math.floor(selected.r / 3) * 3;
        let bc = Math.floor(selected.c / 3) * 3;

        if (r >= br && r < br + 3 && c >= bc && c < bc + 3) {
          cell.classList.add("highlight");
        }

        if (selected.r === r && selected.c === c) {
          cell.classList.add("selected");
        }
      }

      let v = current[r][c];

      if (selectedColor && v === selectedColor) {
        cell.classList.add("same");
      }

      if (v) {
        let d = document.createElement("div");
        d.className = "color-dot c" + v;
        cell.appendChild(d);
      } else if (notes[r][c].size > 0) {
        let noteBox = document.createElement("div");
        noteBox.className = "note-grid";

        for (let i = 1; i <= 9; i++) {
          let slot = document.createElement("div");
          slot.className = "note-slot";

          if (notes[r][c].has(i)) {
            let mini = document.createElement("div");
            mini.className = "note-dot c" + i;
            slot.appendChild(mini);
          }

          noteBox.appendChild(slot);
        }

        cell.appendChild(noteBox);
      }

      cell.onclick = () => clickCell(r, c);
      boardEl.appendChild(cell);
    }
  }

  updatePad();
}

/* ===== PAD ===== */
function updatePad() {
  padEl.innerHTML = "";

  let count = Array(10).fill(0);
  current.flat().forEach(v => {
    if (v) count[v]++;
  });

  for (let i = 1; i <= 9; i++) {
    let btn = document.createElement("div");
    btn.className = "color-btn c" + i;

    if (selectedColor === i) {
      btn.classList.add("selected-color");
    }

    let left = 9 - count[i];

    let badge = document.createElement("div");
    badge.className = "count";
    badge.innerText = left;
    btn.appendChild(badge);

    if (left === 0) btn.classList.add("disabled");

    btn.onclick = () => {
      selectedColor = i;
      place();
      render();
    };

    padEl.appendChild(btn);
  }
}

/* ===== CONTROLS ===== */
document.getElementById("newGameBtn").onclick = () => {
  mistakes = 0;
  selected = null;
  selectedColor = null;
  undoStack = [];
  seconds = 0;

  updateTimer();
  startTimer();

  document.getElementById("overlay").classList.add("hidden");
  document.getElementById("mistakes").innerText = "0/3";

  createPuzzle();
  render();
};

document.getElementById("undoBtn").onclick = undo;
document.getElementById("eraseBtn").onclick = erase;

document.getElementById("noteBtn").onclick = () => {
  noteMode = !noteMode;
  document.getElementById("noteBtn").classList.toggle("active", noteMode);
};

document.getElementById("restartBtn").onclick = () => {
  document.getElementById("newGameBtn").click();
};

/* ===== DIFFICULTY ===== */
document.querySelectorAll(".diff").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".diff").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    difficulty = btn.dataset.level;
    document.getElementById("newGameBtn").click();
  };
});

/* ===== START ===== */
createPuzzle();
startTimer();
render();

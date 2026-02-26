const ROWS = 6;
const COLS = 5;

const boardEl = document.getElementById("board");
const outputEl = document.getElementById("output");
const hardModeEl = document.getElementById("hard-mode");
const clearBtn = document.getElementById("clear-btn");
const actionButtons = ["count-btn", "random-btn", "best-btn", "all-btn"].map((id) =>
  document.getElementById(id),
);
const { filterCandidates, bestInformationGuess } = window.Solver;

buildBoard();
refreshBoardUI();
validateBoard();
print(`Loaded ${window.WORDS.length} vendored words. Enter your board status to begin.`);

function buildBoard() {
  for (let r = 0; r < ROWS; r += 1) {
    const row = document.createElement("div");
    row.className = "row";
    row.dataset.row = String(r);

    for (let c = 0; c < COLS; c += 1) {
      const input = document.createElement("input");
      input.className = "tile";
      input.maxLength = 1;
      input.dataset.state = "0";
      input.dataset.row = String(r);
      input.dataset.col = String(c);

      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^a-z]/gi, "").toLowerCase();
        focusNext(r, c);
        refreshBoardUI();
        validateBoard();
      });

      input.addEventListener("click", () => {
        input.dataset.state = String((Number(input.dataset.state) + 1) % 3);
        validateBoard();
      });

      row.appendChild(input);
    }

    boardEl.appendChild(row);
  }
}

function isRowComplete(r) {
  for (let c = 0; c < COLS; c += 1) {
    const tile = getCell(r, c);
    if (!tile.value) return false;
  }
  return true;
}

function refreshBoardUI() {
  for (let r = 0; r < ROWS; r += 1) {
    const rowEl = boardEl.querySelector(`.row[data-row='${r}']`);
    const unlocked = r === 0 || isRowComplete(r - 1);
    rowEl.classList.toggle("locked", !unlocked);

    for (let c = 0; c < COLS; c += 1) {
      const tile = getCell(r, c);
      tile.disabled = !unlocked;
      if (!unlocked) {
        tile.value = "";
        tile.dataset.state = "0";
      }
    }
  }
}

function focusNext(r, c) {
  if (c >= COLS - 1) return;
  const next = getCell(r, c + 1);
  if (next) next.focus();
}

function getCell(r, c) {
  return boardEl.querySelector(`.tile[data-row='${r}'][data-col='${c}']`);
}

function getRows() {
  const rows = [];
  for (let r = 0; r < ROWS; r += 1) {
    const letters = [];
    const states = [];
    for (let c = 0; c < COLS; c += 1) {
      const cell = getCell(r, c);
      letters.push(cell.value || "");
      states.push(Number(cell.dataset.state));
    }

    if (letters.every((x) => x.length === 1)) {
      rows.push({ guess: letters.join(""), states });
    }
  }
  return rows;
}

function validateBoard() {
  const invalidTiles = findInvalidTiles();

  boardEl.querySelectorAll(".tile").forEach((tile) => {
    tile.classList.remove("invalid");
  });

  invalidTiles.forEach(({ row, col }) => {
    const cell = getCell(row, col);
    if (cell) cell.classList.add("invalid");
  });

  const isValid = invalidTiles.length === 0;
  actionButtons.forEach((btn) => {
    btn.disabled = !isValid;
  });

  if (!isValid) {
    print("Input has conflicts. Red tiles must be fixed before showing candidates or hints.");
  }

  return isValid;
}

function findInvalidTiles() {
  const invalid = [];
  const graySeen = new Set();

  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const cell = getCell(r, c);
      if (!cell.value) continue;

      const letter = cell.value.toLowerCase();
      const state = Number(cell.dataset.state);

      if (state === 0) {
        graySeen.add(letter);
      } else if (graySeen.has(letter)) {
        invalid.push({ row: r, col: c });
      }
    }
  }

  return invalid;
}

function print(msg) {
  outputEl.textContent = msg;
}

clearBtn.addEventListener("click", () => {
  boardEl.querySelectorAll(".tile").forEach((tile) => {
    tile.value = "";
    tile.dataset.state = "0";
    tile.classList.remove("invalid");
  });
  refreshBoardUI();
  validateBoard();
  print("Board cleared. Enter your board status to begin again.");
  const firstTile = getCell(0, 0);
  if (firstTile) firstTile.focus();
});

document.getElementById("count-btn").addEventListener("click", () => {
  if (!validateBoard()) return;

  const rows = getRows();
  const candidates = filterCandidates(rows, window.WORDS);
  print(`Remaining candidate words: ${candidates.length}`);
});

document.getElementById("random-btn").addEventListener("click", () => {
  if (!validateBoard()) return;

  const rows = getRows();
  const candidates = filterCandidates(rows, window.WORDS);
  if (!candidates.length) {
    print("No candidates found. Double-check your board input.");
    return;
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  print(`Random candidate hint: ${pick} (remaining: ${candidates.length})`);
});

document.getElementById("best-btn").addEventListener("click", () => {
  if (!validateBoard()) return;

  const rows = getRows();
  const candidates = filterCandidates(rows, window.WORDS);
  if (!candidates.length) {
    print("No candidates found. Double-check your board input.");
    return;
  }

  const hardMode = hardModeEl.checked;
  const best = bestInformationGuess(candidates, rows, hardMode, window.WORDS);
  if (!best.word) {
    print("No valid hint word found for selected mode.");
    return;
  }

  print(`Most-information guess: ${best.word}
Estimated info gain score: ${best.infoGain.toFixed(2)}
Candidates remaining: ${candidates.length}${hardMode ? "\nHard mode: ON" : "\nHard mode: OFF"}`);
});

document.getElementById("all-btn").addEventListener("click", () => {
  if (!validateBoard()) return;

  const rows = getRows();
  const candidates = filterCandidates(rows, window.WORDS);
  if (!candidates.length) {
    print("No candidates found. Double-check your board input.");
    return;
  }

  print(`All candidates (${candidates.length}):
${candidates.join(", ")}`);
});

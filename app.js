const ROWS = 6;
const COLS = 5;

const boardEl = document.getElementById("board");
const outputEl = document.getElementById("output");
const hardModeEl = document.getElementById("hard-mode");
const clearBtn = document.getElementById("clear-btn");
const actionButtons = ["count-btn", "random-btn", "best-btn", "all-btn"].map((id) => document.getElementById(id));
const { filterCandidates, bestInformationGuess } = window.Solver;
buildBoard();
updateBoardState();
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
        updateBoardState();
      });
      input.addEventListener("click", () => {
        if (input.disabled) return;
        input.dataset.state = String((Number(input.dataset.state) + 1) % 3);
        updateBoardState();
      });
      row.appendChild(input);
    }
    boardEl.appendChild(row);
  }
}

function focusNext(r, c) {
  if (c >= COLS - 1) return;
  const next = boardEl.querySelector(`.tile[data-row='${r}'][data-col='${c + 1}']`);
  if (next) next.focus();
}

function getCell(r, c) {
  return boardEl.querySelector(`.tile[data-row='${r}'][data-col='${c}']`);
}

function getRowData(r) {
  const letters = [];
  const states = [];
  for (let c = 0; c < COLS; c += 1) {
    const cell = getCell(r, c);
    letters.push(cell.value || "");
    states.push(Number(cell.dataset.state));
  }
  return { letters, states, complete: letters.every((x) => x.length === 1) };
}

function getRows() {
  const rows = [];
  for (let r = 0; r < ROWS; r += 1) {
    const { letters, states, complete } = getRowData(r);
    if (complete) {
      rows.push({ guess: letters.join(""), states, rowIndex: r });
    }
  }
  return rows;
}

function markInvalidCells(invalidKeys) {
  const allTiles = boardEl.querySelectorAll(".tile");
  allTiles.forEach((tile) => tile.classList.remove("invalid"));
  invalidKeys.forEach((key) => {
    const [r, c] = key.split("-").map(Number);
    const cell = getCell(r, c);
    if (cell) cell.classList.add("invalid");
  });
}

function validateRows(rows) {
  const minCount = {};
  const maxCount = {};
  const fixed = Array(COLS).fill(null);
  const banned = Array.from({ length: COLS }, () => new Set());
  const invalid = new Set();

  for (const row of rows) {
    const positivesInRow = {};
    const totalInRow = {};

    for (let i = 0; i < COLS; i += 1) {
      const ch = row.guess[i];
      totalInRow[ch] = (totalInRow[ch] || 0) + 1;
      if (row.states[i] > 0) positivesInRow[ch] = (positivesInRow[ch] || 0) + 1;
    }

    Object.entries(positivesInRow).forEach(([ch, count]) => {
      minCount[ch] = Math.max(minCount[ch] || 0, count);
    });

    Object.entries(totalInRow).forEach(([ch, total]) => {
      const positive = positivesInRow[ch] || 0;
      if (positive < total) {
        const cap = positive;
        maxCount[ch] = maxCount[ch] === undefined ? cap : Math.min(maxCount[ch], cap);
      }
    });

    for (let i = 0; i < COLS; i += 1) {
      const ch = row.guess[i];
      const st = row.states[i];
      const key = `${row.rowIndex}-${i}`;

      if (st === 2) {
        if (fixed[i] && fixed[i] !== ch) {
          invalid.add(key);
        }
        fixed[i] = ch;
      }

      if (st === 1) {
        if (fixed[i] === ch) {
          invalid.add(key);
        }
        banned[i].add(ch);
      }

      if (st === 0 && (minCount[ch] || 0) > 0 && (maxCount[ch] || Infinity) === 0) {
        invalid.add(key);
      }
      if (st > 0 && maxCount[ch] !== undefined && minCount[ch] > maxCount[ch]) {
        invalid.add(key);
      }
      if (fixed[i] && st === 0 && fixed[i] === ch) {
        invalid.add(key);
      }
      if (st > 0 && banned[i].has(ch) && fixed[i] !== ch) {
        invalid.add(key);
      }
    }
  }

  if (Object.keys(minCount).some((ch) => maxCount[ch] !== undefined && minCount[ch] > maxCount[ch])) {
    rows.forEach((row) => {
      for (let i = 0; i < COLS; i += 1) {
        const ch = row.guess[i];
        if (maxCount[ch] !== undefined && minCount[ch] > maxCount[ch]) {
          invalid.add(`${row.rowIndex}-${i}`);
        }
      }
    });
  }

  return { valid: invalid.size === 0, invalidCells: invalid };
}

function updateBoardState() {
  let unlockedRows = 1;
  for (let r = 0; r < ROWS - 1; r += 1) {
    if (getRowData(r).complete) {
      unlockedRows += 1;
    } else {
      break;
    }
  }

  for (let r = 0; r < ROWS; r += 1) {
    const rowEl = boardEl.querySelector(`.row[data-row='${r}']`);
    const enabled = r < unlockedRows;
    rowEl.classList.toggle("row-hidden", !enabled);
    for (let c = 0; c < COLS; c += 1) {
      const cell = getCell(r, c);
      cell.disabled = !enabled;
      if (!enabled) {
        cell.value = "";
        cell.dataset.state = "0";
      }
      cell.classList.remove("invalid");
    }
  }

  const rows = getRows();
  const rowValidation = validateRows(rows);
  const candidates = filterCandidates(rows, window.WORDS);
  const isValid = rowValidation.valid && candidates.length > 0;

  if (!rowValidation.valid) {
    markInvalidCells(rowValidation.invalidCells);
  }

  actionButtons.forEach((button) => {
    button.disabled = !isValid;
  });

  if (!isValid && rows.length > 0) {
    print("Board input is inconsistent with Wordle rules. Fix highlighted tiles to continue.");
  }
}

function clearBoard() {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const cell = getCell(r, c);
      cell.value = "";
      cell.dataset.state = "0";
      cell.classList.remove("invalid");
    }
  }
  updateBoardState();
  print("Board cleared. Enter your board status to begin again.");
}

function print(msg) {
  outputEl.textContent = msg;
}

clearBtn.addEventListener("click", clearBoard);

document.getElementById("count-btn").addEventListener("click", () => {
  const rows = getRows();
  const candidates = filterCandidates(rows, window.WORDS);
  print(`Remaining candidate words: ${candidates.length}`);
});

document.getElementById("random-btn").addEventListener("click", () => {
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
  const rows = getRows();
  const candidates = filterCandidates(rows, window.WORDS);
  if (!candidates.length) {
    print("No candidates found. Double-check your board input.");
    return;
  }

  print(`All candidates (${candidates.length}):
${candidates.join(", ")}`);
});

const ROWS = 6;
const COLS = 5;

const boardEl = document.getElementById("board");
const outputEl = document.getElementById("output");
const hardModeEl = document.getElementById("hard-mode");
const actionButtons = ["count-btn", "random-btn", "best-btn", "all-btn"].map((id) => document.getElementById(id));
const clearBtn = document.getElementById("clear-btn");

buildBoard();
refreshBoardVisibility();
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
        refreshBoardVisibility();
        validateBoard();
      });
      input.addEventListener("click", () => {
        if (!input.value) return;
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
    const cell = getCell(r, c);
    if (!cell.value) return false;
  }
  return true;
}

function refreshBoardVisibility() {
  let unlocked = true;
  for (let r = 0; r < ROWS; r += 1) {
    const rowEl = boardEl.querySelector(`.row[data-row='${r}']`);
    if (!rowEl) continue;

    rowEl.classList.toggle("row-hidden", !unlocked);
    const inputs = rowEl.querySelectorAll(".tile");
    inputs.forEach((tile) => {
      tile.disabled = !unlocked;
    });

    if (unlocked && !isRowComplete(r)) {
      unlocked = false;
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
      rows.push({ guess: letters.join(""), states, rowIndex: r });
    }
  }
  return rows;
}

function scoreGuess(guess, answer) {
  const result = [0, 0, 0, 0, 0];
  const used = [false, false, false, false, false];

  for (let i = 0; i < 5; i += 1) {
    if (guess[i] === answer[i]) {
      result[i] = 2;
      used[i] = true;
    }
  }

  for (let i = 0; i < 5; i += 1) {
    if (result[i] !== 0) continue;
    for (let j = 0; j < 5; j += 1) {
      if (!used[j] && guess[i] === answer[j]) {
        result[i] = 1;
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

function filterCandidates(rows) {
  return window.WORDS.filter((candidate) => rows.every((row) => {
    const score = scoreGuess(row.guess, candidate);
    return score.every((s, idx) => s === row.states[idx]);
  }));
}

function encodePattern(pattern) {
  return pattern.join("");
}

function bestInformationGuess(candidates, rows, hardMode) {
  const guessPool = hardMode ? candidates.filter((word) => isHardModeValid(word, rows)) : window.WORDS;
  let bestWord = null;
  let bestScore = -Infinity;

  for (const guess of guessPool) {
    const buckets = new Map();
    for (const answer of candidates) {
      const key = encodePattern(scoreGuess(guess, answer));
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    let expectedRemaining = 0;
    for (const count of buckets.values()) {
      expectedRemaining += (count * count) / candidates.length;
    }

    const info = candidates.length - expectedRemaining;
    if (info > bestScore) {
      bestScore = info;
      bestWord = guess;
    }
  }

  return { word: bestWord, infoGain: bestScore };
}

function isHardModeValid(guess, rows) {
  const minCount = {};
  const bannedPos = Array.from({ length: 5 }, () => new Set());
  const fixedPos = Array(5).fill(null);

  for (const row of rows) {
    const rowMinCount = {};
    for (let i = 0; i < 5; i += 1) {
      const ch = row.guess[i];
      const st = row.states[i];
      if (st === 2) {
        fixedPos[i] = ch;
        rowMinCount[ch] = (rowMinCount[ch] || 0) + 1;
      } else if (st === 1) {
        bannedPos[i].add(ch);
        rowMinCount[ch] = (rowMinCount[ch] || 0) + 1;
      }
    }

    for (const [letter, count] of Object.entries(rowMinCount)) {
      minCount[letter] = Math.max(minCount[letter] || 0, count);
    }
  }

  for (let i = 0; i < 5; i += 1) {
    if (fixedPos[i] && guess[i] !== fixedPos[i]) return false;
    if (bannedPos[i].has(guess[i])) return false;
  }

  for (const [ch, count] of Object.entries(minCount)) {
    const actual = guess.split("").filter((letter) => letter === ch).length;
    if (actual < count) return false;
  }

  return true;
}

function clearInvalidMarks() {
  boardEl.querySelectorAll(".tile-invalid").forEach((tile) => tile.classList.remove("tile-invalid"));
}

function validateBoard() {
  clearInvalidMarks();
  const rows = getRows();
  const invalidCells = [];

  const definitelyGray = new Set();
  const seenPresent = new Set();

  for (const row of rows) {
    for (let i = 0; i < COLS; i += 1) {
      const ch = row.guess[i];
      const st = row.states[i];
      if (st > 0) seenPresent.add(ch);
    }

    for (let i = 0; i < COLS; i += 1) {
      const ch = row.guess[i];
      const st = row.states[i];
      if (st === 0 && !seenPresent.has(ch)) {
        definitelyGray.add(ch);
      }
    }

    for (let i = 0; i < COLS; i += 1) {
      const ch = row.guess[i];
      const st = row.states[i];
      if (definitelyGray.has(ch) && st > 0) {
        const cell = getCell(row.rowIndex, i);
        invalidCells.push(cell);
      }
    }
  }

  for (let i = 1; i <= rows.length; i += 1) {
    const subset = rows.slice(0, i);
    if (subset.length && filterCandidates(subset).length === 0) {
      const conflictRowIndex = subset[subset.length - 1].rowIndex;
      for (let c = 0; c < COLS; c += 1) {
        invalidCells.push(getCell(conflictRowIndex, c));
      }
    }
  }

  invalidCells.forEach((cell) => cell.classList.add("tile-invalid"));
  const valid = invalidCells.length === 0;
  setActionButtonsEnabled(valid);

  if (!valid) {
    print("Invalid board state detected. Fix highlighted tiles before requesting candidates or hints.");
  }

  return valid;
}

function setActionButtonsEnabled(enabled) {
  actionButtons.forEach((button) => {
    button.disabled = !enabled;
  });
}

function print(msg) {
  outputEl.textContent = msg;
}

function withValidBoard(action) {
  const valid = validateBoard();
  if (!valid) return;
  const rows = getRows();
  action(rows);
}

document.getElementById("count-btn").addEventListener("click", () => {
  withValidBoard((rows) => {
    const candidates = filterCandidates(rows);
    print(`Remaining candidate words: ${candidates.length}`);
  });
});

document.getElementById("random-btn").addEventListener("click", () => {
  withValidBoard((rows) => {
    const candidates = filterCandidates(rows);
    if (!candidates.length) {
      print("No candidates found. Double-check your board input.");
      return;
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    print(`Random candidate hint: ${pick} (remaining: ${candidates.length})`);
  });
});

document.getElementById("best-btn").addEventListener("click", () => {
  withValidBoard((rows) => {
    const candidates = filterCandidates(rows);
    if (!candidates.length) {
      print("No candidates found. Double-check your board input.");
      return;
    }

    const hardMode = hardModeEl.checked;
    const best = bestInformationGuess(candidates, rows, hardMode);
    if (!best.word) {
      print("No valid hint word found for selected mode.");
      return;
    }

    print(`Most-information guess: ${best.word}\nEstimated info gain score: ${best.infoGain.toFixed(2)}\nCandidates remaining: ${candidates.length}${hardMode ? "\nHard mode: ON" : "\nHard mode: OFF"}`);
  });
});

document.getElementById("all-btn").addEventListener("click", () => {
  withValidBoard((rows) => {
    const candidates = filterCandidates(rows);
    if (!candidates.length) {
      print("No candidates found. Double-check your board input.");
      return;
    }

    print(`All candidates (${candidates.length}):\n${candidates.join(", ")}`);
  });
});

clearBtn.addEventListener("click", () => {
  boardEl.querySelectorAll(".tile").forEach((tile) => {
    tile.value = "";
    tile.dataset.state = "0";
    tile.classList.remove("tile-invalid");
  });
  refreshBoardVisibility();
  setActionButtonsEnabled(true);
  print("Board cleared. Enter your board status to begin.");
  const first = getCell(0, 0);
  if (first) first.focus();
});

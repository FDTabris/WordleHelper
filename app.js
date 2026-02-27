const ROWS = 6;
const COLS = 5;

const boardEl = document.getElementById("board");
const outputEl = document.getElementById("output");
const hardModeEl = document.getElementById("hard-mode");
const clearBtn = document.getElementById("clear-btn");
const actionButtons = ["count-btn", "random-btn", "best-btn", "all-btn", "all-valid-btn"].map((id) =>
  document.getElementById(id),
);
const allValidGuessPool = Array.from(
  new Set([...(window.WORDS || []), ...(window.VALID_GUESSES || [])]),
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
        if (input.value) {
          focusByOffset(r, c, 1);
        }
        refreshBoardUI();
        validateBoard();
      });

      input.addEventListener("keydown", (event) => {
        if (event.key !== "Backspace") return;

        if (input.value) {
          input.value = "";
          event.preventDefault();
        }

        focusByOffset(r, c, -1);
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

function focusByOffset(r, c, offset) {
  const nextIndex = r * COLS + c + offset;
  if (nextIndex < 0 || nextIndex >= ROWS * COLS) return;

  const nextRow = Math.floor(nextIndex / COLS);
  const nextCol = nextIndex % COLS;
  const target = getCell(nextRow, nextCol);
  if (target && !target.disabled) target.focus();
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
    print("Input has conflicts. Red borders must be fixed before showing candidates or hints.");
  }

  return isValid;
}

function findInvalidTiles() {
  const invalidByKey = new Map();
  const knowledge = {
    absentLetters: new Set(),
    minCounts: new Map(),
    forbiddenPositions: new Map(),
    requiredAtPosition: new Map(),
  };

  for (let r = 0; r < ROWS; r += 1) {
    const rowTiles = [];
    for (let c = 0; c < COLS; c += 1) {
      const cell = getCell(r, c);
      if (!cell.value) continue;
      rowTiles.push({ row: r, col: c, letter: cell.value.toLowerCase(), state: Number(cell.dataset.state) });
    }

    if (!rowTiles.length) continue;

    for (const tile of rowTiles) {
      const requiredLetter = knowledge.requiredAtPosition.get(tile.col);
      if (requiredLetter) {
        if (tile.letter === requiredLetter && tile.state !== 2) {
          addInvalid(invalidByKey, tile.row, tile.col);
        }
        if (tile.state === 2 && tile.letter !== requiredLetter) {
          addInvalid(invalidByKey, tile.row, tile.col);
        }
      }

      const forbidden = knowledge.forbiddenPositions.get(tile.letter);
      if (forbidden && forbidden.has(tile.col) && tile.state === 2) {
        addInvalid(invalidByKey, tile.row, tile.col);
      }

      if (knowledge.absentLetters.has(tile.letter) && tile.state !== 0) {
        addInvalid(invalidByKey, tile.row, tile.col);
      }
    }

    if (rowTiles.length === COLS) {
      markImpossibleGrayByMinCount(rowTiles, knowledge.minCounts, invalidByKey);
      updateKnowledgeFromCompleteRow(rowTiles, knowledge);
    }
  }

  return Array.from(invalidByKey.values());
}

function markImpossibleGrayByMinCount(rowTiles, minCounts, invalidByKey) {
  const rowByLetter = new Map();
  for (const tile of rowTiles) {
    if (!rowByLetter.has(tile.letter)) rowByLetter.set(tile.letter, []);
    rowByLetter.get(tile.letter).push(tile);
  }

  for (const [letter, tiles] of rowByLetter.entries()) {
    const minRequired = minCounts.get(letter) || 0;
    if (!minRequired) continue;
    if (tiles.length > minRequired) continue;

    for (const tile of tiles) {
      if (tile.state === 0) {
        addInvalid(invalidByKey, tile.row, tile.col);
      }
    }
  }
}

function updateKnowledgeFromCompleteRow(rowTiles, knowledge) {
  const counts = new Map();

  for (const tile of rowTiles) {
    if (!counts.has(tile.letter)) counts.set(tile.letter, { nonGray: 0, gray: 0 });
    const counter = counts.get(tile.letter);
    if (tile.state === 0) {
      counter.gray += 1;
    } else {
      counter.nonGray += 1;
    }

    if (tile.state === 1) {
      if (!knowledge.forbiddenPositions.has(tile.letter)) knowledge.forbiddenPositions.set(tile.letter, new Set());
      knowledge.forbiddenPositions.get(tile.letter).add(tile.col);
    }

    if (tile.state === 2 && !knowledge.requiredAtPosition.has(tile.col)) {
      knowledge.requiredAtPosition.set(tile.col, tile.letter);
    }
  }

  for (const [letter, stat] of counts.entries()) {
    const currentMin = knowledge.minCounts.get(letter) || 0;
    knowledge.minCounts.set(letter, Math.max(currentMin, stat.nonGray));

    if (stat.nonGray === 0 && stat.gray > 0) {
      knowledge.absentLetters.add(letter);
    }
  }
}

function addInvalid(invalidByKey, row, col) {
  const key = `${row}-${col}`;
  if (!invalidByKey.has(key)) {
    invalidByKey.set(key, { row, col });
  }
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

document.getElementById("all-valid-btn").addEventListener("click", () => {
  if (!validateBoard()) return;

  const rows = getRows();
  const validGuessesLeft = filterCandidates(rows, allValidGuessPool);
  if (!validGuessesLeft.length) {
    print("No valid guesses left. Double-check your board input.");
    return;
  }

  print(`All valid guesses left (${validGuessesLeft.length}):
${validGuessesLeft.join(", ")}`);
});

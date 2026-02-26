const ROWS = 6;
const COLS = 5;

const boardEl = document.getElementById("board");
const outputEl = document.getElementById("output");
const hardModeEl = document.getElementById("hard-mode");
const { filterCandidates, bestInformationGuess } = window.WordleLogic;

buildBoard();
print(`Loaded ${window.WORDS.length} vendored words. Enter your board status to begin.`);


function buildBoard() {
  for (let r = 0; r < ROWS; r += 1) {
    const row = document.createElement("div");
    row.className = "row";
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
      });
      input.addEventListener("click", () => {
        input.dataset.state = String((Number(input.dataset.state) + 1) % 3);
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

function getRows() {
  const rows = [];
  for (let r = 0; r < ROWS; r += 1) {
    const letters = [];
    const states = [];
    for (let c = 0; c < COLS; c += 1) {
      const cell = boardEl.querySelector(`.tile[data-row='${r}'][data-col='${c}']`);
      letters.push(cell.value || "");
      states.push(Number(cell.dataset.state));
    }

    if (letters.every((x) => x.length === 1)) {
      rows.push({ guess: letters.join(""), states });
    }
  }
  return rows;
}

function print(msg) {
  outputEl.textContent = msg;
}

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
Expected remaining candidates: ${best.expectedRemaining.toFixed(2)}
Candidates remaining: ${candidates.length}${hardMode ? "
Hard mode: ON" : "
Hard mode: OFF"}`);
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

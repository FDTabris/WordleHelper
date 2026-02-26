const ROWS = 6;
const COLS = 5;

const boardEl = document.getElementById("board");
const outputEl = document.getElementById("output");
const hardModeEl = document.getElementById("hard-mode");
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

function print(msg) {
  outputEl.textContent = msg;
}

document.getElementById("count-btn").addEventListener("click", () => {
  const rows = getRows();
  const candidates = filterCandidates(rows);
  print(`Remaining candidate words: ${candidates.length}`);
});

document.getElementById("random-btn").addEventListener("click", () => {
  const rows = getRows();
  const candidates = filterCandidates(rows);
  if (!candidates.length) {
    print("No candidates found. Double-check your board input.");
    return;
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  print(`Random candidate hint: ${pick} (remaining: ${candidates.length})`);
});

document.getElementById("best-btn").addEventListener("click", () => {
  const rows = getRows();
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

document.getElementById("all-btn").addEventListener("click", () => {
  const rows = getRows();
  const candidates = filterCandidates(rows);
  if (!candidates.length) {
    print("No candidates found. Double-check your board input.");
    return;
  }

  print(`All candidates (${candidates.length}):\n${candidates.join(", ")}`);
});

(function (root) {
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

  function filterCandidates(rows, words) {
    return words.filter((candidate) => rows.every((row) => {
      const score = scoreGuess(row.guess, candidate);
      return score.every((s, idx) => s === row.states[idx]);
    }));
  }

  function encodePattern(pattern) {
    return pattern.join("");
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

  function bestInformationGuess(candidates, rows, hardMode, words) {
    const candidateSet = new Set(candidates);
    const guessPool = hardMode ? candidates.filter((word) => isHardModeValid(word, rows)) : words;
    let bestWord = null;
    let bestScore = -Infinity;
    let bestIsCandidate = false;

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
      const isCandidate = candidateSet.has(guess);
      if (info > bestScore || (info === bestScore && isCandidate && !bestIsCandidate)) {
        bestScore = info;
        bestWord = guess;
        bestIsCandidate = isCandidate;
      }
    }

    return { word: bestWord, infoGain: bestScore };
  }

  const api = {
    scoreGuess,
    filterCandidates,
    isHardModeValid,
    bestInformationGuess,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.Solver = api;
})(typeof window !== "undefined" ? window : globalThis);

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  filterCandidates,
  bestInformationGuess,
  scoreGuess,
} = require('../wordleLogic');

test('scoreGuess handles duplicate letters correctly', () => {
  assert.deepEqual(scoreGuess('sissy', 'piano'), [0, 2, 0, 0, 0]);
  assert.deepEqual(scoreGuess('sissy', 'phone'), [0, 0, 0, 0, 0]);
});

test('filterCandidates narrows to expected answers for ports feedback', () => {
  const rows = [{ guess: 'ports', states: [2, 1, 0, 0, 0] }];
  const words = ['piano', 'phony', 'phone', 'ports', 'spore'];
  assert.deepEqual(filterCandidates(rows, words), ['piano', 'phony', 'phone']);
});

test('bestInformationGuess prefers candidate guesses on equal information in non-hard mode', () => {
  const rows = [{ guess: 'ports', states: [2, 1, 0, 0, 0] }];
  const candidates = ['piano', 'phony', 'phone'];
  const allWords = [...candidates, 'sissy'];

  const best = bestInformationGuess(candidates, rows, false, allWords);

  assert.ok(candidates.includes(best.word), `expected a candidate guess but got ${best.word}`);
  assert.equal(best.word, 'phone');
  assert.equal(best.expectedRemaining, 1);
});

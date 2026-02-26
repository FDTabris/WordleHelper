const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreGuess, filterCandidates, bestInformationGuess } = require('../solver.js');

const WORDS = ['piano', 'phony', 'phone', 'sissy', 'opine'];

test('filterCandidates reproduces the ports clue example', () => {
  const rows = [{ guess: 'ports', states: [2, 1, 0, 0, 0] }];
  const candidates = filterCandidates(rows, WORDS);
  assert.deepEqual(candidates.sort(), ['phone', 'phony', 'piano']);
});

test('bestInformationGuess prefers remaining candidates when info gain ties', () => {
  const rows = [{ guess: 'ports', states: [2, 1, 0, 0, 0] }];
  const candidates = ['piano', 'phony', 'phone'];

  const result = bestInformationGuess(candidates, rows, false, WORDS);

  assert.ok(candidates.includes(result.word));
  assert.notEqual(result.word, 'sissy');
  assert.equal(result.infoGain, 2);
});

test('scoreGuess handles duplicate letters correctly', () => {
  assert.deepEqual(scoreGuess('sissy', 'phony'), [0, 0, 0, 0, 2]);
});

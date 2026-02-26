# WordleHelper

A simple single-page app that helps you decide your next Wordle guess without forcing instant spoilers.

## Features
- 6x5 board UI inspired by Wordle input workflow.
- Enter letters directly and click tiles to cycle state: gray → yellow → green.
- Request help gradually:
  - show remaining candidate count,
  - show one random candidate,
  - show the most-information guess,
  - or list all candidates.
- Hard mode toggle for most-information guess, enforcing that suggested guesses obey revealed green/yellow clues.
- Uses a vendored local 5-letter word list so the app works fully offline.
- Word list reference source: https://github.com/MikhaD/wordle/blob/main/src/words_5.ts

## Run locally
```bash
python -m http.server 4173
```
Then open `http://localhost:4173`.

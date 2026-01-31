# Idiomdle (Infinite Mode)

A Wordle x Duolingo-inspired idiom game with three phases:
1) **Recognition** — identify the language of the idiom.
2) **Construction** — drag-and-drop words to build the real meaning.
3) **Validation** — results, streak, and shareable grid.

## How to Run
Open `index.html` directly in your browser, or run a local server for best results:

```powershell
cd "$env:USERPROFILE\Desktop\coding practice stuff\idiomdle"
python -m http.server 8080
```

Then open:
```
http://localhost:8080
```

## Controls
- **Phase A**: Click a language choice.
- **Phase B**: Drag words into the tray (or click to move). Click words in tray to return.
- **Hint**: Click “Reveal Literal Hint” once per round.
- **Next**: Click “Next Idiom” after the result.
- **Share**: Click “Share” for emoji output (auto-copies if allowed).

## Data
Edit `idioms.json` to add more idioms. Each entry supports:
- `id`, `native`, `language`, `country_code`, `literal_english`, `true_meaning`
- `word_bank` (words for the correct meaning)
- `distractors` (extra words)
- `note` (optional cultural explanation)

## Notes
- This prototype is **infinite mode only**.
- Hint is limited to **once per round** and reduces score value.

const state = {
  idioms: [],
  current: null,
  streak: 0,
  phaseAComplete: false,
  phaseBComplete: false,
  hintUsed: false,
  score: 0,
};

const els = {
  nativeIdiom: document.getElementById('nativeIdiom'),
  countryFlag: document.getElementById('countryFlag'),
  languageChoices: document.getElementById('languageChoices'),
  phaseAFeedback: document.getElementById('phaseAFeedback'),
  wordBank: document.getElementById('bankTiles'),
  tray: document.getElementById('trayTiles'),
  phaseBFeedback: document.getElementById('phaseBFeedback'),
  hintButton: document.getElementById('hintButton'),
  literalHint: document.getElementById('literalHint'),
  checkButton: document.getElementById('checkButton'),
  resetTray: document.getElementById('resetTray'),
  streakValue: document.getElementById('streakValue'),
  progressFill: document.getElementById('progressFill'),
  resultCard: document.getElementById('resultCard'),
  resultText: document.getElementById('resultText'),
  culturalNote: document.getElementById('culturalNote'),
  nextRound: document.getElementById('nextRound'),
  shareButton: document.getElementById('shareButton'),
  shareOutput: document.getElementById('shareOutput'),
};

function shuffleBank(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function isSentenceCorrect(userWords, correctString) {
  const target = correctString.toLowerCase().replace(/[^\w\s]/g, '').split(' ');
  const attempt = userWords.map(w => w.toLowerCase().replace(/[^\w\s]/g, ''));
  return target.length === attempt.length && target.every((val, index) => val === attempt[index]);
}

function flagFromCountryCode(code) {
  if (!code) return '';
  const base = 0x1F1E6;
  return code
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(base + char.charCodeAt(0) - 65))
    .join('');
}

function uniqueLanguages() {
  return [...new Set(state.idioms.map(i => i.language))];
}

function buildChoices(correct) {
  const languages = uniqueLanguages().filter(l => l !== correct);
  const distractors = shuffleBank(languages).slice(0, 3);
  return shuffleBank([correct, ...distractors]);
}

function renderPhaseA() {
  els.phaseAFeedback.textContent = '';
  els.languageChoices.innerHTML = '';

  const choices = buildChoices(state.current.language);
  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice';
    btn.textContent = choice;
    btn.addEventListener('click', () => handleLanguageChoice(btn, choice));
    els.languageChoices.appendChild(btn);
  });
}

function handleLanguageChoice(button, choice) {
  if (state.phaseAComplete) return;

  const correct = state.current.language;
  const buttons = els.languageChoices.querySelectorAll('.choice');
  buttons.forEach(b => b.disabled = true);

  if (choice === correct) {
    button.classList.add('correct');
    state.phaseAComplete = true;
    els.phaseAFeedback.textContent = 'Correct! Phase A complete.';
  } else {
    button.classList.add('wrong');
    els.phaseAFeedback.textContent = `Incorrect. The language is ${correct}.`;
    state.phaseAComplete = true; // Phase A ends even if wrong
  }
  updateProgress();
}

function renderPhaseB() {
  state.hintUsed = false;
  els.literalHint.classList.add('hidden');
  els.literalHint.textContent = '';
  els.hintButton.disabled = false;
  els.phaseBFeedback.textContent = '';

  const words = [...state.current.word_bank, ...state.current.distractors];
  const shuffled = shuffleBank(words);
  els.wordBank.innerHTML = '';
  els.tray.innerHTML = '';

  shuffled.forEach(word => addTile(word, els.wordBank));
}

function addTile(word, container) {
  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.textContent = word;
  tile.setAttribute('draggable', 'true');

  tile.addEventListener('dragstart', () => {
    tile.classList.add('dragging');
    tile.dataset.dragging = 'true';
  });
  tile.addEventListener('dragend', () => {
    tile.classList.remove('dragging');
    tile.dataset.dragging = 'false';
  });
  tile.addEventListener('click', () => {
    if (container === els.wordBank) {
      els.tray.appendChild(tile);
    } else {
      els.wordBank.appendChild(tile);
    }
  });

  container.appendChild(tile);
}

function handleDrop(target) {
  const dragged = document.querySelector('.tile.dragging');
  if (!dragged) return;
  target.appendChild(dragged);
}

els.tray.addEventListener('dragover', (e) => {
  e.preventDefault();
});

els.tray.addEventListener('drop', (e) => {
  e.preventDefault();
  handleDrop(els.tray);
});

els.wordBank.addEventListener('dragover', (e) => {
  e.preventDefault();
});

els.wordBank.addEventListener('drop', (e) => {
  e.preventDefault();
  handleDrop(els.wordBank);
});

els.hintButton.addEventListener('click', () => {
  if (state.hintUsed) return;
  state.hintUsed = true;
  els.literalHint.classList.remove('hidden');
  els.literalHint.textContent = `Literal hint: ${state.current.literal_english}`;
  els.hintButton.disabled = true;
});

els.resetTray.addEventListener('click', () => {
  const tiles = Array.from(els.tray.children);
  tiles.forEach(tile => els.wordBank.appendChild(tile));
});

els.checkButton.addEventListener('click', () => {
  if (!state.phaseAComplete) {
    els.phaseBFeedback.textContent = 'Complete Phase A first.';
    return;
  }

  const selected = Array.from(els.tray.children).map(tile => tile.textContent);
  if (selected.length === 0) {
    els.phaseBFeedback.textContent = 'Build the sentence in the tray.';
    return;
  }

  const correct = isSentenceCorrect(selected, state.current.true_meaning);
  state.phaseBComplete = true;

  if (correct) {
    els.phaseBFeedback.textContent = 'Correct! Phase B complete.';
  } else {
    els.phaseBFeedback.textContent = `Not quite. Correct meaning: “${state.current.true_meaning}.”`;
  }

  updateProgress();
  endRound(correct);
});

els.nextRound.addEventListener('click', () => {
  loadNewRound();
});

els.shareButton.addEventListener('click', () => {
  const text = buildShareText();
  els.shareOutput.textContent = text;
  els.shareOutput.classList.remove('hidden');
  navigator.clipboard?.writeText(text).catch(() => {});
});

function endRound(phaseBCorrect) {
  const win = state.phaseAComplete && phaseBCorrect;
  if (win) {
    state.streak += 1;
    state.score += state.hintUsed ? 1 : 2;
  } else {
    state.streak = 0;
  }

  els.streakValue.textContent = state.streak;
  els.resultText.textContent = win ? 'Nice! You kept your streak.' : 'Round over. Streak reset.';
  els.culturalNote.textContent = state.current.note || '';
  els.resultCard.classList.remove('hidden');
}

function updateProgress() {
  let progress = 0;
  if (state.phaseAComplete) progress += 50;
  if (state.phaseBComplete) progress += 50;
  els.progressFill.style.width = `${progress}%`;
}

function buildShareText() {
  const flag = flagFromCountryCode(state.current.country_code);
  const phaseA = state.phaseAComplete ? '🟩' : '🟥';
  const phaseB = state.phaseBComplete ? '🟦' : '🟥';
  const hint = state.hintUsed ? '🟧' : '⬜';
  return `Idiomdle ${flag}\n${phaseA}${phaseB}${hint}\nStreak: ${state.streak}`;
}

function loadNewRound() {
  const pool = state.idioms;
  state.current = pool[Math.floor(Math.random() * pool.length)];
  state.phaseAComplete = false;
  state.phaseBComplete = false;
  state.hintUsed = false;
  els.resultCard.classList.add('hidden');
  els.shareOutput.classList.add('hidden');

  els.nativeIdiom.textContent = state.current.native;
  els.countryFlag.textContent = flagFromCountryCode(state.current.country_code);

  renderPhaseA();
  renderPhaseB();
  updateProgress();
}

async function init() {
  const res = await fetch('idioms.json');
  state.idioms = await res.json();
  els.streakValue.textContent = state.streak;
  loadNewRound();
}

init();

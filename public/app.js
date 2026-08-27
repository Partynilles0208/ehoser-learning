const gate = document.getElementById('gate');
const dashboard = document.getElementById('dashboard');
const gateMessage = document.getElementById('gateMessage');
const accessForm = document.getElementById('accessForm');
const codeInput = document.getElementById('codeInput');
const languageButtons = document.getElementById('languageButtons');
const wordForm = document.getElementById('wordForm');
const wordInput = document.getElementById('wordInput');
const wordLanguage = document.getElementById('wordLanguage');
const wordResult = document.getElementById('wordResult');
const translateForm = document.getElementById('translateForm');
const sourceText = document.getElementById('sourceText');
const sourceLang = document.getElementById('sourceLang');
const targetLang = document.getElementById('targetLang');
const translateResult = document.getElementById('translateResult');
const mathList = document.getElementById('mathList');
const germanList = document.getElementById('germanList');

const showMessage = (element, message, isError = false) => {
  element.textContent = message;
  element.style.color = isError ? '#fca5a5' : '#b7f7d4';
};

async function verifyAccessCode(code) {
  const response = await fetch(`/api/verify?code=${encodeURIComponent(code)}`);
  const data = await response.json();
  return data;
}

async function loadLanguages() {
  const response = await fetch('/api/languages');
  const data = await response.json();
  const languages = Object.values(data.languages);

  languageButtons.innerHTML = '';
  languages.forEach((language) => {
    const button = document.createElement('button');
    button.className = 'language-pill';
    button.type = 'button';
    button.textContent = `${language.flag} ${language.name}`;
    button.addEventListener('click', () => {
      wordLanguage.value = language.code;
      wordInput.value = '';
      wordInput.placeholder = language.code === 'en' ? 'hello' : language.code === 'fr' ? 'bonjour' : 'hallo';
      wordResult.innerHTML = `<strong>${language.flag} ${language.name}</strong><br>Wähle ein Wort und klicke auf Erklärung anzeigen.`;
      wordResult.classList.remove('empty');
    });
    languageButtons.appendChild(button);
  });
}

async function fetchWordExplanation() {
  const word = wordInput.value.trim();
  const lang = wordLanguage.value;

  if (!word) {
    wordResult.textContent = 'Bitte ein Wort eingeben.';
    wordResult.classList.remove('empty');
    return;
  }

  const response = await fetch(`/api/dictionary/${lang}/${encodeURIComponent(word)}`);
  const data = await response.json();

  wordResult.innerHTML = `
    <strong>${data.word}</strong><br>
    Übersetzung: ${data.translation}<br>
    Wortart: ${data.partOfSpeech}<br>
    Erklärung: ${data.explanation}<br>
    Synonyme: ${data.synonyms.join(', ')}<br>
    Beispiele: ${data.examples.join(' | ')}
  `;
  wordResult.classList.remove('empty');
}

async function translateText() {
  const text = sourceText.value.trim();
  if (!text) {
    translateResult.textContent = 'Bitte einen Text eingeben.';
    translateResult.classList.remove('empty');
    return;
  }

  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      sourceLang: sourceLang.value,
      targetLang: targetLang.value
    })
  });

  const data = await response.json();
  translateResult.innerHTML = `
    <strong>Übersetzung:</strong> ${data.translation || data.fallback || 'Keine Übersetzung'}<br>
    <strong>Hinweis:</strong> ${data.explanation || 'Daten werden angezeigt.'}
  `;
  translateResult.classList.remove('empty');
}

async function loadMathPractice() {
  const response = await fetch('/api/math');
  const data = await response.json();

  mathList.innerHTML = data.practice
    .map((item, index) => `
      <div class="lesson-item">
        <strong>Aufgabe ${index + 1}</strong>
        ${item.question}<br>
        <small>Hinweis: ${item.hint}</small>
      </div>
    `)
    .join('');
}

async function loadGermanPractice() {
  const response = await fetch('/api/german');
  const data = await response.json();

  germanList.innerHTML = data.practice
    .map((item, index) => `
      <div class="lesson-item">
        <strong>Übung ${index + 1}</strong>
        ${item.task}<br>
        <small>Tip: ${item.tip}</small>
      </div>
    `)
    .join('');
}

accessForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const code = codeInput.value.trim();
  const result = await verifyAccessCode(code);

  if (result.valid) {
    gate.classList.add('hidden');
    dashboard.classList.remove('hidden');
    loadLanguages();
    loadMathPractice();
    loadGermanPractice();
  } else {
    showMessage(gateMessage, 'Falscher Zugangscode. Der korrekte Code lautet 0028.', true);
  }
});

wordForm.addEventListener('submit', (event) => {
  event.preventDefault();
  fetchWordExplanation();
});

translateForm.addEventListener('submit', (event) => {
  event.preventDefault();
  translateText();
});

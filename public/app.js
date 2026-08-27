const gate = document.getElementById('gate');
const dashboard = document.getElementById('dashboard');
const gateMessage = document.getElementById('gateMessage');
const accessForm = document.getElementById('accessForm');
const codeInput = document.getElementById('codeInput');
const progressValue = document.getElementById('progressValue');
const progressFill = document.getElementById('progressFill');
const savedWordsList = document.getElementById('savedWordsList');
const resetProgressBtn = document.getElementById('resetProgressBtn');
const translateBtn = document.querySelector('.translate-btn');
const translationText = document.querySelector('.translator-form textarea');
const sourceLang = document.querySelectorAll('.translator-form select')[0];
const targetLang = document.querySelectorAll('.translator-form select')[1];

const STORAGE_KEYS = {
  auth: 'ehoser_learning_auth_state',
  profile: 'ehoser_learning_profile'
};

const buildDefaultProfile = () => ({
  savedWords: [],
  recentTranslations: [],
  streak: 0,
  lastLoginAt: null
});

const readProfile = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.profile);
    return raw ? { ...buildDefaultProfile(), ...JSON.parse(raw) } : buildDefaultProfile();
  } catch (error) {
    return buildDefaultProfile();
  }
};

const saveProfile = (profile) => {
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
};

const setAuthState = (enabled) => {
  localStorage.setItem(STORAGE_KEYS.auth, enabled ? 'true' : 'false');
};

const showMessage = (element, message, isError = false) => {
  element.textContent = message;
  element.style.color = isError ? '#ffb4b4' : '#dfffe9';
};

const setAuthenticatedView = (isAuthenticated) => {
  gate.classList.toggle('hidden', isAuthenticated);
  dashboard.classList.toggle('hidden', !isAuthenticated);
  localStorage.setItem('ehoser_learning_last_view', isAuthenticated ? 'dashboard' : 'gate');
};

const updateProgressUI = () => {
  const profile = readProfile();
  const savedWords = Array.isArray(profile.savedWords) ? profile.savedWords : [];
  const percent = Math.min(100, Math.round((savedWords.length / 8) * 100));

  if (progressValue) progressValue.textContent = `${percent}%`;
  if (progressFill) progressFill.style.width = `${percent}%`;

  if (savedWordsList) {
    if (!savedWords.length) {
      savedWordsList.innerHTML = '<li class="empty-state">Noch keine Wörter gespeichert.</li>';
      return;
    }

    savedWordsList.innerHTML = savedWords
      .slice(0, 5)
      .map((entry) => `<li><span>${entry.word}</span><small>${entry.translation}</small></li>`)
      .join('');
  }
};

const addSavedWord = (word, translation) => {
  const profile = readProfile();
  const normalizedWord = String(word || '').trim();
  const normalizedTranslation = String(translation || '').trim();

  if (!normalizedWord || !normalizedTranslation) return;

  const exists = profile.savedWords.some((item) => item.word.toLowerCase() === normalizedWord.toLowerCase());
  if (!exists) {
    profile.savedWords.unshift({ word: normalizedWord, translation: normalizedTranslation });
    profile.savedWords = profile.savedWords.slice(0, 8);
    saveProfile(profile);
    updateProgressUI();
  }
};

const persistRecentTranslation = (text, translation) => {
  const profile = readProfile();
  const item = { text: String(text || '').trim(), translation: String(translation || '').trim(), createdAt: new Date().toISOString() };

  if (!item.text || !item.translation) return;

  profile.recentTranslations = [item, ...(profile.recentTranslations || [])].slice(0, 4);
  saveProfile(profile);
};

const rememberLastLocale = () => {
  const remembered = localStorage.getItem('ehoser_learning_locale');
  if (remembered) {
    const [source, target] = remembered.split('|');
    if (source && sourceLang) sourceLang.value = source;
    if (target && targetLang) targetLang.value = target;
  }
};

async function checkSession() {
  const savedAuth = localStorage.getItem(STORAGE_KEYS.auth) === 'true';

  try {
    const response = await fetch('/api/session');
    const data = await response.json();
    const authenticated = Boolean(data.authenticated || savedAuth);
    setAuthenticatedView(authenticated);
    setAuthState(authenticated);
    return authenticated;
  } catch (error) {
    setAuthenticatedView(savedAuth);
    setAuthState(savedAuth);
    return savedAuth;
  }
}

async function loginWithCode(code) {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });

  const data = await response.json();
  return { ok: response.ok && data.ok, data };
}

async function translateCurrentText() {
  const value = (translationText.value || '').trim();
  const source = sourceLang.value;
  const target = targetLang.value;

  if (!value) {
    showMessage(gateMessage, 'Bitte zuerst einen Text eingeben.', true);
    return;
  }

  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: value, sourceLang: source, targetLang: target })
  });

  const data = await response.json();
  localStorage.setItem('ehoser_learning_locale', `${source}|${target}`);

  if (data && data.translation) {
    translationText.value = `${data.translation}`;
    persistRecentTranslation(value, data.translation);
    addSavedWord(value, data.translation);
    showMessage(gateMessage, 'Übersetzung gespeichert und im Lernfortschritt ergänzt.', false);
  } else {
    showMessage(gateMessage, data?.error || 'Übersetzung fehlgeschlagen.', true);
  }
}

accessForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const code = codeInput.value.trim();

  const { ok, data } = await loginWithCode(code);

  if (ok) {
    const profile = readProfile();
    profile.lastLoginAt = new Date().toISOString();
    saveProfile(profile);
    setAuthState(true);
    setAuthenticatedView(true);
    showMessage(gateMessage, 'Zugang freigeschaltet.', false);
    codeInput.value = '';
    return;
  }

  setAuthState(false);
  setAuthenticatedView(false);
  showMessage(gateMessage, data?.error || 'Zugang verweigert.', true);
});

if (resetProgressBtn) {
  resetProgressBtn.addEventListener('click', () => {
    const profile = buildDefaultProfile();
    saveProfile(profile);
    updateProgressUI();
    showMessage(gateMessage, 'Lernfortschritt zurückgesetzt.', false);
  });
}

if (translateBtn) {
  translateBtn.addEventListener('click', translateCurrentText);
}

if (sourceLang && targetLang) {
  [sourceLang, targetLang].forEach((field) => {
    field.addEventListener('change', () => {
      localStorage.setItem('ehoser_learning_locale', `${sourceLang.value}|${targetLang.value}`);
    });
  });
}

rememberLastLocale();
updateProgressUI();
checkSession();

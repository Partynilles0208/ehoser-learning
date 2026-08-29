let gate, dashboard, gateMessage, accessForm, codeInput, progressValue, progressFill, savedWordsList, resetProgressBtn, translateBtn, translationText, sourceLang, targetLang, translationResult, languageButtons, explainBtn, wordInput, wordLang, loginButton;

const STORAGE_KEYS = {
  auth: 'ehoser_learning_auth_state', // values: 'true' | 'false' | 'guest'
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

const setAuthState = (value) => {
  if (value === 'guest') {
    localStorage.setItem(STORAGE_KEYS.auth, 'guest');
  } else {
    localStorage.setItem(STORAGE_KEYS.auth, value ? 'true' : 'false');
  }
};

const getSavedAuthRaw = () => localStorage.getItem(STORAGE_KEYS.auth) || 'false';
const isSavedAuth = () => {
  const raw = getSavedAuthRaw();
  return raw === 'true' || raw === 'guest';
};
const isGuestAuth = () => getSavedAuthRaw() === 'guest';

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
  const savedAuth = isSavedAuth();

  try {
    const response = await fetch('/api/session');
    // handle non-OK (401) gracefully without throwing
    let data = { authenticated: false };
    try {
      data = await response.json();
    } catch (e) {
      data = { authenticated: false };
    }

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

// Make primary CTAs interactive: if user not authenticated, show gate (login)
const primaryButtons = document.querySelectorAll('.primary-btn');
if (primaryButtons && primaryButtons.length) {
  primaryButtons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const isAuth = localStorage.getItem(STORAGE_KEYS.auth) === 'true';
      if (!isAuth) {
        setAuthenticatedView(false);
        showMessage(gateMessage, 'Bitte zuerst einloggen (Zugangscode).', false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // if authenticated, try to scroll to main content
      const main = document.querySelector('.content-shell');
      if (main) main.scrollIntoView({ behavior: 'smooth' });
    });
  });
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
  const source = (sourceLang && sourceLang.value) || document.getElementById('translatorSource')?.value || 'de';
  const target = (targetLang && targetLang.value) || document.getElementById('translatorTarget')?.value || 'en';

  if (!value) {
    showMessage(gateMessage, 'Bitte zuerst einen Text eingeben.', true);
    return;
  }

  let data = null;
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: value, sourceLang: source, targetLang: target })
    });

    if (response.status === 401) {
      // server requires auth — fall back to demo translation in guest/local mode
      data = { translation: `Demo-Übersetzung für: ${value}`, provider: 'demo' };
    } else {
      data = await response.json();
    }
  } catch (err) {
    data = { translation: `Demo-Übersetzung für: ${value}`, provider: 'demo' };
  }
  localStorage.setItem('ehoser_learning_locale', `${source}|${target}`);

  if (data && data.translation) {
    translationText.value = `${data.translation}`;
    persistRecentTranslation(value, data.translation);
    addSavedWord(value, data.translation);
    if (translationResult) translationResult.textContent = data.translation;
    showMessage(gateMessage, 'Übersetzung gespeichert und im Lernfortschritt ergänzt.', false);
    // speak the translation
    try {
      const utter = new SpeechSynthesisUtterance(data.translation);
      const langMap = { en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', it: 'it-IT', zh: 'zh-CN' };
      utter.lang = langMap[target] || target || 'de-DE';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (e) {
      // ignore TTS failures
    }
  } else {
    showMessage(gateMessage, data?.error || 'Übersetzung fehlgeschlagen.', true);
  }
}

// Language selection buttons
if (languageButtons && languageButtons.length) {
  languageButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (!lang) return;
      // set translator source/target intelligently
      const src = document.getElementById('translatorSource');
      const tgt = document.getElementById('translatorTarget');
      if (src && tgt) {
        src.value = lang;
        // choose a sensible opposite target
        tgt.value = lang === 'de' ? 'en' : 'de';
      }
      showMessage(gateMessage, `Sprache gesetzt: ${lang}`, false);
    });
  });
}

// Dictionary explanation button
if (explainBtn && wordInput && wordLang) {
  explainBtn.addEventListener('click', async () => {
    const word = String(wordInput.value || '').trim();
    const lang = String(wordLang.value || 'en').toLowerCase();
    if (!word) {
      showMessage(gateMessage, 'Bitte zuerst ein Wort eingeben.', true);
      return;
    }

    try {
      const res = await fetch(`/api/dictionary/${lang}/${encodeURIComponent(word)}`);
      const data = await res.json();
      const container = document.getElementById('wordResult');
      if (container) {
        container.innerHTML = `<h4>${word} → ${data.translation || '—'}</h4>
          <p><strong>${data.partOfSpeech || ''}</strong></p>
          <p>${data.explanation || ''}</p>
          <p><em>${(data.examples || []).slice(0,2).join(' | ')}</em></p>
          <button id="saveWordBtn">Merken</button>`;

        const saveBtn = document.getElementById('saveWordBtn');
        if (saveBtn) saveBtn.addEventListener('click', () => {
          addSavedWord(word, data.translation || '—');
          showMessage(gateMessage, 'Wort zur Merkliste hinzugefügt.', false);
        });
      }
    } catch (err) {
      showMessage(gateMessage, 'Wortabfrage fehlgeschlagen.', true);
    }
  });
}

// Header login button: toggles login view or logs out
if (loginButton) {
  loginButton.addEventListener('click', async () => {
    const saved = getSavedAuthRaw();
    const isAuth = saved === 'true' || saved === 'guest';
    if (!isAuth) {
      // open gate/modal for login
      setAuthenticatedView(false);
      showMessage(gateMessage, 'Bitte Zugangscode eingeben oder als Gast fortfahren.', false);
      // scroll to top to reveal gate
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // if authenticated (including guest), perform logout
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (e) {}
    setAuthState(false);
    setAuthenticatedView(false);
    showMessage(gateMessage, 'Ausgeloggt.', false);
  });
}

// Auth modal behavior (for CTA)
const authModal = document.getElementById('authModal');
const modalLogin = document.getElementById('modalLogin');
const modalGuest = document.getElementById('modalGuest');

const showAuthModal = () => { if (authModal) { authModal.classList.remove('hidden'); authModal.setAttribute('aria-hidden','false'); } };
const hideAuthModal = () => { if (authModal) { authModal.classList.add('hidden'); authModal.setAttribute('aria-hidden','true'); } };

if (modalGuest) {
  modalGuest.addEventListener('click', () => {
    setAuthState('guest');
    setAuthenticatedView(true);
    hideAuthModal();
    showMessage(gateMessage, 'Du bist als Gast eingeloggt. Einige Funktionen sind demo-basiert.', false);
  });
}

if (modalLogin) {
  modalLogin.addEventListener('click', () => {
    hideAuthModal();
    setAuthenticatedView(false);
    // focus code input to allow login
    codeInput?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
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

document.addEventListener('DOMContentLoaded', () => {
  gate = document.getElementById('gate');
  dashboard = document.getElementById('dashboard');
  gateMessage = document.getElementById('gateMessage');
  accessForm = document.getElementById('accessForm');
  codeInput = document.getElementById('codeInput');
  progressValue = document.getElementById('progressValue');
  progressFill = document.getElementById('progressFill');
  savedWordsList = document.getElementById('savedWordsList');
  resetProgressBtn = document.getElementById('resetProgressBtn');
  translateBtn = document.querySelector('.translate-btn');
  translationText = document.getElementById('translatorText') || document.querySelector('.translator-form textarea');
  sourceLang = document.getElementById('translatorSource') || document.querySelectorAll('.translator-form select')[0];
  targetLang = document.getElementById('translatorTarget') || document.querySelectorAll('.translator-form select')[1];
  translationResult = document.getElementById('translationResult');
  languageButtons = document.querySelectorAll('.language-select-btn');
  explainBtn = document.getElementById('explainBtn');
  wordInput = document.getElementById('wordInput');
  wordLang = document.getElementById('wordLang');
  loginButton = document.querySelector('.login-button');

  rememberLastLocale();
  updateProgressUI();
  checkSession();

  // rebind interactive handlers that rely on DOM

  // Make primary CTAs interactive: if user not authenticated, show gate (login)
  const primaryButtons = document.querySelectorAll('.primary-btn');
  if (primaryButtons && primaryButtons.length) {
    primaryButtons.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const isAuth = localStorage.getItem(STORAGE_KEYS.auth) === 'true' || localStorage.getItem(STORAGE_KEYS.auth) === 'guest';
        if (!isAuth) {
          setAuthenticatedView(false);
          showMessage(gateMessage, 'Bitte zuerst einloggen (Zugangscode).', false);
          // try showing modal if available
          const authModal = document.getElementById('authModal');
          if (authModal) authModal.classList.remove('hidden');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        // if authenticated, try to scroll to main content
        const main = document.querySelector('.content-shell');
        if (main) main.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  // basic handlers
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

  // Language selection buttons
  if (languageButtons && languageButtons.length) {
    languageButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        if (!lang) return;
        // set translator source/target intelligently
        const src = document.getElementById('translatorSource');
        const tgt = document.getElementById('translatorTarget');
        if (src && tgt) {
          src.value = lang;
          // choose a sensible opposite target
          tgt.value = lang === 'de' ? 'en' : 'de';
        }
        showMessage(gateMessage, `Sprache gesetzt: ${lang}`, false);
      });
    });
  }

  // Header login button behavior
  if (loginButton) {
    loginButton.addEventListener('click', async () => {
      const saved = getSavedAuthRaw();
      const isAuth = saved === 'true' || saved === 'guest';
      if (!isAuth) {
        setAuthenticatedView(false);
        showMessage(gateMessage, 'Bitte Zugangscode eingeben oder als Gast fortfahren.', false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      try { await fetch('/api/logout', { method: 'POST' }); } catch (e) {}
      setAuthState(false);
      setAuthenticatedView(false);
      showMessage(gateMessage, 'Ausgeloggt.', false);
    });
  }

  // Auth modal handlers
  const modalGuest = document.getElementById('modalGuest');
  const modalLogin = document.getElementById('modalLogin');
  const authModal = document.getElementById('authModal');
  if (modalGuest) {
    modalGuest.addEventListener('click', () => {
      setAuthState('guest');
      setAuthenticatedView(true);
      if (authModal) authModal.classList.add('hidden');
      showMessage(gateMessage, 'Du bist als Gast eingeloggt. Einige Funktionen sind demo-basiert.', false);
    });
  }
  if (modalLogin) {
    modalLogin.addEventListener('click', () => {
      if (authModal) authModal.classList.add('hidden');
      setAuthenticatedView(false);
      codeInput?.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // dictionary explain button binding
  const explainBtnLocal = document.getElementById('explainBtn');
  const wordInputLocal = document.getElementById('wordInput');
  const wordLangLocal = document.getElementById('wordLang');
  if (explainBtnLocal && wordInputLocal && wordLangLocal) {
    explainBtnLocal.addEventListener('click', async () => {
      const word = String(wordInputLocal.value || '').trim();
      const lang = String(wordLangLocal.value || 'en').toLowerCase();
      if (!word) { showMessage(gateMessage, 'Bitte zuerst ein Wort eingeben.', true); return; }
      try {
        const res = await fetch(`/api/dictionary/${lang}/${encodeURIComponent(word)}`);
        const data = await res.json();
        const container = document.getElementById('wordResult');
        if (container) {
          container.innerHTML = `<h4>${word} → ${data.translation || '—'}</h4><p><strong>${data.partOfSpeech||''}</strong></p><p>${data.explanation||''}</p>`;
        }
      } catch (err) { showMessage(gateMessage, 'Wortabfrage fehlgeschlagen.', true); }
    });
  }

  // attach form submit
  if (accessForm) {
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
  }

});

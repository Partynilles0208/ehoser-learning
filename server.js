const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const ACCESS_CODE = (process.env.ACCESS_CODE || 'SET_YOUR_PRIVATE_ACCESS_CODE').toString();
const SESSION_COOKIE = 'ehoser_session';
const isVercel = !!process.env.VERCEL;

const languages = {
  en: { name: 'English', code: 'en', flag: '🇬🇧' },
  fr: { name: 'Französisch', code: 'fr', flag: '🇫🇷' },
  de: { name: 'Deutsch', code: 'de', flag: '🇩🇪' },
  es: { name: 'Spanisch', code: 'es', flag: '🇪🇸' },
  it: { name: 'Italienisch', code: 'it', flag: '🇮🇹' },
  tr: { name: 'Türkisch', code: 'tr', flag: '🇹🇷' }
};

const wordBank = {
  en: {
    hello: {
      translation: 'Hallo',
      partOfSpeech: 'Greeting',
      explanation: 'Used to greet someone in a friendly way.',
      synonyms: ['hi', 'hey', 'greetings'],
      similarWords: ['hi', 'hey', 'good morning'],
      helpfulNote: 'Merksatz: “Hello” ist der freundlichste Einstieg in ein Gespräch.',
      examples: ['Hello, how are you?', 'Hello there!']
    },
    book: {
      translation: 'Buch',
      partOfSpeech: 'Noun',
      explanation: 'A set of pages bound together to read.',
      synonyms: ['volume', 'novel', 'textbook'],
      similarWords: ['novel', 'magazine', 'library'],
      helpfulNote: 'Merksatz: A book is something you read, a library is where you find many books.',
      examples: ['I read a book every evening.', 'This book is interesting.']
    },
    learn: {
      translation: 'lernen',
      partOfSpeech: 'Verb',
      explanation: 'To gain knowledge and skills through study or practice.',
      synonyms: ['study', 'practice', 'master'],
      similarWords: ['study', 'practice', 'teach'],
      helpfulNote: 'Merksatz: Learn = Wissen aufnehmen, teach = Wissen weitergeben.',
      examples: ['I learn English every day.', 'She learns quickly.']
    },
    friend: {
      translation: 'Freund',
      partOfSpeech: 'Noun',
      explanation: 'A person you know well and like.',
      synonyms: ['companion', 'mate', 'buddy'],
      similarWords: ['buddy', 'mate', 'pal'],
      helpfulNote: 'Merksatz: friend = vertrauter Mensch, foe = Feind.',
      examples: ['My friend is very kind.', 'We are good friends.']
    }
  },
  fr: {
    bonjour: {
      translation: 'Hallo',
      partOfSpeech: 'Gruß',
      explanation: 'Ein freundlicher Begrüßungsausdruck.',
      synonyms: ['salut', 'bonsoir'],
      similarWords: ['salut', 'bonsoir', 'bonjour'],
      helpfulNote: 'Merksatz: Bonjour = tagsüber, Bonsoir = am Abend.',
      examples: ['Bonjour, comment ça va ?', 'Bonjour !']
    },
    livre: {
      translation: 'Buch',
      partOfSpeech: 'Substantiv',
      explanation: 'Ein gebundenes Werk zum Lesen.',
      synonyms: ['ouvrage', 'roman', 'tome'],
      similarWords: ['roman', 'bibliothèque', 'lecture'],
      helpfulNote: 'Merksatz: livre = Buch, bibliothèque = Bibliothek.',
      examples: ['J’aime ce livre.', 'Le livre est sur la table.']
    },
    apprendre: {
      translation: 'lernen',
      partOfSpeech: 'Verb',
      explanation: 'Etwas durch Studium und Übung verstehen oder kennen lernen.',
      synonyms: ['étudier', 'maîtriser', 'comprendre'],
      similarWords: ['étudier', 'comprendre', 'enseigner'],
      helpfulNote: 'Merksatz: apprendre = lernen, enseigner = lehren.',
      examples: ['Je veux apprendre le français.', 'Elle apprend vite.']
    },
    maison: {
      translation: 'Haus',
      partOfSpeech: 'Substantiv',
      explanation: 'Ein Ort, an dem man wohnt.',
      synonyms: ['domicile', 'habitation', 'foyer'],
      similarWords: ['maison', 'domicile', 'habiter'],
      helpfulNote: 'Merksatz: maison = Haus, habiter = wohnen.',
      examples: ['La maison est grande.', 'Je vis dans une maison.']
    }
  },
  de: {
    hallo: {
      translation: 'Hello',
      partOfSpeech: 'Gruß',
      explanation: 'Wird als freundlicher Einstieg verwendet.',
      synonyms: ['hi', 'servus', 'grüß dich'],
      similarWords: ['hi', 'servus', 'grüß dich'],
      helpfulNote: 'Merksatz: Hallo ist freundlich, Servus klingt lockerer.',
      examples: ['Hallo, wie geht es dir?', 'Hallo zusammen!']
    },
    buch: {
      translation: 'book',
      partOfSpeech: 'Substantiv',
      explanation: 'Eine Sammlung von Seiten, die man liest.',
      synonyms: ['Roman', 'Band', 'Werk'],
      similarWords: ['Lesen', 'Roman', 'Bibliothek'],
      helpfulNote: 'Merksatz: Das Buch liest man, die Bibliothek ist der Ort.',
      examples: ['Ich lese ein Buch.', 'Das Buch ist spannend.']
    },
    lernen: {
      translation: 'learn',
      partOfSpeech: 'Verb',
      explanation: 'Wissen und Fähigkeiten durch Studium oder Übung erwerben.',
      synonyms: ['studieren', 'üben', 'beherrschen'],
      similarWords: ['studieren', 'üben', 'wissen'],
      helpfulNote: 'Merksatz: lernen = Wissen aufnehmen, lehren = weitergeben.',
      examples: ['Ich lerne Deutsch.', 'Wir lernen jeden Tag.']
    },
    haus: {
      translation: 'house',
      partOfSpeech: 'Substantiv',
      explanation: 'Ein Ort zum Wohnen und Leben.',
      synonyms: ['Wohnung', 'Heim', 'Gebäude'],
      similarWords: ['Wohnung', 'Heim', 'Gebäude'],
      helpfulNote: 'Merksatz: Das Haus ist der Ort, die Wohnung ist oft innerer Raum.',
      examples: ['Das Haus ist groß.', 'Ich gehe nach Hause.']
    }
  }
};

const mathPractice = [
  { question: '12 × 8 = ?', answer: '96', hint: 'Rechne 12×8 = 96' },
  { question: '45 ÷ 5 = ?', answer: '9', hint: '5×9 = 45' },
  { question: '17 + 26 = ?', answer: '43', hint: '17 + 20 = 37, plus 6 = 43' },
  { question: '9² = ?', answer: '81', hint: '9×9 = 81' }
];

const germanPractice = [
  { task: 'Setze das richtige Wort ein: ___ ich heute in die Schule?', answer: 'Gehe', tip: 'Es geht um eine Bewegung in die Schule.' },
  { task: 'Wähle die richtige Übersetzung: “book”', answer: 'Buch', tip: 'Das Wort ist ein Gegenstand zum Lesen.' },
  { task: 'Finde das Gegenteil von “groß”', answer: 'klein', tip: 'Das Gegenteil ist kleiner.' }
];

function getSessionValue(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${SESSION_COOKIE}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.split('=')[1] || '');
}

function setSessionCookie(res) {
  const secure = isVercel ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=authorized; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function requireAuth(req, res, next) {
  if (getSessionValue(req) === 'authorized') {
    return next();
  }

  return res.status(401).json({ authenticated: false, error: 'Unauthorized' });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Ehoser Learning API is running.' });
});

app.post('/api/login', (req, res) => {
  const submittedCode = String(req.body?.code || '').trim();

  if (submittedCode !== ACCESS_CODE) {
    return res.status(401).json({ ok: false, error: 'Falscher Zugangscode.' });
  }

  setSessionCookie(res);
  return res.json({ ok: true, message: 'Zugang genehmigt.' });
});

app.post('/api/logout', (_req, res) => {
  clearSessionCookie(res);
  return res.json({ ok: true, message: 'Ausgeloggt.' });
});

app.get('/api/session', (req, res) => {
  if (getSessionValue(req) !== 'authorized') {
    return res.status(401).json({ authenticated: false, requiresLogin: true });
  }

  return res.json({ authenticated: true, requiresLogin: false });
});

app.get('/api/verify', (req, res) => {
  const code = (req.query.code || '').toString();
  const valid = code === ACCESS_CODE;

  res.json({
    valid,
    message: valid ? 'Zugang genehmigt.' : 'Falscher Zugangscode.'
  });
});

app.get('/api/languages', requireAuth, (_req, res) => {
  res.json({ languages });
});

app.get('/api/dictionary/:lang/:word', requireAuth, (req, res) => {
  const lang = (req.params.lang || 'en').toLowerCase();
  const word = (req.params.word || '').toLowerCase();
  const dictionary = wordBank[lang] || wordBank.en;
  const result = dictionary[word] || {
    translation: '—',
    partOfSpeech: 'Unknown',
    explanation: 'No entry found. Try a common word like hello, book or learn.',
    synonyms: ['similar word', 'related word'],
    similarWords: ['related word', 'support word', 'helper word'],
    helpfulNote: 'Tip: Try a word from the same topic or use the translation tool for more context.',
    examples: ['Example sentence will appear here.']
  };

  res.json({
    lang: languages[lang]?.name || lang,
    word,
    ...result
  });
});

app.post('/api/translate', requireAuth, async (req, res) => {
  const { text, sourceLang = 'de', targetLang = 'en' } = req.body || {};

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Bitte einen Text eingeben.' });
  }

  const resolvedApiKey = process.env.DEEPL_API_KEY;
  if (!resolvedApiKey) {
    const demo = {
      sourceLang,
      targetLang,
      translation: `Demo-Übersetzung für: ${text}`,
      provider: 'demo',
      explanation: 'DeepL-Schlüssel fehlt. Bitte in Vercel als DEEPL_API_KEY hinterlegen.'
    };
    return res.json(demo);
  }

  try {
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${resolvedApiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        text,
        source_lang: sourceLang.toUpperCase(),
        target_lang: targetLang.toUpperCase()
      })
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status}`);
    }

    const data = await response.json();
    const translation = data.translations?.[0]?.text || text;

    return res.json({
      sourceLang,
      targetLang,
      translation,
      provider: 'DeepL',
      explanation: 'Übersetzung aus der DeepL API.'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Translation failed',
      message: error.message,
      fallback: `Demo-Übersetzung: ${text}`
    });
  }
});

app.get('/api/math', requireAuth, (_req, res) => {
  res.json({ practice: mathPractice });
});

app.get('/api/german', requireAuth, (_req, res) => {
  res.json({ practice: germanPractice });
});

app.get('/api/config', requireAuth, (_req, res) => {
  res.json({
    hasDeepLKey: Boolean(process.env.DEEPL_API_KEY),
    mode: isVercel ? 'vercel' : 'local'
  });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (!isVercel && require.main === module) {
  app.listen(PORT, () => {
    console.log(`Ehoser Learning server running on http://localhost:${PORT}`);
    console.log(`Access code protected server-side. Value hidden from browser.`);
  });
}

module.exports = app;

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const ACCESS_CODE = (process.env.ACCESS_CODE || '0028').toString();

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
      examples: ['Hello, how are you?', 'Hello there!']
    },
    book: {
      translation: 'Buch',
      partOfSpeech: 'Noun',
      explanation: 'A set of pages bound together to read.',
      synonyms: ['volume', 'novel', 'textbook'],
      examples: ['I read a book every evening.', 'This book is interesting.']
    },
    learn: {
      translation: 'lernen',
      partOfSpeech: 'Verb',
      explanation: 'To gain knowledge and skills through study or practice.',
      synonyms: ['study', 'practice', 'master'],
      examples: ['I learn English every day.', 'She learns quickly.']
    }
  },
  fr: {
    bonjour: {
      translation: 'Hallo',
      partOfSpeech: 'Gruß',
      explanation: 'Ein freundlicher Begrüßungsausdruck.',
      synonyms: ['salut', 'bonsoir'],
      examples: ['Bonjour, comment ça va ?', 'Bonjour !']
    },
    livre: {
      translation: 'Buch',
      partOfSpeech: 'Substantiv',
      explanation: 'Ein gebundenes Werk zum Lesen.',
      synonyms: ['ouvrage', 'roman', 'tome'],
      examples: ['J’aime ce livre.', 'Le livre est sur la table.']
    },
    apprendre: {
      translation: 'lernen',
      partOfSpeech: 'Verb',
      explanation: 'Etwas durch Studium und Übung verstehen oder kennen lernen.',
      synonyms: ['étudier', 'maîtriser', 'comprendre'],
      examples: ['Je veux apprendre le français.', 'Elle apprend vite.']
    }
  },
  de: {
    hallo: {
      translation: 'Hello',
      partOfSpeech: 'Gruß',
      explanation: 'Wird als freundlicher Einstieg verwendet.',
      synonyms: ['hi', 'servus', 'grüß dich'],
      examples: ['Hallo, wie geht es dir?', 'Hallo zusammen!']
    },
    buch: {
      translation: 'book',
      partOfSpeech: 'Substantiv',
      explanation: 'Eine Sammlung von Seiten, die man liest.',
      synonyms: ['Roman', 'Band', 'Werk'],
      examples: ['Ich lese ein Buch.', 'Das Buch ist spannend.']
    },
    lernen: {
      translation: 'learn',
      partOfSpeech: 'Verb',
      explanation: 'Wissen und Fähigkeiten durch Studium oder Übung erwerben.',
      synonyms: ['studieren', 'üben', 'beherrschen'],
      examples: ['Ich lerne Deutsch.', 'Wir lernen jeden Tag.']
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

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Ehoser Learning API is running.' });
});

app.get('/api/verify', (req, res) => {
  const code = (req.query.code || '').toString();
  const valid = code === ACCESS_CODE;

  res.json({
    valid,
    accessCode: ACCESS_CODE,
    message: valid ? 'Zugang genehmigt.' : 'Falscher Zugangscode.'
  });
});

app.get('/api/languages', (_req, res) => {
  res.json({ languages });
});

app.get('/api/dictionary/:lang/:word', (req, res) => {
  const lang = (req.params.lang || 'en').toLowerCase();
  const word = (req.params.word || '').toLowerCase();
  const dictionary = wordBank[lang] || wordBank.en;
  const result = dictionary[word] || {
    translation: '—',
    partOfSpeech: 'Unknown',
    explanation: 'No entry found. Try a common word like hello, book or learn.',
    synonyms: ['similar word', 'related word'],
    examples: ['Example sentence will appear here.']
  };

  res.json({
    lang: languages[lang]?.name || lang,
    word,
    ...result
  });
});

app.post('/api/translate', async (req, res) => {
  const { text, sourceLang = 'de', targetLang = 'en' } = req.body || {};

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Bitte einen Text eingeben.' });
  }

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    const demo = {
      sourceLang,
      targetLang,
      translation: `Demo-Übersetzung für: ${text}`,
      provider: 'demo',
      explanation: 'DeepL-Schlüssel fehlt. Die App arbeitet mit Beispieldaten weiter.'
    };
    return res.json(demo);
  }

  try {
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
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

app.get('/api/math', (_req, res) => {
  res.json({ practice: mathPractice });
});

app.get('/api/german', (_req, res) => {
  res.json({ practice: germanPractice });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Ehoser Learning server running on http://localhost:${PORT}`);
  console.log(`Access code: ${ACCESS_CODE}`);
});

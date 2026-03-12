/* ══════════════════════════════════════════════
   LinguaFlow — app.js
   Full translator logic: translate, TTS, STT,
   auth (localStorage), history, file upload
   ══════════════════════════════════════════════ */

// ─── Language Data ───────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', name: 'English',    mymCode: 'en', voiceLang: 'en-US' },
  { code: 'hi', name: 'Hindi',      mymCode: 'hi', voiceLang: 'hi-IN' },
  { code: 'es', name: 'Spanish',    mymCode: 'es', voiceLang: 'es-ES' },
  { code: 'fr', name: 'French',     mymCode: 'fr', voiceLang: 'fr-FR' },
  { code: 'de', name: 'German',     mymCode: 'de', voiceLang: 'de-DE' },
  { code: 'zh', name: 'Chinese',    mymCode: 'zh', voiceLang: 'zh-CN' },
  { code: 'ja', name: 'Japanese',   mymCode: 'ja', voiceLang: 'ja-JP' },
  { code: 'ko', name: 'Korean',     mymCode: 'ko', voiceLang: 'ko-KR' },
  { code: 'ar', name: 'Arabic',     mymCode: 'ar', voiceLang: 'ar-SA' },
  { code: 'ru', name: 'Russian',    mymCode: 'ru', voiceLang: 'ru-RU' },
  { code: 'pt', name: 'Portuguese', mymCode: 'pt', voiceLang: 'pt-PT' },
  { code: 'it', name: 'Italian',    mymCode: 'it', voiceLang: 'it-IT' },
  { code: 'tr', name: 'Turkish',    mymCode: 'tr', voiceLang: 'tr-TR' },
  { code: 'id', name: 'Indonesian', mymCode: 'id', voiceLang: 'id-ID' },
  { code: 'bn', name: 'Bengali',    mymCode: 'bn', voiceLang: 'bn-BD' },
];

const FLAGS = { en:'🇺🇸', hi:'🇮🇳', es:'🇪🇸', fr:'🇫🇷', de:'🇩🇪', zh:'🇨🇳', ja:'🇯🇵', ko:'🇰🇷', ar:'🇸🇦', ru:'🇷🇺', pt:'🇵🇹', it:'🇮🇹', tr:'🇹🇷', id:'🇮🇩', bn:'🇧🇩' };

function langByCode(code) { return LANGUAGES.find(l => l.code === code) || LANGUAGES[0]; }
function langName(code)    { return langByCode(code).name; }

// ─── State ───────────────────────────────────────────────────────────────────
let currentUser = null;          // { name, email, createdAt }
let users        = [];           // all registered users (localStorage)
let history      = [];           // { id, sourceLang, targetLang, sourceText, translatedText, timestamp, saved }
let micActive    = false;
let recognition  = null;
let currentFile  = null;
let lastTranslation = null;      // { sourceText, translatedText, sourceLang, targetLang }
let speechSynth  = window.speechSynthesis;

// ─── LocalStorage Keys ───────────────────────────────────────────────────────
const LS_USERS   = 'lingua_users';
const LS_SESSION = 'lingua_session';
const LS_HISTORY = (email) => `lingua_history_${email}`;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  populateLangSelects();
  loadTheme();
  loadSession();
  bindEvents();
});

// ─── Populate selects ─────────────────────────────────────────────────────────
function populateLangSelects() {
  const src = document.getElementById('sourceLang');
  const tgt = document.getElementById('targetLang');

  // Source already has "Detect" as first option in HTML
  LANGUAGES.forEach(l => {
    const optSrc = new Option(`${FLAGS[l.code] || ''} ${l.name}`, l.code);
    const optTgt = new Option(`${FLAGS[l.code] || ''} ${l.name}`, l.code);
    src.appendChild(optSrc);
    tgt.appendChild(optTgt);
  });

  // Defaults: English → Spanish
  src.value = 'en';
  tgt.value = 'es';
}

// ─── Theme ────────────────────────────────────────────────────────────────────
function loadTheme() {
  const saved = localStorage.getItem('lingua_theme') || 'dark';
  applyTheme(saved);
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeToggle').querySelector('.theme-icon').textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('lingua_theme', theme);
}

// ─── Session ──────────────────────────────────────────────────────────────────
function loadSession() {
  users = JSON.parse(localStorage.getItem(LS_USERS) || '[]');
  const email = localStorage.getItem(LS_SESSION);
  if (email) {
    const user = users.find(u => u.email === email);
    if (user) setUser(user);
  }
}
function setUser(user) {
  currentUser = user;
  history = JSON.parse(localStorage.getItem(LS_HISTORY(user.email)) || '[]');
  document.getElementById('guestActions').classList.add('hidden');
  document.getElementById('userActions').classList.remove('hidden');
  document.getElementById('usernameDisplay').textContent = user.name;
  document.getElementById('avatarEl').textContent = user.name.charAt(0).toUpperCase();
  localStorage.setItem(LS_SESSION, user.email);
}
function clearUser() {
  currentUser = null; history = [];
  document.getElementById('guestActions').classList.remove('hidden');
  document.getElementById('userActions').classList.add('hidden');
  localStorage.removeItem(LS_SESSION);
}

// ─── Bind all events ──────────────────────────────────────────────────────────
function bindEvents() {
  // Theme
  document.getElementById('themeToggle').onclick = () => {
    const cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  };

  // Nav
  document.getElementById('loginBtn').onclick    = () => showModal('login');
  document.getElementById('registerBtn').onclick = () => showModal('register');
  document.getElementById('logoutBtn').onclick   = () => { clearUser(); showView('home'); toast('Logged out', 'info'); };
  document.getElementById('dashboardBtn').onclick = () => { showView('dashboard'); renderDashboard(); };
  document.getElementById('backHomeBtn').onclick  = () => showView('home');

  // Modal switches
  document.getElementById('switchToRegister').onclick = () => showModal('register');
  document.getElementById('switchToLogin').onclick    = () => showModal('login');
  document.getElementById('closeLoginModal').onclick  = closeModal;
  document.getElementById('closeRegisterModal').onclick = closeModal;
  document.getElementById('authModalOverlay').onclick = (e) => { if (e.target === e.currentTarget) closeModal(); };

  // Auth forms
  document.getElementById('loginForm').onsubmit    = handleLogin;
  document.getElementById('registerForm').onsubmit = handleRegister;

  // Translator
  document.getElementById('translateBtn').onclick = doTranslate;
  document.getElementById('swapBtn').onclick      = swapLanguages;
  document.getElementById('clearBtn').onclick     = clearSource;
  document.getElementById('copyBtn').onclick      = copyTranslation;
  document.getElementById('exportBtn').onclick    = exportTranslation;
  document.getElementById('saveBtn').onclick      = saveTranslation;
  document.getElementById('ttsBtn').onclick       = speakTranslation;
  document.getElementById('micBtn').onclick       = toggleMic;

  // Source text events
  const src = document.getElementById('sourceText');
  src.oninput = () => {
    updateCharCount();
    if (src.value.trim().length > 2) scheduleDetect();
  };
  src.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) doTranslate();
  });

  // File upload
  const fileInput   = document.getElementById('fileInput');
  const fileDropZone = document.getElementById('fileDropZone');
  fileInput.onchange        = (e) => handleFileSelect(e.target.files[0]);
  fileDropZone.onclick      = (e) => { if (e.target.tagName !== 'LABEL') fileInput.click(); };
  fileDropZone.ondragover   = (e) => { e.preventDefault(); fileDropZone.classList.add('drag-over'); };
  fileDropZone.ondragleave  = () => fileDropZone.classList.remove('drag-over');
  fileDropZone.ondrop       = (e) => { e.preventDefault(); fileDropZone.classList.remove('drag-over'); handleFileSelect(e.dataTransfer.files[0]); };
  fileDropZone.onkeydown    = (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); };
  document.getElementById('removeFileBtn').onclick     = removeFile;
  document.getElementById('translateFileBtn').onclick  = translateFile;

  // Quick lang chips
  document.querySelectorAll('.lang-chip').forEach(chip => {
    chip.onclick = () => {
      document.getElementById('targetLang').value = chip.dataset.lang;
      if (document.getElementById('sourceText').value.trim()) doTranslate();
    };
  });

  // Dashboard
  document.getElementById('clearHistoryBtn').onclick = clearHistory;
}

// ───────── Language detection debounce ──────────────────────────────────────
let detectTimer = null;
function scheduleDetect() {
  clearTimeout(detectTimer);
  detectTimer = setTimeout(detectLanguage, 800);
}
async function detectLanguage() {
  const text = document.getElementById('sourceText').value.trim();
  if (!text || text.length < 3) return;

  if (document.getElementById('sourceLang').value !== 'auto') {
    document.getElementById('detectedLabel').textContent = '';
    return;
  }

  try {
    // Use Google Translate to detect language — fast & reliable
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text.slice(0, 50))}`;
    const res  = await fetch(url);
    const data = await res.json();
    // data[2] contains the detected language code
    const detected = data[2];
    if (detected) {
      const lang = LANGUAGES.find(l => l.code === detected.toLowerCase());
      if (lang) {
        document.getElementById('detectedLabel').textContent = `Detected: ${FLAGS[lang.code] || ''} ${lang.name}`;
      }
    }
  } catch (_) { /* silent fail */ }
}

// ─── Translation ──────────────────────────────────────────────────────────────
async function doTranslate() {
  const text = document.getElementById('sourceText').value.trim();
  if (!text) { toast('Please enter text to translate', 'error'); return; }

  const srcVal = document.getElementById('sourceLang').value;
  const tgtVal = document.getElementById('targetLang').value;
  const srcCode = srcVal === 'auto' ? detectSrcCode() : srcVal;

  if (srcCode === tgtVal) { toast('Source and target languages are the same', 'error'); return; }

  setLoadingState(true);

  try {
    const translated = await translateText(text, srcCode, tgtVal);
    if (translated) {
      showTranslation(translated);
      lastTranslation = { sourceText: text, translatedText: translated, sourceLang: srcCode, targetLang: tgtVal };
      addToHistory(lastTranslation);
    }
  } catch (err) {
    console.error(err);
    toast('Translation failed. Please try again.', 'error');
    setLoadingState(false);
  }
}

function detectSrcCode() {
  // Try to infer detected lang from label, fallback to 'en'
  const label = document.getElementById('detectedLabel').textContent;
  for (const l of LANGUAGES) {
    if (label.includes(l.name)) return l.code;
  }
  return 'en';
}

async function translateText(text, srcCode, tgtCode) {
  // Google Translate public endpoint — fast, no API key needed
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcCode}&tl=${tgtCode}&dt=t&q=${encodeURIComponent(text)}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  // Response structure: [ [ ["translated", "original", ...], ... ], ... ]
  // Concatenate all translated segments
  if (Array.isArray(data) && Array.isArray(data[0])) {
    return data[0].map(seg => seg[0]).filter(Boolean).join('');
  }
  throw new Error('Unexpected response format');
}

function setLoadingState(loading) {
  const placeholder = document.getElementById('placeholderMsg');
  const translated  = document.getElementById('translatedText');
  const dots        = document.getElementById('loadingDots');
  const btn         = document.getElementById('translateBtn');

  if (loading) {
    placeholder.classList.add('hidden');
    translated.classList.add('hidden');
    dots.classList.remove('hidden');
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Translating…';
  } else {
    dots.classList.add('hidden');
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Translate';
  }
}

function showTranslation(text) {
  setLoadingState(false);
  const el = document.getElementById('translatedText');
  el.textContent = text;
  el.classList.remove('hidden');
  document.getElementById('placeholderMsg').classList.add('hidden');
}

// ─── Char counter ──────────────────────────────────────────────────────────────
function updateCharCount() {
  const val = document.getElementById('sourceText').value.length;
  document.getElementById('charCount').textContent = `${val} / 5000`;
}

// ─── Swap ─────────────────────────────────────────────────────────────────────
function swapLanguages() {
  const src = document.getElementById('sourceLang');
  const tgt = document.getElementById('targetLang');
  const srcTxt = document.getElementById('sourceText');
  const tgtTxt = document.getElementById('translatedText');

  if (src.value === 'auto') { toast('Select a specific source language first', 'info'); return; }

  const tmp = src.value;
  src.value = tgt.value;
  tgt.value = tmp;

  // Swap text too if translation exists
  if (tgtTxt.textContent.trim()) {
    srcTxt.value = tgtTxt.textContent;
    tgtTxt.textContent = '';
    document.getElementById('placeholderMsg').classList.remove('hidden');
    tgtTxt.classList.add('hidden');
    updateCharCount();
  }
}

// ─── Clear ────────────────────────────────────────────────────────────────────
function clearSource() {
  document.getElementById('sourceText').value = '';
  document.getElementById('translatedText').textContent = '';
  document.getElementById('translatedText').classList.add('hidden');
  document.getElementById('placeholderMsg').classList.remove('hidden');
  document.getElementById('detectedLabel').textContent = '';
  updateCharCount();
  lastTranslation = null;
}

// ─── Copy ─────────────────────────────────────────────────────────────────────
function copyTranslation() {
  const text = document.getElementById('translatedText').textContent;
  if (!text) { toast('Nothing to copy yet', 'error'); return; }
  navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard! 📋', 'success'));
}

// ─── Export ───────────────────────────────────────────────────────────────────
function exportTranslation() {
  if (!lastTranslation) { toast('No translation to export', 'error'); return; }
  const { sourceText, translatedText, sourceLang, targetLang } = lastTranslation;
  const content = `LinguaFlow Translation\n${'─'.repeat(40)}\nFrom: ${langName(sourceLang)}\nTo:   ${langName(targetLang)}\nDate: ${new Date().toLocaleString()}\n\n[Original]\n${sourceText}\n\n[Translation]\n${translatedText}`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `translation_${targetLang}_${Date.now()}.txt`;
  a.click(); URL.revokeObjectURL(url);
  toast('Exported as .txt ⬇', 'success');
}

// ─── TTS ──────────────────────────────────────────────────────────────────────
function speakTranslation() {
  const text = document.getElementById('translatedText').textContent;
  if (!text) { toast('No translation to speak', 'error'); return; }
  if (speechSynth.speaking) { speechSynth.cancel(); return; }

  const tgtCode  = document.getElementById('targetLang').value;
  const lang     = langByCode(tgtCode);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang  = lang.voiceLang;
  utterance.rate  = 0.9;

  // Pick best voice matching lang
  const voices = speechSynth.getVoices();
  const match  = voices.find(v => v.lang.startsWith(lang.voiceLang.split('-')[0]));
  if (match) utterance.voice = match;

  utterance.onend   = () => toast('', 'info', false); // silent
  utterance.onerror = () => toast('TTS not supported for this language', 'error');
  speechSynth.speak(utterance);
  toast(`Speaking in ${lang.name} 🔊`, 'success');
}

// ─── STT ──────────────────────────────────────────────────────────────────────
function toggleMic() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    toast('Speech recognition not supported in this browser', 'error');
    return;
  }

  if (micActive) {
    recognition && recognition.stop();
    micActive = false;
    document.getElementById('micBtn').classList.remove('active');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  const srcCode = document.getElementById('sourceLang').value;
  const lang    = langByCode(srcCode === 'auto' ? 'en' : srcCode);
  recognition.lang = lang.voiceLang;
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    micActive = true;
    document.getElementById('micBtn').classList.add('active');
    toast('Listening… speak now 🎙️', 'info');
  };
  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    document.getElementById('sourceText').value = transcript;
    updateCharCount();
    micActive = false;
    document.getElementById('micBtn').classList.remove('active');
    doTranslate();
  };
  recognition.onerror = (e) => {
    micActive = false;
    document.getElementById('micBtn').classList.remove('active');
    toast(`Mic error: ${e.error}`, 'error');
  };
  recognition.onend = () => {
    micActive = false;
    document.getElementById('micBtn').classList.remove('active');
  };

  recognition.start();
}

// ─── File Translation ─────────────────────────────────────────────────────────
function handleFileSelect(file) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['txt', 'pdf', 'docx'].includes(ext)) {
    toast('Unsupported file type. Use TXT, PDF, or DOCX', 'error');
    return;
  }
  currentFile = file;
  document.getElementById('fileDropZone').classList.add('hidden');
  document.getElementById('fileInfo').classList.remove('hidden');
  document.getElementById('fileName').textContent = file.name;
}
function removeFile() {
  currentFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('fileDropZone').classList.remove('hidden');
  document.getElementById('fileInfo').classList.add('hidden');
}
async function translateFile() {
  if (!currentFile) return;
  const ext = currentFile.name.split('.').pop().toLowerCase();

  if (ext === 'txt') {
    const text = await currentFile.text();
    document.getElementById('sourceText').value = text.slice(0, 5000);
    updateCharCount();
    await doTranslate();
    toast('File translated ✅', 'success');
  } else if (ext === 'pdf') {
    await extractAndTranslatePdf();
  } else if (ext === 'docx') {
    toast('DOCX support coming soon. Copy and paste the text for now.', 'info');
  }
}

async function extractAndTranslatePdf() {
  if (typeof pdfjsLib === 'undefined') {
    toast('PDF library not loaded. Check your internet connection.', 'error');
    return;
  }
  toast('Reading PDF… ⏳', 'info');
  try {
    const arrayBuffer = await currentFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    fullText = fullText.trim();
    if (!fullText) {
      toast('No readable text found in PDF (it may be a scanned image).', 'error');
      return;
    }
    document.getElementById('sourceText').value = fullText.slice(0, 5000);
    updateCharCount();
    await doTranslate();
    toast('PDF translated ✅', 'success');
  } catch (err) {
    console.error('PDF extraction error:', err);
    toast('Failed to read PDF. Make sure it contains selectable text.', 'error');
  }
}

// ─── History ──────────────────────────────────────────────────────────────────
function addToHistory(entry) {
  if (!currentUser) return;
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    ...entry,
    timestamp: new Date().toISOString(),
    saved: false,
  };
  history.unshift(item);
  if (history.length > 100) history.pop();
  saveHistoryLS();
}
function saveHistoryLS() {
  if (!currentUser) return;
  localStorage.setItem(LS_HISTORY(currentUser.email), JSON.stringify(history));
}
function saveTranslation() {
  if (!currentUser) { toast('Login to save translations', 'info'); showModal('login'); return; }
  if (!lastTranslation) { toast('Translate something first', 'error'); return; }

  // Mark in history
  const existing = history.find(h =>
    h.sourceText === lastTranslation.sourceText &&
    h.targetLang === lastTranslation.targetLang
  );
  if (existing) { existing.saved = true; saveHistoryLS(); }
  else { addToHistory({ ...lastTranslation, saved: true }); if (history[0]) history[0].saved = true; saveHistoryLS(); }

  toast('Saved to your collection 🔖', 'success');
}
function clearHistory() {
  if (!confirm('Clear all translation history?')) return;
  history = [];
  saveHistoryLS();
  renderDashboard();
  toast('History cleared', 'info');
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.classList.add('hidden');

  const user = users.find(u => u.email === email);
  if (!user) { showFormError(errEl, 'No account found with that email'); return; }
  if (user.passwordHash !== simpleHash(password)) { showFormError(errEl, 'Incorrect password'); return; }

  setUser(user); closeModal(); toast(`Welcome back, ${user.name}! 👋`, 'success');
  document.getElementById('loginForm').reset();
}

function handleRegister(e) {
  e.preventDefault();
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('regPassword').value;
  const errEl = document.getElementById('registerError');
  errEl.classList.add('hidden');

  if (!name || name.length < 2) { showFormError(errEl, 'Name must be at least 2 characters'); return; }
  if (!validateEmail(email))     { showFormError(errEl, 'Please enter a valid email'); return; }
  if (pass.length < 6)           { showFormError(errEl, 'Password must be at least 6 characters'); return; }
  if (users.find(u => u.email === email)) { showFormError(errEl, 'An account with this email already exists'); return; }

  const user = { name, email, passwordHash: simpleHash(pass), createdAt: new Date().toISOString() };
  users.push(user);
  localStorage.setItem(LS_USERS, JSON.stringify(users));
  setUser(user); closeModal(); toast(`Welcome aboard, ${name}! 🚀`, 'success');
  document.getElementById('registerForm').reset();
}

function showFormError(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }
function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

// Simple non-cryptographic hash (for demo — in production use proper hashing)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); hash = ((hash<<5)-hash)+c; hash|=0; }
  return hash.toString(36);
}

// ─── Modal helpers ────────────────────────────────────────────────────────────
function showModal(type) {
  const overlay = document.getElementById('authModalOverlay');
  overlay.classList.remove('hidden');
  if (type === 'login') {
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('registerModal').classList.add('hidden');
    setTimeout(() => document.getElementById('loginEmail').focus(), 100);
  } else {
    document.getElementById('registerModal').classList.remove('hidden');
    document.getElementById('loginModal').classList.add('hidden');
    setTimeout(() => document.getElementById('regName').focus(), 100);
  }
}
function closeModal() {
  document.getElementById('authModalOverlay').classList.add('hidden');
  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('registerError').classList.add('hidden');
}

// ─── View helpers ─────────────────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.classList.add('hidden');
  });
  const target = document.getElementById(`${name}View`);
  target.classList.remove('hidden');
  target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Dashboard rendering ──────────────────────────────────────────────────────
function renderDashboard() {
  if (!currentUser) { showView('home'); showModal('login'); return; }

  // Stats
  const saved = history.filter(h => h.saved).length;
  const langs = new Set(history.map(h => h.targetLang)).size;
  document.getElementById('totalTranslations').textContent = history.length;
  document.getElementById('savedCount').textContent        = saved;
  document.getElementById('langsUsed').textContent         = langs;

  // History
  const hList = document.getElementById('historyList');
  if (history.length === 0) {
    hList.innerHTML = '<div class="empty-state">No translations yet. Start translating!</div>';
  } else {
    hList.innerHTML = history.map(h => `
      <div class="history-item" onclick="loadHistoryItem('${h.id}')">
        <div class="item-langs">${FLAGS[h.sourceLang]||''} ${langName(h.sourceLang)} → ${FLAGS[h.targetLang]||''} ${langName(h.targetLang)} ${h.saved ? '🔖' : ''}</div>
        <div class="item-source">${escapeHtml(h.sourceText.slice(0,80))}${h.sourceText.length>80?'…':''}</div>
        <div class="item-target">${escapeHtml(h.translatedText.slice(0,80))}${h.translatedText.length>80?'…':''}</div>
        <div class="item-time">${formatTime(h.timestamp)}</div>
      </div>`).join('');
  }

  // Saved
  const sList = document.getElementById('savedList');
  const savedItems = history.filter(h => h.saved);
  if (savedItems.length === 0) {
    sList.innerHTML = '<div class="empty-state">No saved translations yet.</div>';
  } else {
    sList.innerHTML = savedItems.map(h => `
      <div class="saved-item" onclick="loadHistoryItem('${h.id}')">
        <div class="item-langs">${FLAGS[h.sourceLang]||''} ${langName(h.sourceLang)} → ${FLAGS[h.targetLang]||''} ${langName(h.targetLang)}</div>
        <div class="item-source">${escapeHtml(h.sourceText.slice(0,60))}${h.sourceText.length>60?'…':''}</div>
        <div class="item-target">${escapeHtml(h.translatedText.slice(0,60))}${h.translatedText.length>60?'…':''}</div>
      </div>`).join('');
  }

  // Account
  document.getElementById('accountInfo').innerHTML = `
    <div class="account-row">
      <span class="account-field-label">Display Name</span>
      <span class="account-field-value">${escapeHtml(currentUser.name)}</span>
    </div>
    <div class="account-row">
      <span class="account-field-label">Email</span>
      <span class="account-field-value">${escapeHtml(currentUser.email)}</span>
    </div>
    <div class="account-row">
      <span class="account-field-label">Member Since</span>
      <span class="account-joined">${formatTime(currentUser.createdAt)}</span>
    </div>`;
}

function loadHistoryItem(id) {
  const item = history.find(h => h.id === id);
  if (!item) return;
  showView('home');

  document.getElementById('sourceLang').value = item.sourceLang;
  document.getElementById('targetLang').value  = item.targetLang;
  document.getElementById('sourceText').value  = item.sourceText;
  updateCharCount();
  showTranslation(item.translatedText);
  lastTranslation = { sourceText: item.sourceText, translatedText: item.translatedText, sourceLang: item.sourceLang, targetLang: item.targetLang };
  toast('Loaded from history', 'info');
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function toast(msg, type = 'info', autoRemove = true) {
  if (!msg) return;
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;

  const icon = { success:'✅', error:'❌', info:'ℹ️' }[type] || 'ℹ️';
  el.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  container.appendChild(el);

  if (autoRemove) {
    setTimeout(() => {
      el.classList.add('toast-exit');
      el.addEventListener('animationend', () => el.remove());
    }, 3000);
  }
  return el;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(iso) {
  try {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch { return iso; }
}

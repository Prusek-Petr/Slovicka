/* ==========================================================================
   CAPTAIN VOCAB - VANILLA JS APPLICATION LOGIC
   Serverless PWA backed by GitHub REST API
   ========================================================================== */

(function () {
  'use strict';

  // LocalStorage Key for Credentials
  const STORAGE_CONFIG_KEY = 'captain_vocab_github_config';

  // Application State
  const state = {
    vocabulary: [],
    fileSha: null,
    isGitHubSynced: false,
    isSaving: false,
    hasPendingChanges: false,
    syncTimer: null,
    
    // Practice Tab State
    practiceQueue: [],
    currentPracticeIndex: 0,
    isFlipped: false,
    
    // List Tab State
    searchQuery: '',
    listLessonFilter: 'ALL',
  };

  // ==========================================================================
  // 1. GITHUB REST API HELPER MODULE
  // ==========================================================================
  const GitHubAPI = {
    getConfig() {
      try {
        const stored = localStorage.getItem(STORAGE_CONFIG_KEY);
        return stored ? JSON.parse(stored) : { owner: '', repo: '', path: 'slovicka_de_400.json', pat: '' };
      } catch (e) {
        return { owner: '', repo: '', path: 'slovicka_de_400.json', pat: '' };
      }
    },

    saveConfig(cfg) {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(cfg));
    },

    hasValidConfig() {
      const cfg = this.getConfig();
      return Boolean(cfg.owner && cfg.repo && cfg.path && cfg.pat);
    },

    // UTF-8 safe Base64 encoding/decoding
    utf8ToBase64(str) {
      return btoa(unescape(encodeURIComponent(str)));
    },

    base64ToUtf8(str) {
      // Remove any whitespace / newlines returned by GitHub API
      const cleanStr = str.replace(/\s/g, '');
      return decodeURIComponent(escape(atob(cleanStr)));
    },

    getAuthHeader(pat) {
      const clean = (pat || '').trim();
      if (clean.startsWith('Bearer ') || clean.startsWith('token ')) return clean;
      if (clean.startsWith('ghp_')) return `token ${clean}`;
      return `Bearer ${clean}`;
    },

    async fetchFile() {
      const cfg = this.getConfig();

      if (!this.hasValidConfig()) {
        console.warn('[GitHubAPI] Config missing or incomplete. Fetching local fallback JSON.');
        return await this.fetchLocalFallback();
      }

      try {
        const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
        const response = await fetch(url, {
          headers: {
            'Authorization': this.getAuthHeader(cfg.pat),
            'Accept': 'application/vnd.github.v3+json',
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          if (response.status === 404) throw new Error(`Soubor '${cfg.path}' nebyl v repozitáři nalezen.`);
          if (response.status === 401) throw new Error('Neplatný Personal Access Token (PAT).');
          throw new Error(`GitHub API chyba: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const jsonText = this.base64ToUtf8(data.content);
        const content = JSON.parse(jsonText);

        return { content, sha: data.sha, isGitHub: true };
      } catch (err) {
        console.warn('[GitHubAPI] Fetch error, falling back to local file:', err);
        const fallback = await this.fetchLocalFallback();
        fallback.warning = err.message;
        return fallback;
      }
    },

    async fetchLocalFallback() {
      const response = await fetch('./slovicka_de_400.json');
      if (!response.ok) throw new Error('Nepodařilo se načíst místní soubor slovicka_de_400.json');
      const content = await response.json();
      return { content, sha: null, isGitHub: false };
    },

    async saveFile(vocabularyData, commitMessage = 'Update vocabulary progress [auto-save]') {
      const cfg = this.getConfig();
      if (!this.hasValidConfig()) {
        throw new Error('Chybí konfigurace GitHub API. Zadejte PAT token a repo v nastavení.');
      }

      // If SHA is missing, fetch current file SHA first
      let currentSha = state.fileSha;
      const getUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
      
      if (!currentSha) {
        const getRes = await fetch(getUrl, {
          headers: {
            'Authorization': this.getAuthHeader(cfg.pat),
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          currentSha = getData.sha;
        }
      }

      const jsonString = JSON.stringify(vocabularyData, null, 2);
      const base64Content = this.utf8ToBase64(jsonString);

      const putBody = {
        message: commitMessage,
        content: base64Content,
        sha: currentSha
      };

      const putRes = await fetch(getUrl, {
        method: 'PUT',
        headers: {
          'Authorization': this.getAuthHeader(cfg.pat),
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(putBody)
      });

      if (!putRes.ok) {
        const errData = await putRes.json().catch(() => ({}));
        throw new Error(errData.message || `Chyba zápisu na GitHub (HTTP ${putRes.status})`);
      }

      const putData = await putRes.json();
      state.fileSha = putData.content.sha;
      return putData;
    }
  };


  // ==========================================================================
  // 2. DOM ELEMENTS CACHE
  // ==========================================================================
  const DOM = {
    syncStatus: document.getElementById('sync-status'),
    syncText: document.getElementById('sync-text'),
    btnOpenSettings: document.getElementById('btn-open-settings'),
    
    // Navigation
    navBtns: document.querySelectorAll('.nav-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Practice Tab
    practiceLessonSelect: document.getElementById('practice-lesson-select'),
    practiceFilterSelect: document.getElementById('practice-filter-select'),
    practiceProgressFill: document.getElementById('practice-progress-fill'),
    practiceCount: document.getElementById('practice-count'),
    practicePercent: document.getElementById('practice-percent'),
    
    flashcardWrapper: document.getElementById('flashcard-wrapper'),
    flashcard: document.getElementById('flashcard'),
    cardLessonTag: document.getElementById('card-lesson-tag'),
    btnSpeak: document.getElementById('btn-speak'),
    cardGerman: document.getElementById('card-german'),
    cardPronunciation: document.getElementById('card-pronunciation'),
    cardStoryBox: document.getElementById('card-story-box'),
    cardStory: document.getElementById('card-story'),
    cardCzech: document.getElementById('card-czech'),
    cardRepBadge: document.getElementById('card-rep-badge'),
    cardLastReviewed: document.getElementById('card-last-reviewed'),
    
    btnDontKnow: document.getElementById('btn-dont-know'),
    btnFlip: document.getElementById('btn-flip'),
    btnKnow: document.getElementById('btn-know'),
    
    // List Tab
    listSearchInput: document.getElementById('list-search-input'),
    listLessonFilter: document.getElementById('list-lesson-filter'),
    btnAddWord: document.getElementById('btn-add-word'),
    listCounter: document.getElementById('list-counter'),
    vocabTableBody: document.getElementById('vocab-table-body'),
    
    // Stats Tab
    statTotal: document.getElementById('stat-total'),
    statLearned: document.getElementById('stat-learned'),
    statMastery: document.getElementById('stat-mastery'),
    statUnlearned: document.getElementById('stat-unlearned'),
    lessonsBreakdown: document.getElementById('lessons-breakdown'),
    
    // Modals
    modalSettings: document.getElementById('modal-settings'),
    cfgOwner: document.getElementById('cfg-owner'),
    cfgRepo: document.getElementById('cfg-repo'),
    cfgPath: document.getElementById('cfg-path'),
    cfgPat: document.getElementById('cfg-pat'),
    settingsStatusMsg: document.getElementById('settings-status-msg'),
    btnTestConnection: document.getElementById('btn-test-connection'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    
    modalWord: document.getElementById('modal-word'),
    modalWordTitle: document.getElementById('modal-word-title'),
    wordEditIndex: document.getElementById('word-edit-index'),
    wordGerman: document.getElementById('word-german'),
    wordPronunciation: document.getElementById('word-pronunciation'),
    wordCzech: document.getElementById('word-czech'),
    wordStory: document.getElementById('word-story'),
    wordLesson: document.getElementById('word-lesson'),
    btnSaveWord: document.getElementById('btn-save-word'),
  };


  // ==========================================================================
  // 3. APPLICATION INITIALIZATION & SYNC
  // ==========================================================================
  async function initApp() {
    setupEventListeners();
    populateSettingsForm();
    registerServiceWorker();

    await loadVocabulary();
  }

  async function loadVocabulary() {
    updateSyncBadge('syncing', 'Načítám...');

    try {
      const res = await GitHubAPI.fetchFile();
      state.vocabulary = res.content || [];
      state.fileSha = res.sha;
      state.isGitHubSynced = res.isGitHub;

      if (res.isGitHub) {
        updateSyncBadge('online', 'Uloženo (GitHub)');
      } else {
        updateSyncBadge('offline', 'Místní JSON (Read Only)');
      }

      refreshAllViews();
    } catch (err) {
      console.error('[Init] Fatal error loading vocabulary:', err);
      updateSyncBadge('error', 'Chyba načítání');
      state.vocabulary = [];
      refreshAllViews();
    }
  }

  function updateSyncBadge(status, text) {
    DOM.syncStatus.className = `sync-badge sync-${status}`;
    DOM.syncText.textContent = text;
  }

  function refreshAllViews() {
    populateLessonDropdowns();
    updatePracticeQueue();
    renderTable();
    renderStats();
  }

  function triggerAutoSave(message = 'Update vocabulary progress [auto-save]') {
    // 1. Save locally immediately to prevent data loss
    try {
      localStorage.setItem('captain_vocab_backup', JSON.stringify(state.vocabulary));
    } catch (e) {
      console.warn('Nelze uložit lokální zálohu:', e);
    }

    if (!GitHubAPI.hasValidConfig()) {
      updateSyncBadge('offline', 'Místní (Neukládá na GitHub)');
      return;
    }

    if (!navigator.onLine) {
      updateSyncBadge('offline', 'Offline (Uloženo lokálně)');
      state.hasPendingChanges = true;
      return;
    }

    // 2. Set pending state and debounce
    state.hasPendingChanges = true;
    updateSyncBadge('syncing', 'Změny čekají (8s)...');

    if (state.syncTimer) {
      clearTimeout(state.syncTimer);
    }

    state.syncTimer = setTimeout(() => {
      forceSyncToGitHub(message);
    }, 8000);
  }

  async function forceSyncToGitHub(message = 'Update vocabulary progress [auto-save]') {
    if (!GitHubAPI.hasValidConfig()) {
      updateSyncBadge('offline', 'Místní (Neukládá na GitHub)');
      return;
    }

    if (!navigator.onLine) {
      updateSyncBadge('error', 'Není připojení');
      return;
    }

    if (state.isSaving) return;
    state.isSaving = true;
    
    // Clear the timer if it was triggered manually
    if (state.syncTimer) {
      clearTimeout(state.syncTimer);
      state.syncTimer = null;
    }

    updateSyncBadge('syncing', 'Ukládám na GitHub...');

    try {
      await GitHubAPI.saveFile(state.vocabulary, message);
      state.hasPendingChanges = false;
      updateSyncBadge('online', 'Uloženo (GitHub)');
      localStorage.removeItem('captain_vocab_backup'); // Clear local backup on success
    } catch (err) {
      console.error('[Save] Auto-save error:', err);
      updateSyncBadge('error', 'Chyba uložení ⚠');
      alert(`Chyba při ukládání na GitHub: ${err.message}`);
    } finally {
      state.isSaving = false;
    }
  }


  // ==========================================================================
  // 4. PRACTICE / FLASHCARDS MODULE
  // ==========================================================================
  function populateLessonDropdowns() {
    const lessons = Array.from(new Set(state.vocabulary.map(w => w.lesson || 'Ostatní'))).sort();
    
    // Practice dropdown
    const currentPracticeVal = DOM.practiceLessonSelect.value;
    DOM.practiceLessonSelect.innerHTML = '<option value="ALL">Všechny lekce</option>';
    lessons.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l;
      opt.textContent = l;
      DOM.practiceLessonSelect.appendChild(opt);
    });
    DOM.practiceLessonSelect.value = currentPracticeVal || 'ALL';

    // List dropdown
    const currentListVal = DOM.listLessonFilter.value;
    DOM.listLessonFilter.innerHTML = '<option value="ALL">Všechny lekce</option>';
    lessons.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l;
      opt.textContent = l;
      DOM.listLessonFilter.appendChild(opt);
    });
    DOM.listLessonFilter.value = currentListVal || 'ALL';
  }

  function updatePracticeQueue() {
    const selectedLesson = DOM.practiceLessonSelect.value;
    const selectedFilter = DOM.practiceFilterSelect.value;

    let items = state.vocabulary.map((item, index) => ({ item, index }));

    // Filter by lesson
    if (selectedLesson !== 'ALL') {
      items = items.filter(x => (x.item.lesson || 'Ostatní') === selectedLesson);
    }

    // Filter by learned status
    if (selectedFilter === 'UNLEARNED') {
      items = items.filter(x => !x.item.repetition || x.item.repetition === '0x');
    } else if (selectedFilter === 'LEARNED') {
      items = items.filter(x => x.item.repetition && x.item.repetition !== '0x');
    }

    state.practiceQueue = items;
    state.currentPracticeIndex = 0;
    state.isFlipped = false;
    DOM.flashcard.classList.remove('flipped');

    renderPracticeCard();
  }

  function renderPracticeCard() {
    const queueLength = state.practiceQueue.length;

    if (queueLength === 0) {
      DOM.cardGerman.textContent = '🎉 Hotovo!';
      DOM.cardPronunciation.textContent = 'Žádná další slovíčka k procvičení';
      DOM.cardCzech.textContent = 'Skvělá práce!';
      DOM.cardLessonTag.textContent = '-';
      DOM.cardStoryBox.style.display = 'none';
      DOM.cardRepBadge.textContent = '0x';
      DOM.cardLastReviewed.textContent = '';
      
      DOM.practiceProgressFill.style.width = '100%';
      DOM.practiceCount.textContent = '0 z 0';
      DOM.practicePercent.textContent = '100 %';
      return;
    }

    if (state.currentPracticeIndex >= queueLength) {
      state.currentPracticeIndex = 0;
    }

    const currentEntry = state.practiceQueue[state.currentPracticeIndex];
    const word = currentEntry.item;

    DOM.cardGerman.textContent = word.german || '-';
    DOM.cardPronunciation.textContent = word.pronunciation ? `[${word.pronunciation}]` : '';
    DOM.cardCzech.textContent = word.czech || '-';
    DOM.cardLessonTag.textContent = word.lesson || 'Všeobecné';
    DOM.cardRepBadge.textContent = word.repetition || '0x';
    DOM.cardLastReviewed.textContent = `Poslední revize: ${word.last_reviewed || 'nikdy'}`;

    if (word.story && word.story !== '-') {
      DOM.cardStoryBox.style.display = 'block';
      DOM.cardStory.textContent = word.story;
    } else {
      DOM.cardStoryBox.style.display = 'none';
    }

    // Update Progress
    const currentNum = state.currentPracticeIndex + 1;
    const pct = Math.round((currentNum / queueLength) * 100);
    DOM.practiceProgressFill.style.width = `${pct}%`;
    DOM.practiceCount.textContent = `Karta ${currentNum} z ${queueLength}`;
    DOM.practicePercent.textContent = `${pct} %`;
  }

  function flipCard() {
    state.isFlipped = !state.isFlipped;
    DOM.flashcard.classList.toggle('flipped', state.isFlipped);
  }

  function getTodayFormatted() {
    const d = new Date();
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  }

  function parseRepetitionCount(repStr) {
    if (!repStr) return 0;
    const match = repStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async function handlePracticeAction(isCorrect) {
    if (state.practiceQueue.length === 0) return;

    const currentEntry = state.practiceQueue[state.currentPracticeIndex];
    const targetWord = state.vocabulary[currentEntry.index];

    const currentReps = parseRepetitionCount(targetWord.repetition);
    const newReps = isCorrect ? currentReps + 1 : Math.max(0, currentReps - 1);

    targetWord.repetition = `${newReps}x`;
    targetWord.last_reviewed = getTodayFormatted();

    // Reset card flip
    state.isFlipped = false;
    DOM.flashcard.classList.remove('flipped');

    // Move to next card after flip animation reset
    setTimeout(() => {
      state.currentPracticeIndex++;
      if (state.currentPracticeIndex >= state.practiceQueue.length) {
        state.currentPracticeIndex = 0;
      }
      renderPracticeCard();
      renderStats();
    }, 200);

    // Trigger auto-save
    triggerAutoSave(`Update '${targetWord.german}': ${targetWord.repetition}`);
  }

  function speakGermanWord() {
    if (state.practiceQueue.length === 0) return;
    const currentEntry = state.practiceQueue[state.currentPracticeIndex];
    const text = currentEntry.item.german;
    if (!text || !('speechSynthesis' in window)) return;

    // Clean article prefix for speech synthesis if needed, or speak full word
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }


  // ==========================================================================
  // 5. VOCABULARY CRUD & LIST TAB MODULE
  // ==========================================================================
  function renderTable() {
    const search = state.searchQuery.toLowerCase();
    const lessonFilter = state.listLessonFilter;

    const filtered = state.vocabulary.filter(item => {
      const matchSearch = !search ||
        (item.german && item.german.toLowerCase().includes(search)) ||
        (item.czech && item.czech.toLowerCase().includes(search));

      const matchLesson = lessonFilter === 'ALL' || (item.lesson || 'Ostatní') === lessonFilter;

      return matchSearch && matchLesson;
    });

    DOM.listCounter.textContent = `Zobrazeno ${filtered.length} z ${state.vocabulary.length} slovíček`;
    DOM.vocabTableBody.innerHTML = '';

    filtered.forEach((item) => {
      const originalIndex = state.vocabulary.indexOf(item);
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td style="font-weight:700; color:#fff;">${escapeHtml(item.german || '')}</td>
        <td style="color:var(--primary); font-style:italic;">${escapeHtml(item.pronunciation || '')}</td>
        <td style="font-weight:600; color:var(--secondary);">${escapeHtml(item.czech || '')}</td>
        <td><span class="rep-badge">${escapeHtml(item.repetition || '0x')}</span></td>
        <td><span class="lesson-tag">${escapeHtml(item.lesson || 'Ostatní')}</span></td>
        <td>
          <div class="row-actions">
            <button class="btn-icon-action btn-edit" data-index="${originalIndex}" title="Upravit">✏️</button>
            <button class="btn-icon-action btn-icon-delete btn-delete" data-index="${originalIndex}" title="Smazat">🗑️</button>
          </div>
        </td>
      `;
      DOM.vocabTableBody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  function openAddModal() {
    DOM.modalWordTitle.textContent = '➕ Přidat slovíčko';
    DOM.wordEditIndex.value = '-1';
    DOM.wordGerman.value = '';
    DOM.wordPronunciation.value = '';
    DOM.wordCzech.value = '';
    DOM.wordStory.value = '';
    DOM.wordLesson.value = 'Základy - Lekce 1';
    
    openModal(DOM.modalWord);
  }

  function openEditModal(index) {
    const item = state.vocabulary[index];
    if (!item) return;

    DOM.modalWordTitle.textContent = '✏️ Upravit slovíčko';
    DOM.wordEditIndex.value = index;
    DOM.wordGerman.value = item.german || '';
    DOM.wordPronunciation.value = item.pronunciation || '';
    DOM.wordCzech.value = item.czech || '';
    DOM.wordStory.value = item.story || '';
    DOM.wordLesson.value = item.lesson || '';

    openModal(DOM.modalWord);
  }

  async function saveWordModal() {
    const index = parseInt(DOM.wordEditIndex.value, 10);
    const german = DOM.wordGerman.value.trim();
    const czech = DOM.wordCzech.value.trim();

    if (!german || !czech) {
      alert('Vyplňte prosím německé i české slovo.');
      return;
    }

    const wordData = {
      german,
      pronunciation: DOM.wordPronunciation.value.trim(),
      czech,
      story: DOM.wordStory.value.trim() || '-',
      repetition: index >= 0 ? state.vocabulary[index].repetition || '0x' : '0x',
      last_reviewed: index >= 0 ? state.vocabulary[index].last_reviewed || '-' : '-',
      date_learned: index >= 0 ? state.vocabulary[index].date_learned || getTodayFormatted() : getTodayFormatted(),
      lesson: DOM.wordLesson.value.trim() || 'Všeobecné'
    };

    if (index >= 0) {
      state.vocabulary[index] = wordData;
    } else {
      state.vocabulary.unshift(wordData);
    }

    closeModal(DOM.modalWord);
    refreshAllViews();

    const actionText = index >= 0 ? `Edit '${german}'` : `Add '${german}'`;
    triggerAutoSave(actionText);
  }

  async function deleteWord(index) {
    const item = state.vocabulary[index];
    if (!item) return;

    if (confirm(`Opravdu chcete smazat slovíčko '${item.german}'?`)) {
      state.vocabulary.splice(index, 1);
      refreshAllViews();
      triggerAutoSave(`Delete '${item.german}'`);
    }
  }


  // ==========================================================================
  // 6. STATISTICS MODULE
  // ==========================================================================
  function renderStats() {
    const total = state.vocabulary.length;
    const learned = state.vocabulary.filter(w => w.repetition && w.repetition !== '0x').length;
    const unlearned = total - learned;
    const masteryPct = total > 0 ? Math.round((learned / total) * 100) : 0;

    DOM.statTotal.textContent = total;
    DOM.statLearned.textContent = learned;
    DOM.statUnlearned.textContent = unlearned;
    DOM.statMastery.textContent = `${masteryPct} %`;

    // Lesson Breakdown
    const lessonsMap = {};
    state.vocabulary.forEach(w => {
      const les = w.lesson || 'Ostatní';
      if (!lessonsMap[les]) lessonsMap[les] = { total: 0, learned: 0 };
      lessonsMap[les].total++;
      if (w.repetition && w.repetition !== '0x') lessonsMap[les].learned++;
    });

    DOM.lessonsBreakdown.innerHTML = '';
    Object.keys(lessonsMap).sort().forEach(lesKey => {
      const data = lessonsMap[lesKey];
      const pct = Math.round((data.learned / data.total) * 100);

      const div = document.createElement('div');
      div.className = 'lesson-bar-item';
      div.innerHTML = `
        <div class="bar-header">
          <span>${escapeHtml(lesKey)}</span>
          <span>${data.learned} / ${data.total} (${pct} %)</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%;"></div>
        </div>
      `;
      DOM.lessonsBreakdown.appendChild(div);
    });
  }


  // ==========================================================================
  // 7. SETTINGS MODAL & EVENT HANDLERS
  // ==========================================================================
  function populateSettingsForm() {
    const cfg = GitHubAPI.getConfig();
    DOM.cfgOwner.value = cfg.owner || '';
    DOM.cfgRepo.value = cfg.repo || '';
    DOM.cfgPath.value = cfg.path || 'slovicka_de_400.json';
    DOM.cfgPat.value = cfg.pat || '';
  }

  async function testGitHubConnection() {
    const cfg = {
      owner: DOM.cfgOwner.value.trim(),
      repo: DOM.cfgRepo.value.trim(),
      path: DOM.cfgPath.value.trim() || 'slovicka_de_400.json',
      pat: DOM.cfgPat.value.trim()
    };

    if (!cfg.owner || !cfg.repo || !cfg.pat) {
      showSettingsStatus('Vyplňte prosím Vlastníka, Repozitář i PAT Token.', 'error');
      return;
    }

    showSettingsStatus('Testuji připojení k GitHub API...', 'info');

    try {
      const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': GitHubAPI.getAuthHeader(cfg.pat),
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        showSettingsStatus('✅ Připojení úspěšné! Repozitář a soubor jsou přístupné s právy pro zápis.', 'success');
      } else {
        const errJson = await response.json().catch(() => ({}));
        showSettingsStatus(`❌ Test selhal: ${errJson.message || response.statusText} (HTTP ${response.status})`, 'error');
      }
    } catch (err) {
      showSettingsStatus(`❌ Test selhal: ${err.message}`, 'error');
    }
  }

  async function saveSettingsModal() {
    const cfg = {
      owner: DOM.cfgOwner.value.trim(),
      repo: DOM.cfgRepo.value.trim(),
      path: DOM.cfgPath.value.trim() || 'slovicka_de_400.json',
      pat: DOM.cfgPat.value.trim()
    };

    GitHubAPI.saveConfig(cfg);
    closeModal(DOM.modalSettings);

    await loadVocabulary();
  }

  function showSettingsStatus(msg, type) {
    DOM.settingsStatusMsg.textContent = msg;
    DOM.settingsStatusMsg.className = `status-msg ${type}`;
    DOM.settingsStatusMsg.style.display = 'block';
  }

  function openModal(modalEl) {
    modalEl.classList.add('active');
  }

  function closeModal(modalEl) {
    modalEl.classList.remove('active');
  }


  // ==========================================================================
  // 8. EVENT LISTENERS & ROUTING
  // ==========================================================================
  function setupEventListeners() {
    // Navigation Tabs
    DOM.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        DOM.navBtns.forEach(b => b.classList.remove('active'));
        DOM.tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
      });
    });

    // Practice controls
    DOM.practiceLessonSelect.addEventListener('change', updatePracticeQueue);
    DOM.practiceFilterSelect.addEventListener('change', updatePracticeQueue);

    DOM.flashcard.addEventListener('click', (e) => {
      // Don't flip card if speak button was clicked
      if (e.target.closest('#btn-speak')) return;
      flipCard();
    });

    DOM.btnFlip.addEventListener('click', flipCard);
    DOM.btnKnow.addEventListener('click', () => handlePracticeAction(true));
    DOM.btnDontKnow.addEventListener('click', () => handlePracticeAction(false));
    DOM.btnSpeak.addEventListener('click', speakGermanWord);

    // List controls & CRUD
    DOM.listSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderTable();
    });

    DOM.listLessonFilter.addEventListener('change', (e) => {
      state.listLessonFilter = e.target.value;
      renderTable();
    });

    DOM.btnAddWord.addEventListener('click', openAddModal);

    DOM.vocabTableBody.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit');
      if (editBtn) {
        const idx = parseInt(editBtn.dataset.index, 10);
        openEditModal(idx);
        return;
      }

      const deleteBtn = e.target.closest('.btn-delete');
      if (deleteBtn) {
        const idx = parseInt(deleteBtn.dataset.index, 10);
        deleteWord(idx);
        return;
      }
    });

    // Settings Modal
    DOM.syncStatus.addEventListener('click', () => {
      if (state.hasPendingChanges && navigator.onLine) {
        forceSyncToGitHub('Ruční synchronizace změn');
      }
    });

    DOM.btnOpenSettings.addEventListener('click', () => {
      populateSettingsForm();
      DOM.settingsStatusMsg.style.display = 'none';
      openModal(DOM.modalSettings);
    });

    DOM.btnTestConnection.addEventListener('click', testGitHubConnection);
    DOM.btnSaveSettings.addEventListener('click', saveSettingsModal);
    DOM.btnSaveWord.addEventListener('click', saveWordModal);

    // Close Modals via overlay click or close button
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetModalId = btn.dataset.close;
        closeModal(document.getElementById(targetModalId));
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(overlay);
      });
    });

    // Keyboard Shortcuts for Practice Mode
    document.addEventListener('keydown', (e) => {
      const isPracticeActive = document.getElementById('tab-practice').classList.contains('active');
      const isModalActive = document.querySelector('.modal-overlay.active');
      if (!isPracticeActive || isModalActive) return;

      if (e.code === 'Space') {
        e.preventDefault();
        flipCard();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyV') {
        handlePracticeAction(true);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyN') {
        handlePracticeAction(false);
      }
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('[PWA] Service Worker registered with scope:', reg.scope))
          .catch(err => console.error('[PWA] Service Worker registration failed:', err));
      });
    }
  }

  // Start App
  document.addEventListener('DOMContentLoaded', initApp);

})();

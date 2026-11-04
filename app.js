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
    practiceStep: 'categories', // 'categories' | 'subcategories' | 'flashcards'
    selectedCategory: null,     // e.g. 'Duolingo', 'Základy', 'Úvodní lekce 1', 'ALL'
    selectedLesson: null,       // full lesson string or 'ALL_IN_CATEGORY' or 'ALL'
    practiceQueue: [],
    currentPracticeIndex: 0,
    isFlipped: false,

    // Review Tab State
    reviewStep: 'menu',         // 'menu' | 'flashcards'
    reviewMode: null,           // 'RANDOM_5_PROB' | 'LAST_5_REVIEWED' | 'ALL_PROB'
    reviewQueue: [],
    currentReviewIndex: 0,
    isReviewFlipped: false,
    
    // List Tab State
    searchQuery: '',
    listLessonFilter: 'ALL',
    listStatusFilter: 'ALL',
    listSortBy: 'DEFAULT',
    expandedStatsCategories: {},
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
      const cleanStr = str.replace(/\s/g, '');
      const binary = atob(cleanStr);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
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
        const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}?t=${Date.now()}`;
        const response = await fetch(url, {
          headers: {
            'Authorization': this.getAuthHeader(cfg.pat),
            'Accept': 'application/vnd.github.v3+json'
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
    practiceBreadcrumbs: document.getElementById('practice-breadcrumbs'),
    practiceCategoriesView: document.getElementById('practice-categories-view'),
    categoriesGrid: document.getElementById('categories-grid'),
    practiceSubcategoriesView: document.getElementById('practice-subcategories-view'),
    subcategoriesGrid: document.getElementById('subcategories-grid'),
    selectedCategoryTitle: document.getElementById('selected-category-title'),
    btnBackToCategories: document.getElementById('btn-back-to-categories'),
    practiceFlashcardView: document.getElementById('practice-flashcard-view'),
    btnBackToSubcategories: document.getElementById('btn-back-to-subcategories'),
    activeLessonTitle: document.getElementById('active-lesson-title'),

    practiceLessonSelect: document.getElementById('practice-lesson-select'),
    practiceFilterSelect: document.getElementById('practice-filter-select'),
    practiceProgressFill: document.getElementById('practice-progress-fill'),
    practiceCount: document.getElementById('practice-count'),
    practicePercent: document.getElementById('practice-percent'),
    
    flashcardWrapper: document.getElementById('flashcard-wrapper'),
    flashcard: document.getElementById('flashcard'),
    cardLessonTag: document.getElementById('card-lesson-tag'),
    btnCardToggleProb: document.getElementById('btn-card-toggle-prob'),
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

    // Review Tab
    reviewMenuView: document.getElementById('review-menu-view'),
    reviewModesGrid: document.getElementById('review-modes-grid'),
    reviewFlashcardView: document.getElementById('review-flashcard-view'),
    btnBackToReviewMenu: document.getElementById('btn-back-to-review-menu'),
    btnReshuffleReview: document.getElementById('btn-reshuffle-review'),
    reviewModeTitle: document.getElementById('review-mode-title'),
    reviewProgressFill: document.getElementById('review-progress-fill'),
    reviewCount: document.getElementById('review-count'),
    reviewPercent: document.getElementById('review-percent'),
    reviewFlashcard: document.getElementById('review-flashcard'),
    reviewCardLessonTag: document.getElementById('review-card-lesson-tag'),
    btnReviewToggleProb: document.getElementById('btn-review-toggle-prob'),
    btnReviewSpeak: document.getElementById('btn-review-speak'),
    reviewCardGerman: document.getElementById('review-card-german'),
    reviewCardPronunciation: document.getElementById('review-card-pronunciation'),
    reviewCardStoryBox: document.getElementById('review-card-story-box'),
    reviewCardStory: document.getElementById('review-card-story'),
    reviewCardCzech: document.getElementById('review-card-czech'),
    reviewCardRepBadge: document.getElementById('review-card-rep-badge'),
    reviewCardLastReviewed: document.getElementById('review-card-last-reviewed'),
    btnReviewDontKnow: document.getElementById('btn-review-dont-know'),
    btnReviewFlip: document.getElementById('btn-review-flip'),
    btnReviewKnow: document.getElementById('btn-review-know'),
    
    // List Tab
    listSearchInput: document.getElementById('list-search-input'),
    listLessonFilter: document.getElementById('list-lesson-filter'),
    listStatusFilter: document.getElementById('list-status-filter'),
    listSortSelect: document.getElementById('list-sort-select'),
    btnAddWord: document.getElementById('btn-add-word'),
    listCounter: document.getElementById('list-counter'),
    vocabTableBody: document.getElementById('vocab-table-body'),
    sortableHeaders: document.querySelectorAll('.sortable-th'),
    
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
    wordLearned: document.getElementById('word-learned'),
    wordProblematic: document.getElementById('word-problematic'),
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
      alert('Chyba načítání: ' + (err.stack || err.message));
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
    renderPracticeHierarchy();
    updatePracticeQueue();
    renderReviewMenu();
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
  // 4. PRACTICE / FLASHCARDS MODULE (HIERARCHICAL TILES)
  // ==========================================================================
  function isWordLearned(word) {
    if (!word) return false;
    if (typeof word.learned === 'boolean') return word.learned;
    return Boolean(word.repetition && word.repetition !== '0x');
  }

  function isWordProblematic(word) {
    return Boolean(word && word.problematic);
  }

  function parseLessonHierarchy(lessonStr) {
    const raw = (lessonStr || 'Ostatní').trim();
    if (raw.includes(' - ')) {
      const parts = raw.split(' - ');
      const category = parts[0].trim();
      const subcategory = parts.slice(1).join(' - ').trim();
      return { category, subcategory, fullLesson: raw };
    }
    const duoMatch = raw.match(/^(Duolingo)\s+(\d+)(.*)$/i);
    if (duoMatch) {
      return {
        category: parseInt(duoMatch[2], 10) > 50 ? 'Duolingo 3' : (parseInt(duoMatch[2], 10) > 25 ? 'Duolingo 2' : 'Duolingo 1'),
        subcategory: `Lekce ${duoMatch[2]}${duoMatch[3] || ''}`,
        fullLesson: raw
      };
    }
    return {
      category: raw,
      subcategory: raw,
      fullLesson: raw
    };
  }

  function getCategoryIcon(catName) {
    const lower = catName.toLowerCase();
    if (lower.includes('duolingo')) return '🦉';
    if (lower.includes('základy') || lower.includes('zaklady')) return '🧱';
    if (lower.includes('úvodní') || lower.includes('uvodni')) return '🚀';
    if (lower === 'all') return '🌟';
    return '📁';
  }

  function buildHierarchyStats() {
    const categoriesMap = {};

    state.vocabulary.forEach((word) => {
      const { category, subcategory, fullLesson } = parseLessonHierarchy(word.lesson);
      const isLearned = isWordLearned(word);

      if (!categoriesMap[category]) {
        categoriesMap[category] = {
          name: category,
          total: 0,
          learned: 0,
          subcategories: {}
        };
      }

      categoriesMap[category].total++;
      if (isLearned) categoriesMap[category].learned++;

      if (!categoriesMap[category].subcategories[fullLesson]) {
        categoriesMap[category].subcategories[fullLesson] = {
          fullLesson,
          subName: subcategory,
          total: 0,
          learned: 0
        };
      }

      categoriesMap[category].subcategories[fullLesson].total++;
      if (isLearned) categoriesMap[category].subcategories[fullLesson].learned++;
    });

    return categoriesMap;
  }

  function naturalSort(a, b) {
    return a.localeCompare(b, 'cs', { numeric: true, sensitivity: 'base' });
  }

  function createTileElement({ icon, title, subtitle, total, learned, badgeText, extraClass = '', onClick }) {
    const pct = total > 0 ? Math.round((learned / total) * 100) : 0;
    const isCompleted = total > 0 && learned === total;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tile-card ${extraClass} ${isCompleted ? 'tile-completed' : ''}`.trim();

    btn.innerHTML = `
      <div>
        <div class="tile-header">
          <span class="tile-icon">${icon}</span>
          <span class="tile-badge">${escapeHtml(badgeText || `${total} slov`)}</span>
        </div>
        <div class="tile-title" style="margin-top: 10px;">${escapeHtml(title)}</div>
        ${subtitle ? `<div class="tile-sub">${escapeHtml(subtitle)}</div>` : ''}
      </div>
      <div class="tile-progress">
        <div class="tile-progress-bar">
          <div class="tile-progress-fill" style="width: ${pct}%;"></div>
        </div>
        <div class="tile-progress-text">
          <span>Naučeno: ${learned}/${total}</span>
          <span>${pct} %</span>
        </div>
      </div>
    `;

    btn.addEventListener('click', onClick);
    return btn;
  }

  function renderPracticeBreadcrumbs() {
    DOM.practiceBreadcrumbs.innerHTML = '';

    const homeBtn = document.createElement('button');
    homeBtn.type = 'button';
    homeBtn.className = state.practiceStep === 'categories' ? 'crumb-current' : 'crumb-btn';
    homeBtn.textContent = '🏠 Kategorie';
    if (state.practiceStep !== 'categories') {
      homeBtn.addEventListener('click', () => navigatePracticeStep('categories'));
    }
    DOM.practiceBreadcrumbs.appendChild(homeBtn);

    if (state.practiceStep === 'subcategories' && state.selectedCategory) {
      const sep = document.createElement('span');
      sep.className = 'crumb-sep';
      sep.textContent = '›';
      DOM.practiceBreadcrumbs.appendChild(sep);

      const catSpan = document.createElement('span');
      catSpan.className = 'crumb-current';
      catSpan.textContent = state.selectedCategory;
      DOM.practiceBreadcrumbs.appendChild(catSpan);
    } else if (state.practiceStep === 'flashcards') {
      if (state.selectedCategory && state.selectedCategory !== 'ALL') {
        const sep1 = document.createElement('span');
        sep1.className = 'crumb-sep';
        sep1.textContent = '›';
        DOM.practiceBreadcrumbs.appendChild(sep1);

        const catBtn = document.createElement('button');
        catBtn.type = 'button';
        catBtn.className = 'crumb-btn';
        catBtn.textContent = state.selectedCategory;
        catBtn.addEventListener('click', () => navigatePracticeStep('subcategories', state.selectedCategory));
        DOM.practiceBreadcrumbs.appendChild(catBtn);
      }

      const sep2 = document.createElement('span');
      sep2.className = 'crumb-sep';
      sep2.textContent = '›';
      DOM.practiceBreadcrumbs.appendChild(sep2);

      const lessonSpan = document.createElement('span');
      lessonSpan.className = 'crumb-current';
      if (state.selectedLesson === 'ALL') {
        lessonSpan.textContent = 'Všechna slovíčka';
      } else if (state.selectedLesson === 'ALL_IN_CATEGORY') {
        lessonSpan.textContent = `Vše v ${state.selectedCategory}`;
      } else {
        const parsed = parseLessonHierarchy(state.selectedLesson);
        lessonSpan.textContent = parsed.subcategory;
      }
      DOM.practiceBreadcrumbs.appendChild(lessonSpan);
    }
  }

  function navigatePracticeStep(step, category = state.selectedCategory, lesson = state.selectedLesson) {
    state.practiceStep = step;
    state.selectedCategory = category;
    state.selectedLesson = lesson;
    renderPracticeHierarchy();
    if (step === 'flashcards') {
      updatePracticeQueue();
    }
  }

  function renderPracticeHierarchy() {
    renderPracticeBreadcrumbs();

    DOM.practiceCategoriesView.style.display = state.practiceStep === 'categories' ? 'block' : 'none';
    DOM.practiceSubcategoriesView.style.display = state.practiceStep === 'subcategories' ? 'block' : 'none';
    DOM.practiceFlashcardView.style.display = state.practiceStep === 'flashcards' ? 'block' : 'none';

    const hierarchy = buildHierarchyStats();

    // 1. Render Categories Grid
    if (state.practiceStep === 'categories') {
      DOM.categoriesGrid.innerHTML = '';

      // Priority order: Duolingo, Základy, Úvodní lekce 1, then alphabetical
      // Priority order: Duolingo 1, 2, 3, Základy, Úvodní lekce 1, then alphabetical
      const priorityOrder = ['Duolingo 1', 'Duolingo 2', 'Duolingo 3', 'Základy', 'Úvodní lekce 1'];
      const catKeys = Object.keys(hierarchy).sort((a, b) => {
        const idxA = priorityOrder.indexOf(a);
        const idxB = priorityOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return naturalSort(a, b);
      });

      catKeys.forEach(catKey => {
        const catData = hierarchy[catKey];
        const subCount = Object.keys(catData.subcategories).length;
        const tile = createTileElement({
          icon: getCategoryIcon(catKey),
          title: catKey,
          subtitle: `${subCount} ${subCount === 1 ? 'lekce' : (subCount >= 2 && subCount <= 4 ? 'lekce' : 'lekcí')}`,
          total: catData.total,
          learned: catData.learned,
          badgeText: `${catData.total} slov`,
          onClick: () => navigatePracticeStep('subcategories', catKey, null)
        });
        DOM.categoriesGrid.appendChild(tile);
      });

      // Add "Všechny kategorie" tile at the end
      const totalWords = state.vocabulary.length;
      const totalLearned = state.vocabulary.filter(w => isWordLearned(w)).length;
      if (totalWords > 0) {
        const allTile = createTileElement({
          icon: '🌟',
          title: 'Všechna slovíčka',
          subtitle: 'Procvičovat napříč všemi kategoriemi',
          total: totalWords,
          learned: totalLearned,
          badgeText: `Vše (${totalWords})`,
          extraClass: 'tile-all',
          onClick: () => navigatePracticeStep('flashcards', 'ALL', 'ALL')
        });
        DOM.categoriesGrid.appendChild(allTile);
      }
    }

    // 2. Render Subcategories Grid
    if (state.practiceStep === 'subcategories' && state.selectedCategory) {
      DOM.subcategoriesGrid.innerHTML = '';
      const catData = hierarchy[state.selectedCategory];

      if (!catData) {
        navigatePracticeStep('categories', null, null);
        return;
      }

      DOM.selectedCategoryTitle.textContent = `${getCategoryIcon(state.selectedCategory)} ${state.selectedCategory}`;

      const subKeys = Object.keys(catData.subcategories).sort((a, b) => {
        return naturalSort(catData.subcategories[a].subName, catData.subcategories[b].subName);
      });

      // If more than 1 subcategory, offer "Vše v kategorii" tile first
      if (subKeys.length > 1) {
        const allCatTile = createTileElement({
          icon: '⚡',
          title: `Vše z kategorie ${state.selectedCategory}`,
          subtitle: `Všech ${subKeys.length} lekcí dohromady`,
          total: catData.total,
          learned: catData.learned,
          badgeText: `${catData.total} slov`,
          extraClass: 'tile-all',
          onClick: () => navigatePracticeStep('flashcards', state.selectedCategory, 'ALL_IN_CATEGORY')
        });
        DOM.subcategoriesGrid.appendChild(allCatTile);
      }

      subKeys.forEach(fullLessonKey => {
        const subData = catData.subcategories[fullLessonKey];
        const tile = createTileElement({
          icon: '📘',
          title: subData.subName,
          subtitle: fullLessonKey !== subData.subName ? fullLessonKey : '',
          total: subData.total,
          learned: subData.learned,
          badgeText: `${subData.total} slov`,
          onClick: () => navigatePracticeStep('flashcards', state.selectedCategory, fullLessonKey)
        });
        DOM.subcategoriesGrid.appendChild(tile);
      });
    }

    // 3. Update active header badge in Flashcard step
    if (state.practiceStep === 'flashcards') {
      if (state.selectedLesson === 'ALL') {
        DOM.activeLessonTitle.textContent = '🌟 Všechna slovíčka';
      } else if (state.selectedLesson === 'ALL_IN_CATEGORY') {
        DOM.activeLessonTitle.textContent = `⚡ ${state.selectedCategory} (Vše)`;
      } else {
        DOM.activeLessonTitle.textContent = `📘 ${state.selectedLesson}`;
      }
    }
  }

  function populateLessonDropdowns() {
    const lessons = Array.from(new Set(state.vocabulary.map(w => w.lesson || 'Ostatní'))).sort(naturalSort);
    
    // Practice dropdown (legacy hidden)
    if (DOM.practiceLessonSelect) {
      const currentPracticeVal = DOM.practiceLessonSelect.value;
      DOM.practiceLessonSelect.innerHTML = '<option value="ALL">Všechny lekce</option>';
      lessons.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l;
        opt.textContent = l;
        DOM.practiceLessonSelect.appendChild(opt);
      });
      DOM.practiceLessonSelect.value = currentPracticeVal || 'ALL';
    }

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
    const selectedFilter = DOM.practiceFilterSelect.value;

    let items = state.vocabulary.map((item, index) => ({ item, index }));

    // Filter by hierarchical selection
    if (state.selectedLesson && state.selectedLesson !== 'ALL') {
      if (state.selectedLesson === 'ALL_IN_CATEGORY' && state.selectedCategory) {
        items = items.filter(x => parseLessonHierarchy(x.item.lesson).category === state.selectedCategory);
      } else {
        items = items.filter(x => (x.item.lesson || 'Ostatní') === state.selectedLesson);
      }
    } else if (state.selectedCategory && state.selectedCategory !== 'ALL') {
      items = items.filter(x => parseLessonHierarchy(x.item.lesson).category === state.selectedCategory);
    }

    // Filter by learned / problematic status
    if (selectedFilter === 'UNLEARNED') {
      items = items.filter(x => !isWordLearned(x.item));
    } else if (selectedFilter === 'LEARNED') {
      items = items.filter(x => isWordLearned(x.item));
    } else if (selectedFilter === 'PROBLEMATIC') {
      items = items.filter(x => isWordProblematic(x.item));
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
      if (DOM.btnCardToggleProb) DOM.btnCardToggleProb.style.display = 'none';
      
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

    if (DOM.btnCardToggleProb) {
      DOM.btnCardToggleProb.style.display = 'inline-flex';
      const isProb = isWordProblematic(word);
      DOM.btnCardToggleProb.className = isProb ? 'status-pill pill-problematic' : 'status-pill pill-problematic-off';
      DOM.btnCardToggleProb.textContent = isProb ? '⚠️ Problémové' : '⚠️ Označit problémové';
    }

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
    targetWord.learned = newReps > 0;
    targetWord.last_reviewed = getTodayFormatted();
    targetWord.last_reviewed_ts = Date.now();

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
      renderPracticeHierarchy();
      renderReviewMenu();
      renderStats();
    }, 200);

    // Trigger auto-save
    triggerAutoSave(`Update '${targetWord.german}': ${targetWord.repetition}`);
  }

  function speakTextGerman(text) {
    if (!text || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  function speakGermanWord() {
    if (state.practiceQueue.length === 0) return;
    const currentEntry = state.practiceQueue[state.currentPracticeIndex];
    speakTextGerman(currentEntry.item.german);
  }

  // ==========================================================================
  // 4B. SPECIAL REVIEW MODULE (OPAKOVÁNÍ)
  // ==========================================================================
  function parseReviewTimestamp(word) {
    if (!word) return 0;
    if (typeof word.last_reviewed_ts === 'number' && word.last_reviewed_ts > 0) {
      return word.last_reviewed_ts;
    }
    const str = (word.last_reviewed || '').trim();
    if (!str || str === '-') return 0;

    // Parse D.M.YYYY
    const czMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (czMatch) {
      const day = parseInt(czMatch[1], 10);
      const month = parseInt(czMatch[2], 10) - 1;
      const year = parseInt(czMatch[3], 10);
      return new Date(year, month, day).getTime();
    }

    const parsed = Date.parse(str);
    return isNaN(parsed) ? 0 : parsed;
  }

  function getProblematicEntries() {
    return state.vocabulary
      .map((item, index) => ({ item, index }))
      .filter(x => isWordProblematic(x.item));
  }

  function getLastReviewedEntries(limit = 5) {
    return state.vocabulary
      .map((item, index) => ({ item, index, ts: parseReviewTimestamp(item), reps: parseRepetitionCount(item.repetition) }))
      .filter(x => x.ts > 0 || x.reps > 0)
      .sort((a, b) => {
        if (b.ts !== a.ts) return b.ts - a.ts;
        return b.reps - a.reps;
      })
      .slice(0, limit)
      .map(({ item, index }) => ({ item, index }));
  }

  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function renderReviewMenu() {
    if (!DOM.reviewModesGrid) return;

    DOM.reviewMenuView.style.display = state.reviewStep === 'menu' ? 'block' : 'none';
    DOM.reviewFlashcardView.style.display = state.reviewStep === 'flashcards' ? 'block' : 'none';

    const probEntries = getProblematicEntries();
    const probCount = probEntries.length;
    const probLearned = probEntries.filter(x => isWordLearned(x.item)).length;
    const random5Count = Math.min(5, probCount);

    const last5Entries = getLastReviewedEntries(5);
    const last5Count = last5Entries.length;
    const last5Learned = last5Entries.filter(x => isWordLearned(x.item)).length;

    DOM.reviewModesGrid.innerHTML = '';

    // Tile 1: 5 náhodných problémových slov
    const tileRandom5 = createTileElement({
      icon: '🎲',
      title: 'Opakování 5 náhodných problémových slov',
      subtitle: probCount > 0
        ? `Náhodný výběr ${random5Count} z ${probCount} problémových slovíček`
        : 'Zatím nemáte označena žádná problémová slovíčka (⚠️)',
      total: random5Count,
      learned: Math.min(random5Count, probLearned),
      badgeText: `${random5Count} slov`,
      extraClass: 'tile-all',
      onClick: () => startReviewSession('RANDOM_5_PROB')
    });
    DOM.reviewModesGrid.appendChild(tileRandom5);

    // Tile 2: 5 naposledy zopakovaných
    const tileLast5 = createTileElement({
      icon: '🕒',
      title: '5 naposledy zopakovaných',
      subtitle: last5Count > 0
        ? 'Rychlé osvěžení posledních 5 procvičovaných slovíček'
        : 'Zatím nebyla zopakována žádná slovíčka',
      total: last5Count,
      learned: last5Learned,
      badgeText: `${last5Count} slov`,
      onClick: () => startReviewSession('LAST_5_REVIEWED')
    });
    DOM.reviewModesGrid.appendChild(tileLast5);

    // Tile 3: Opakování problémových slovíček (všechna)
    const tileAllProb = createTileElement({
      icon: '⚠️',
      title: 'Opakování problémových slovíček',
      subtitle: probCount > 0
        ? `Kompletní procvičení všech ${probCount} problémových slovíček`
        : 'Označte těžká slovíčka symbolem ⚠️ v seznamu nebo na kartičce',
      total: probCount,
      learned: probLearned,
      badgeText: `${probCount} slov`,
      onClick: () => startReviewSession('ALL_PROB')
    });
    DOM.reviewModesGrid.appendChild(tileAllProb);
  }

  function startReviewSession(mode) {
    state.reviewMode = mode;
    state.reviewStep = 'flashcards';
    state.currentReviewIndex = 0;
    state.isReviewFlipped = false;
    DOM.reviewFlashcard.classList.remove('flipped');

    if (mode === 'RANDOM_5_PROB') {
      state.reviewQueue = shuffleArray(getProblematicEntries()).slice(0, 5);
      DOM.reviewModeTitle.textContent = '🎲 5 náhodných problémových';
      if (DOM.btnReshuffleReview) DOM.btnReshuffleReview.style.display = 'inline-flex';
    } else if (mode === 'LAST_5_REVIEWED') {
      state.reviewQueue = getLastReviewedEntries(5);
      DOM.reviewModeTitle.textContent = '🕒 5 naposledy zopakovaných';
      if (DOM.btnReshuffleReview) DOM.btnReshuffleReview.style.display = 'none';
    } else if (mode === 'ALL_PROB') {
      state.reviewQueue = getProblematicEntries();
      DOM.reviewModeTitle.textContent = '⚠️ Všechna problémová slovíčka';
      if (DOM.btnReshuffleReview) DOM.btnReshuffleReview.style.display = 'none';
    }

    renderReviewMenu();
    renderReviewCard();
  }

  function renderReviewCard() {
    const queueLength = state.reviewQueue.length;

    if (queueLength === 0) {
      DOM.reviewCardGerman.textContent = '🎉 Žádná slovíčka!';
      DOM.reviewCardPronunciation.textContent = state.reviewMode === 'LAST_5_REVIEWED'
        ? 'Zatím jste neprocvičili žádná slovíčka.'
        : 'Zatím nemáte označena žádná problémová slovíčka (⚠️).';
      DOM.reviewCardCzech.textContent = 'Označte si slovíčka v seznamu nebo při tréninku!';
      DOM.reviewCardLessonTag.textContent = '-';
      DOM.reviewCardStoryBox.style.display = 'none';
      DOM.reviewCardRepBadge.textContent = '0x';
      DOM.reviewCardLastReviewed.textContent = '';
      if (DOM.btnReviewToggleProb) DOM.btnReviewToggleProb.style.display = 'none';

      DOM.reviewProgressFill.style.width = '100%';
      DOM.reviewCount.textContent = '0 z 0';
      DOM.reviewPercent.textContent = '100 %';
      return;
    }

    if (state.currentReviewIndex >= queueLength) {
      state.currentReviewIndex = 0;
    }

    const currentEntry = state.reviewQueue[state.currentReviewIndex];
    const word = state.vocabulary[currentEntry.index] || currentEntry.item;

    DOM.reviewCardGerman.textContent = word.german || '-';
    DOM.reviewCardPronunciation.textContent = word.pronunciation ? `[${word.pronunciation}]` : '';
    DOM.reviewCardCzech.textContent = word.czech || '-';
    DOM.reviewCardLessonTag.textContent = word.lesson || 'Všeobecné';
    DOM.reviewCardRepBadge.textContent = word.repetition || '0x';
    DOM.reviewCardLastReviewed.textContent = `Poslední revize: ${word.last_reviewed || 'nikdy'}`;

    if (DOM.btnReviewToggleProb) {
      DOM.btnReviewToggleProb.style.display = 'inline-flex';
      const isProb = isWordProblematic(word);
      DOM.btnReviewToggleProb.className = isProb ? 'status-pill pill-problematic' : 'status-pill pill-problematic-off';
      DOM.btnReviewToggleProb.textContent = isProb ? '⚠️ Problémové' : '⚠️ Označit problémové';
    }

    if (word.story && word.story !== '-') {
      DOM.reviewCardStoryBox.style.display = 'block';
      DOM.reviewCardStory.textContent = word.story;
    } else {
      DOM.reviewCardStoryBox.style.display = 'none';
    }

    const currentNum = state.currentReviewIndex + 1;
    const pct = Math.round((currentNum / queueLength) * 100);
    DOM.reviewProgressFill.style.width = `${pct}%`;
    DOM.reviewCount.textContent = `Karta ${currentNum} z ${queueLength}`;
    DOM.reviewPercent.textContent = `${pct} %`;
  }

  function flipReviewCard() {
    state.isReviewFlipped = !state.isReviewFlipped;
    DOM.reviewFlashcard.classList.toggle('flipped', state.isReviewFlipped);
  }

  async function handleReviewAction(isCorrect) {
    if (state.reviewQueue.length === 0) return;

    const currentEntry = state.reviewQueue[state.currentReviewIndex];
    const targetWord = state.vocabulary[currentEntry.index];

    const currentReps = parseRepetitionCount(targetWord.repetition);
    const newReps = isCorrect ? currentReps + 1 : Math.max(0, currentReps - 1);

    targetWord.repetition = `${newReps}x`;
    targetWord.learned = newReps > 0;
    targetWord.last_reviewed = getTodayFormatted();
    targetWord.last_reviewed_ts = Date.now();

    state.isReviewFlipped = false;
    DOM.reviewFlashcard.classList.remove('flipped');

    setTimeout(() => {
      state.currentReviewIndex++;
      if (state.currentReviewIndex >= state.reviewQueue.length) {
        state.currentReviewIndex = 0;
      }
      renderReviewCard();
      renderReviewMenu();
      renderPracticeHierarchy();
      renderTable();
      renderStats();
    }, 200);

    triggerAutoSave(`Review '${targetWord.german}': ${targetWord.repetition}`);
  }


  // ==========================================================================
  // 5. VOCABULARY CRUD & LIST TAB MODULE
  // ==========================================================================
  function cleanGermanForSort(str) {
    if (!str) return '';
    return str.trim().replace(/^(der|die|das)\s+/i, '').trim();
  }

  function updateSortHeaderIndicators() {
    const indDE = document.getElementById('sort-ind-DE');
    const indCZ = document.getElementById('sort-ind-CZ');
    const indSTATUS = document.getElementById('sort-ind-STATUS');
    const indREP = document.getElementById('sort-ind-REP');

    if (indDE) indDE.textContent = '';
    if (indCZ) indCZ.textContent = '';
    if (indSTATUS) indSTATUS.textContent = '';
    if (indREP) indREP.textContent = '';

    const sort = state.listSortBy;
    if (sort === 'DE_ASC' && indDE) indDE.textContent = '▲';
    else if (sort === 'DE_DESC' && indDE) indDE.textContent = '▼';
    else if (sort === 'CZ_ASC' && indCZ) indCZ.textContent = '▲';
    else if (sort === 'CZ_DESC' && indCZ) indCZ.textContent = '▼';
    else if (sort === 'STATUS_UNLEARNED' && indSTATUS) indSTATUS.textContent = '▲';
    else if (sort === 'STATUS_LEARNED' && indSTATUS) indSTATUS.textContent = '▼';
    else if (sort === 'STATUS_PROBLEMATIC' && indSTATUS) indSTATUS.textContent = '⚠️';
    else if (sort === 'REP_ASC' && indREP) indREP.textContent = '▲';
    else if (sort === 'REP_DESC' && indREP) indREP.textContent = '▼';
  }

  function renderTable() {
    const search = state.searchQuery.toLowerCase();
    const lessonFilter = state.listLessonFilter;
    const statusFilter = state.listStatusFilter;
    const sortBy = state.listSortBy;

    updateSortHeaderIndicators();

    // Map with original index so CRUD operations always reference exact state.vocabulary index
    let entries = state.vocabulary.map((item, originalIndex) => ({ item, originalIndex }));

    // 1. Filter by search, lesson, and learned / problematic status
    entries = entries.filter(({ item }) => {
      const matchSearch = !search ||
        (item.german && item.german.toLowerCase().includes(search)) ||
        (item.czech && item.czech.toLowerCase().includes(search));

      const matchLesson = lessonFilter === 'ALL' || (item.lesson || 'Ostatní') === lessonFilter;

      let matchStatus = true;
      if (statusFilter === 'UNLEARNED') {
        matchStatus = !isWordLearned(item);
      } else if (statusFilter === 'LEARNED') {
        matchStatus = isWordLearned(item);
      } else if (statusFilter === 'PROBLEMATIC') {
        matchStatus = isWordProblematic(item);
      }

      return matchSearch && matchLesson && matchStatus;
    });

    // 2. Sort entries
    if (sortBy !== 'DEFAULT') {
      entries.sort((a, b) => {
        const wA = a.item;
        const wB = b.item;

        if (sortBy === 'DE_ASC' || sortBy === 'DE_DESC') {
          const cmp = cleanGermanForSort(wA.german).localeCompare(cleanGermanForSort(wB.german), 'de', { sensitivity: 'base' });
          return sortBy === 'DE_ASC' ? cmp : -cmp;
        }

        if (sortBy === 'CZ_ASC' || sortBy === 'CZ_DESC') {
          const cmp = (wA.czech || '').localeCompare(wB.czech || '', 'cs', { sensitivity: 'base' });
          return sortBy === 'CZ_ASC' ? cmp : -cmp;
        }

        const repA = parseRepetitionCount(wA.repetition);
        const repB = parseRepetitionCount(wB.repetition);

        if (sortBy === 'REP_ASC') {
          return repA !== repB ? repA - repB : cleanGermanForSort(wA.german).localeCompare(cleanGermanForSort(wB.german), 'de');
        }

        if (sortBy === 'REP_DESC') {
          return repA !== repB ? repB - repA : cleanGermanForSort(wA.german).localeCompare(cleanGermanForSort(wB.german), 'de');
        }

        const learnedA = isWordLearned(wA) ? 1 : 0;
        const learnedB = isWordLearned(wB) ? 1 : 0;

        if (sortBy === 'STATUS_UNLEARNED') {
          if (learnedA !== learnedB) return learnedA - learnedB;
          if (repA !== repB) return repA - repB;
          return cleanGermanForSort(wA.german).localeCompare(cleanGermanForSort(wB.german), 'de');
        }

        if (sortBy === 'STATUS_LEARNED') {
          if (learnedA !== learnedB) return learnedB - learnedA;
          if (repA !== repB) return repB - repA;
          return cleanGermanForSort(wA.german).localeCompare(cleanGermanForSort(wB.german), 'de');
        }

        if (sortBy === 'STATUS_PROBLEMATIC') {
          const probA = isWordProblematic(wA) ? 1 : 0;
          const probB = isWordProblematic(wB) ? 1 : 0;
          if (probA !== probB) return probB - probA;
          if (learnedA !== learnedB) return learnedA - learnedB;
          return cleanGermanForSort(wA.german).localeCompare(cleanGermanForSort(wB.german), 'de');
        }

        return 0;
      });
    }

    DOM.listCounter.textContent = `Zobrazeno ${entries.length} z ${state.vocabulary.length} slovíček`;
    DOM.vocabTableBody.innerHTML = '';

    entries.forEach(({ item, originalIndex }) => {
      const tr = document.createElement('tr');
      const isLearned = isWordLearned(item);
      const isProb = isWordProblematic(item);

      const repBadgeClass = isLearned ? 'rep-badge rep-badge-learned' : 'rep-badge rep-badge-zero';
      const learnedPillClass = isLearned ? 'status-pill pill-learned' : 'status-pill pill-unlearned';
      const learnedPillText = isLearned ? '✅ Naučeno' : '⏳ Nenaučeno';

      const probPillClass = isProb ? 'status-pill pill-problematic' : 'status-pill pill-problematic-off';
      const probPillText = isProb ? '⚠️ Problémové' : '⚠️';
      const probPillTitle = isProb ? 'Problémové slovíčko (kliknutím zrušíte)' : 'Kliknutím označíte jako problémové';

      tr.innerHTML = `
        <td style="font-weight:700; color:#fff;">${escapeHtml(item.german || '')}</td>
        <td style="color:var(--primary); font-style:italic;">${escapeHtml(item.pronunciation || '')}</td>
        <td style="font-weight:600; color:var(--secondary);">${escapeHtml(item.czech || '')}</td>
        <td>
          <div class="status-badges-wrap">
            <span class="${learnedPillClass} btn-toggle-learned" data-index="${originalIndex}" title="Kliknutím přepnete stav Naučeno / Nenaučeno">${learnedPillText}</span>
            <span class="${probPillClass} btn-toggle-problematic" data-index="${originalIndex}" title="${probPillTitle}">${probPillText}</span>
          </div>
        </td>
        <td><span class="${repBadgeClass}">${escapeHtml(item.repetition || '0x')}</span></td>
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

  function toggleWordLearned(index) {
    const item = state.vocabulary[index];
    if (!item) return;

    const nextLearned = !isWordLearned(item);
    item.learned = nextLearned;

    const reps = parseRepetitionCount(item.repetition);
    if (nextLearned && reps === 0) {
      item.repetition = '1x';
      item.last_reviewed = getTodayFormatted();
    } else if (!nextLearned) {
      item.repetition = '0x';
    }

    refreshAllViews();
    triggerAutoSave(`Toggle learned '${item.german}': ${nextLearned}`);
  }

  function toggleWordProblematic(index) {
    const item = state.vocabulary[index];
    if (!item) return;

    item.problematic = !isWordProblematic(item);
    refreshAllViews();
    triggerAutoSave(`Toggle problematic '${item.german}': ${item.problematic}`);
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
    if (DOM.wordLearned) DOM.wordLearned.checked = false;
    if (DOM.wordProblematic) DOM.wordProblematic.checked = false;
    
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
    if (DOM.wordLearned) DOM.wordLearned.checked = isWordLearned(item);
    if (DOM.wordProblematic) DOM.wordProblematic.checked = isWordProblematic(item);

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

    const isLearnedChecked = DOM.wordLearned ? DOM.wordLearned.checked : false;
    const isProblematicChecked = DOM.wordProblematic ? DOM.wordProblematic.checked : false;

    let currentRepetition = index >= 0 ? (state.vocabulary[index].repetition || '0x') : '0x';
    const currentRepsNum = parseRepetitionCount(currentRepetition);

    if (isLearnedChecked && currentRepsNum === 0) {
      currentRepetition = '1x';
    } else if (!isLearnedChecked) {
      currentRepetition = '0x';
    }

    const wordData = {
      german,
      pronunciation: DOM.wordPronunciation.value.trim(),
      czech,
      story: DOM.wordStory.value.trim() || '-',
      repetition: currentRepetition,
      learned: isLearnedChecked,
      problematic: isProblematicChecked,
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
    const learned = state.vocabulary.filter(w => isWordLearned(w)).length;
    const unlearned = total - learned;
    const masteryPct = total > 0 ? Math.round((learned / total) * 100) : 0;

    DOM.statTotal.textContent = total;
    DOM.statLearned.textContent = learned;
    DOM.statUnlearned.textContent = unlearned;
    DOM.statMastery.textContent = `${masteryPct} %`;

    // Category & Lesson Breakdown (Collapsible)
    const hierarchy = buildHierarchyStats();
    const priorityOrder = ['Duolingo 1', 'Duolingo 2', 'Duolingo 3', 'Základy', 'Úvodní lekce 1'];
    const catKeys = Object.keys(hierarchy).sort((a, b) => {
      const idxA = priorityOrder.indexOf(a);
      const idxB = priorityOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return naturalSort(a, b);
    });

    DOM.lessonsBreakdown.innerHTML = '';

    catKeys.forEach(catKey => {
      const catData = hierarchy[catKey];
      const catPct = catData.total > 0 ? Math.round((catData.learned / catData.total) * 100) : 0;
      const subKeys = Object.keys(catData.subcategories).sort((a, b) => {
        return naturalSort(catData.subcategories[a].subName, catData.subcategories[b].subName);
      });
      const subCount = subKeys.length;
      const isExpanded = Boolean(state.expandedStatsCategories[catKey]);

      const groupEl = document.createElement('div');
      groupEl.className = `stats-category-group ${isExpanded ? 'expanded' : ''}`.trim();

      const headerBtn = document.createElement('button');
      headerBtn.type = 'button';
      headerBtn.className = 'stats-category-header';
      headerBtn.innerHTML = `
        <div class="stats-cat-top">
          <div class="stats-cat-title">
            <span class="stats-chevron">▶</span>
            <span>${getCategoryIcon(catKey)} ${escapeHtml(catKey)}</span>
            <span class="stats-cat-subcount">${subCount} ${subCount === 1 ? 'lekce' : (subCount >= 2 && subCount <= 4 ? 'lekce' : 'lekcí')}</span>
          </div>
          <div class="stats-cat-meta">
            <span>${catData.learned} / ${catData.total} (${catPct} %)</span>
          </div>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${catPct}%; ${catPct === 100 ? 'background-color: var(--accent-green);' : ''}"></div>
        </div>
      `;

      headerBtn.addEventListener('click', () => {
        state.expandedStatsCategories[catKey] = !state.expandedStatsCategories[catKey];
        groupEl.classList.toggle('expanded', state.expandedStatsCategories[catKey]);
      });

      const bodyEl = document.createElement('div');
      bodyEl.className = 'stats-category-body';

      subKeys.forEach(fullLessonKey => {
        const subData = catData.subcategories[fullLessonKey];
        const subPct = subData.total > 0 ? Math.round((subData.learned / subData.total) * 100) : 0;

        const subItem = document.createElement('div');
        subItem.className = 'lesson-bar-item';
        subItem.innerHTML = `
          <div class="bar-header">
            <span>📘 ${escapeHtml(subData.subName)}</span>
            <span>${subData.learned} / ${subData.total} (${subPct} %)</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${subPct}%; ${subPct === 100 ? 'background-color: var(--accent-green);' : ''}"></div>
          </div>
        `;
        bodyEl.appendChild(subItem);
      });

      groupEl.appendChild(headerBtn);
      groupEl.appendChild(bodyEl);
      DOM.lessonsBreakdown.appendChild(groupEl);
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
    if (DOM.practiceLessonSelect) {
      DOM.practiceLessonSelect.addEventListener('change', updatePracticeQueue);
    }
    DOM.practiceFilterSelect.addEventListener('change', updatePracticeQueue);

    DOM.btnBackToCategories.addEventListener('click', () => {
      navigatePracticeStep('categories', null, null);
    });

    DOM.btnBackToSubcategories.addEventListener('click', () => {
      if (state.selectedCategory && state.selectedCategory !== 'ALL') {
        navigatePracticeStep('subcategories', state.selectedCategory, null);
      } else {
        navigatePracticeStep('categories', null, null);
      }
    });

    DOM.flashcard.addEventListener('click', (e) => {
      // Don't flip card if speak or problematic button was clicked
      if (e.target.closest('#btn-speak') || e.target.closest('#btn-card-toggle-prob')) return;
      flipCard();
    });

    if (DOM.btnCardToggleProb) {
      DOM.btnCardToggleProb.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.practiceQueue.length === 0) return;
        const currentEntry = state.practiceQueue[state.currentPracticeIndex];
        toggleWordProblematic(currentEntry.index);
        renderPracticeCard();
      });
    }

    DOM.btnFlip.addEventListener('click', flipCard);
    DOM.btnKnow.addEventListener('click', () => handlePracticeAction(true));
    DOM.btnDontKnow.addEventListener('click', () => handlePracticeAction(false));
    DOM.btnSpeak.addEventListener('click', speakGermanWord);

    // Review Tab controls
    if (DOM.btnBackToReviewMenu) {
      DOM.btnBackToReviewMenu.addEventListener('click', () => {
        state.reviewStep = 'menu';
        renderReviewMenu();
      });
    }

    if (DOM.btnReshuffleReview) {
      DOM.btnReshuffleReview.addEventListener('click', () => {
        startReviewSession('RANDOM_5_PROB');
      });
    }

    if (DOM.reviewFlashcard) {
      DOM.reviewFlashcard.addEventListener('click', (e) => {
        if (e.target.closest('#btn-review-speak') || e.target.closest('#btn-review-toggle-prob')) return;
        flipReviewCard();
      });
    }

    if (DOM.btnReviewToggleProb) {
      DOM.btnReviewToggleProb.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.reviewQueue.length === 0) return;
        const currentEntry = state.reviewQueue[state.currentReviewIndex];
        toggleWordProblematic(currentEntry.index);
        renderReviewCard();
      });
    }

    if (DOM.btnReviewFlip) DOM.btnReviewFlip.addEventListener('click', flipReviewCard);
    if (DOM.btnReviewKnow) DOM.btnReviewKnow.addEventListener('click', () => handleReviewAction(true));
    if (DOM.btnReviewDontKnow) DOM.btnReviewDontKnow.addEventListener('click', () => handleReviewAction(false));
    if (DOM.btnReviewSpeak) {
      DOM.btnReviewSpeak.addEventListener('click', () => {
        if (state.reviewQueue.length === 0) return;
        const currentEntry = state.reviewQueue[state.currentReviewIndex];
        const word = state.vocabulary[currentEntry.index] || currentEntry.item;
        speakTextGerman(word.german);
      });
    }

    // List controls & CRUD
    DOM.listSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderTable();
    });

    DOM.listLessonFilter.addEventListener('change', (e) => {
      state.listLessonFilter = e.target.value;
      renderTable();
    });

    if (DOM.listStatusFilter) {
      DOM.listStatusFilter.addEventListener('change', (e) => {
        state.listStatusFilter = e.target.value;
        renderTable();
      });
    }

    if (DOM.listSortSelect) {
      DOM.listSortSelect.addEventListener('change', (e) => {
        state.listSortBy = e.target.value;
        renderTable();
      });
    }

    if (DOM.sortableHeaders) {
      DOM.sortableHeaders.forEach(th => {
        th.addEventListener('click', () => {
          const col = th.dataset.sort;
          if (col === 'DE') {
            state.listSortBy = state.listSortBy === 'DE_ASC' ? 'DE_DESC' : 'DE_ASC';
          } else if (col === 'CZ') {
            state.listSortBy = state.listSortBy === 'CZ_ASC' ? 'CZ_DESC' : 'CZ_ASC';
          } else if (col === 'STATUS') {
            if (state.listSortBy === 'STATUS_PROBLEMATIC') state.listSortBy = 'STATUS_UNLEARNED';
            else if (state.listSortBy === 'STATUS_UNLEARNED') state.listSortBy = 'STATUS_LEARNED';
            else state.listSortBy = 'STATUS_PROBLEMATIC';
          } else if (col === 'REP') {
            state.listSortBy = state.listSortBy === 'REP_DESC' ? 'REP_ASC' : 'REP_DESC';
          }
          if (DOM.listSortSelect) {
            DOM.listSortSelect.value = state.listSortBy;
          }
          renderTable();
        });
      });
    }

    DOM.btnAddWord.addEventListener('click', openAddModal);

    DOM.vocabTableBody.addEventListener('click', (e) => {
      const toggleLearnedBtn = e.target.closest('.btn-toggle-learned');
      if (toggleLearnedBtn) {
        const idx = parseInt(toggleLearnedBtn.dataset.index, 10);
        toggleWordLearned(idx);
        return;
      }

      const toggleProbBtn = e.target.closest('.btn-toggle-problematic');
      if (toggleProbBtn) {
        const idx = parseInt(toggleProbBtn.dataset.index, 10);
        toggleWordProblematic(idx);
        return;
      }

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

    // Keyboard Shortcuts for Practice & Review Modes
    document.addEventListener('keydown', (e) => {
      const isModalActive = document.querySelector('.modal-overlay.active');
      if (isModalActive) return;

      const isPracticeActive = document.getElementById('tab-practice').classList.contains('active') && state.practiceStep === 'flashcards';
      const isReviewActive = document.getElementById('tab-review').classList.contains('active') && state.reviewStep === 'flashcards';

      if (isPracticeActive) {
        if (e.code === 'Space') {
          e.preventDefault();
          flipCard();
        } else if (e.code === 'ArrowRight' || e.code === 'KeyV') {
          handlePracticeAction(true);
        } else if (e.code === 'ArrowLeft' || e.code === 'KeyN') {
          handlePracticeAction(false);
        }
      } else if (isReviewActive) {
        if (e.code === 'Space') {
          e.preventDefault();
          flipReviewCard();
        } else if (e.code === 'ArrowRight' || e.code === 'KeyV') {
          handleReviewAction(true);
        } else if (e.code === 'ArrowLeft' || e.code === 'KeyN') {
          handleReviewAction(false);
        }
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

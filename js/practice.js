/**
 * HSK Chinese Character Stroke-Order Practice Manager
 * Integrated with HanziWriter quiz engine, Mizige Grid, and Practice Count Tracking.
 */

(function () {
  'use strict';

  // Storage Keys
  const STORAGE_KEYS = {
    PRACTICE_HISTORY: 'hsk_practice_history', // { [char]: { count, bestAccuracy, lastPracticed } }
    PRACTICE_TOTALS: 'hsk_practice_totals',   // { totalSessions, totalCompletedChars, totalAccuracySum }
    PRACTICE_SETTINGS: 'hsk_practice_settings' // { showGuide }
  };

  // State
  let currentLevels = ['HSK 1'];
  let filteredVocabulary = [];
  let currentWordIndex = 0;
  let currentWord = null;
  let currentCharIndex = 0;
  let currentWriter = null;
  let isQuizActive = false;
  let showGuide = true;
  let repeatCharacter = false;
  let showDialog = false; // Default false for smooth non-blocking flow
  let repeatTimer = null;
  let inlineToastTimer = null;

  // Real-time quiz tracking for the current character
  let currentStrokeCount = 0;
  let currentMistakesCount = 0;
  let currentStrokeTotal = 0;

  // DOM references (initialized in initPractice)
  let dom = {};

  // Audio synthesis
  let chineseVoice = null;

  function initSpeech() {
    if (!('speechSynthesis' in window)) return;
    const updateVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      chineseVoice = voices.find(v => v.lang === 'zh-CN' || v.lang === 'zh_CN')
        || voices.find(v => v.lang.startsWith('zh'))
        || null;
    };
    window.speechSynthesis.onvoiceschanged = updateVoice;
    updateVoice();
  }

  function playPronunciation(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    if (chineseVoice) utterance.voice = chineseVoice;
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  // Audio Chimes (Synthesized Web Audio API)
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) audioCtx = new AudioCtxClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playChime(isCorrect) {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isCorrect) {
        // High, cheerful chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else {
        // Low, gentle boop
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.16);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch (e) {
      // Audio context error or not allowed yet
    }
  }

  // LocalStorage Helpers
  function getPracticeHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE_HISTORY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function savePracticeHistory(history) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRACTICE_HISTORY, JSON.stringify(history));
    } catch (e) {}
  }

  function getPracticeTotals() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE_TOTALS);
      return raw ? JSON.parse(raw) : { totalSessions: 0, totalCompletedChars: 0, totalAccuracySum: 0 };
    } catch (e) {
      return { totalSessions: 0, totalCompletedChars: 0, totalAccuracySum: 0 };
    }
  }

  function savePracticeTotals(totals) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRACTICE_TOTALS, JSON.stringify(totals));
    } catch (e) {}
  }

  function getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE_SETTINGS);
      return raw ? JSON.parse(raw) : { showGuide: true, repeatCharacter: false, showDialog: false };
    } catch (e) {
      return { showGuide: true, repeatCharacter: false, showDialog: false };
    }
  }

  function saveSettings(settings) {
    try {
      const current = getSettings();
      localStorage.setItem(STORAGE_KEYS.PRACTICE_SETTINGS, JSON.stringify({ ...current, ...settings }));
    } catch (e) {}
  }

  // Record completed practice
  function recordPracticeCompletion(char, accuracy) {
    const history = getPracticeHistory();
    const currentRecord = history[char] || { count: 0, bestAccuracy: 0, lastPracticed: 0 };
    currentRecord.count += 1;
    currentRecord.bestAccuracy = Math.max(currentRecord.bestAccuracy, accuracy);
    currentRecord.lastPracticed = Date.now();
    history[char] = currentRecord;
    savePracticeHistory(history);

    const totals = getPracticeTotals();
    totals.totalSessions += 1;
    totals.totalCompletedChars = Object.keys(history).length;
    totals.totalAccuracySum += accuracy;
    savePracticeTotals(totals);

    updateStatsDashboard();
    updateCharBadges();
    return currentRecord;
  }

  function updateStatsDashboard() {
    const totals = getPracticeTotals();
    if (dom.statTotalSessions) {
      dom.statTotalSessions.textContent = totals.totalSessions;
    }
    if (dom.statCompletedChars) {
      dom.statCompletedChars.textContent = totals.totalCompletedChars;
    }
    if (dom.statAvgAccuracy) {
      const avg = totals.totalSessions > 0
        ? Math.round(totals.totalAccuracySum / totals.totalSessions)
        : 0;
      dom.statAvgAccuracy.textContent = `${avg}%`;
    }
  }

  function updateCharBadges() {
    if (!currentWord) return;
    const history = getPracticeHistory();
    const chars = Array.from(currentWord.hanzi);
    const currentChar = chars[currentCharIndex] || chars[0];
    const charRecord = history[currentChar];
    const count = charRecord ? charRecord.count : 0;

    if (dom.charCountBadge) {
      dom.charCountBadge.innerHTML = `✍️ คัดแล้ว <strong>${count}</strong> ครั้ง`;
    }

    // Update segment buttons
    if (dom.charSelector) {
      const btns = dom.charSelector.querySelectorAll('.char-segment-btn');
      btns.forEach((btn, idx) => {
        const c = chars[idx];
        const rec = history[c];
        const cnt = rec ? rec.count : 0;
        const cntSpan = btn.querySelector('.segment-cnt');
        if (cntSpan) cntSpan.textContent = `${cnt} ครั้ง`;
      });
    }
  }

  // Filter vocabulary by level
  function filterVocabulary() {
    if (typeof HSK_DATA === 'undefined') return [];
    if (currentLevels.includes('all') || currentLevels.length >= 9) {
      return HSK_DATA;
    }
    const hasHsk7 = currentLevels.includes('HSK 7');
    const hasHsk8 = currentLevels.includes('HSK 8');
    const hasHsk9 = currentLevels.includes('HSK 9');
    const standardLevels = currentLevels.filter(lvl => lvl !== 'HSK 7' && lvl !== 'HSK 8' && lvl !== 'HSK 9');

    return HSK_DATA.filter(item => {
      if (standardLevels.includes(item.level)) return true;
      if ((hasHsk7 || hasHsk8 || hasHsk9) &&
        (item.level === 'HSK 7' || item.level === 'HSK 8' || item.level === 'HSK 9' ||
          item.level === 'HSK 7-8' || item.level === 'HSK 7-9')) {
        return true;
      }
      return false;
    });
  }

  // Load a specific word or card
  function loadWord(word, charIdx = 0) {
    if (!word) return;
    currentWord = word;
    currentCharIndex = charIdx;

    if (dom.practiceHskBadge) dom.practiceHskBadge.textContent = word.level;
    if (dom.fullWordText) dom.fullWordText.textContent = word.hanzi;
    if (dom.pinyinText) dom.pinyinText.textContent = word.pinyin;
    if (dom.meaningText) dom.meaningText.textContent = word.meaning;
    if (dom.meaningEnText) dom.meaningEnText.textContent = word.meaning_en || '';

    // Render character segment selector
    renderCharSelector();

    // Setup Writer for the active character
    setupCharacterWriter();
  }

  function renderCharSelector() {
    if (!dom.charSelector) return;
    dom.charSelector.innerHTML = '';
    const chars = Array.from(currentWord.hanzi);
    const history = getPracticeHistory();

    chars.forEach((c, idx) => {
      const rec = history[c];
      const count = rec ? rec.count : 0;
      const btn = document.createElement('button');
      btn.className = `char-segment-btn ${idx === currentCharIndex ? 'active' : ''}`;
      btn.innerHTML = `<span>${c}</span> <span class="segment-cnt">${count} ครั้ง</span>`;
      btn.addEventListener('click', () => {
        if (currentCharIndex === idx) return;
        currentCharIndex = idx;
        renderCharSelector();
        setupCharacterWriter();
      });
      dom.charSelector.appendChild(btn);
    });
  }

  // Initialize HanziWriter Quiz for current character
  function setupCharacterWriter() {
    if (!dom.writerTarget) return;
    if (repeatTimer) {
      clearTimeout(repeatTimer);
      repeatTimer = null;
    }
    dom.writerTarget.innerHTML = '';
    dom.completeOverlay.classList.remove('show');

    const chars = Array.from(currentWord.hanzi);
    const char = chars[currentCharIndex] || chars[0];

    // Reset quiz counters
    currentStrokeCount = 0;
    currentMistakesCount = 0;
    currentStrokeTotal = 0;
    isQuizActive = false;

    updateCharBadges();
    setFeedbackStatus('neutral', 'ลากเส้นขีดแรกตามลำดับ (Draw stroke 1)', `ขีดที่ 1 / ...`);

    if (!('HanziWriter' in window)) {
      dom.writerTarget.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:4rem;color:#e11d48;">${char}</div>`;
      setFeedbackStatus('neutral', 'เบราว์เซอร์ไม่รองรับ HanziWriter', '');
      return;
    }

    const boxWidth = dom.writerTarget.clientWidth || 280;

    // Create HanziWriter instance
    currentWriter = HanziWriter.create(dom.writerTarget, char, {
      width: boxWidth,
      height: boxWidth,
      padding: 16,
      showOutline: showGuide,
      strokeAnimationSpeed: 1.2,
      delayBetweenStrokes: 180,
      strokeColor: '#0f172a',
      outlineColor: showGuide ? 'rgba(225, 29, 72, 0.22)' : 'rgba(0,0,0,0)',
      highlightColor: '#4f46e5',
      drawingColor: '#2563eb',
      drawingWidth: 6,
      showCharacter: false
    });

    // Start interactive stroke-order quiz
    startQuiz();
  }

  function startQuiz() {
    if (!currentWriter) return;

    currentWriter.quiz({
      showOutline: showGuide,
      showHintAfterMisses: showGuide ? 1 : 2,
      onCorrectStroke: function (strokeData) {
        playChime(true);
        const strokeNum = strokeData.strokeNum + 1;
        const total = strokeData.totalStrokes;
        currentStrokeTotal = total;
        currentMistakesCount = strokeData.mistakesOnStroke;

        const nextStrokeNum = strokeNum + 1;
        if (nextStrokeNum <= total) {
          setFeedbackStatus(
            'correct',
            `✓ ถูกต้อง! (ขีดที่ ${strokeNum}) ขีดต่อไป...`,
            `ขีดที่ ${nextStrokeNum} / ${total}`
          );
        }
      },
      onMistake: function (strokeData) {
        playChime(false);
        const strokeNum = strokeData.strokeNum + 1;
        const total = strokeData.totalStrokes;
        currentStrokeTotal = total;

        setFeedbackStatus(
          'mistake',
          `✗ ลำดับ/ทิศทางยังไม่ถูกต้อง ลองใหม่อีกครั้ง`,
          `ขีดที่ ${strokeNum} / ${total}`
        );
      },
      onComplete: function (summaryData) {
        isQuizActive = false;
        playChime(true);
        const chars = Array.from(currentWord.hanzi);
        const char = chars[currentCharIndex] || chars[0];

        const totalStrokes = summaryData.totalStrokes || currentStrokeTotal || 1;
        const totalMistakes = summaryData.totalMistakes || 0;
        const totalAttempts = totalStrokes + totalMistakes;
        const accuracy = Math.max(10, Math.round((totalStrokes / totalAttempts) * 100));

        // Save & update practice count statistics
        const updatedRecord = recordPracticeCompletion(char, accuracy);

        setFeedbackStatus('complete', `🎉 ยอดเยี่ยม! คัดสำเร็จ (${accuracy}%)`, `✓ 100%`);

        // Pronounce character
        playPronunciation(char);

        if (showDialog) {
          // If modal dialog is explicitly enabled in options
          showCompletionModal(char, totalStrokes, totalMistakes, totalAttempts, accuracy, updatedRecord.count);

          if (repeatCharacter) {
            setFeedbackStatus('complete', `🎉 ยอดเยี่ยม! กำลังเริ่มคัดซ้ำใน 2 วิ...`, `🔁 ซ้ำ`);
            repeatTimer = setTimeout(() => {
              dom.completeOverlay.classList.remove('show');
              setupCharacterWriter();
            }, 1800);
          }
        } else {
          // Seamless Non-intrusive UX Flow (No blocking modal)
          showInlineToast(char, accuracy, updatedRecord.count);

          if (repeatCharacter) {
            // Repeat mode: smoothly restart the same character after brief pause
            repeatTimer = setTimeout(() => {
              setupCharacterWriter();
            }, 1200);
          } else {
            // Normal mode: auto advance to next character or word smoothly
            repeatTimer = setTimeout(() => {
              nextCharacterOrWord();
            }, 1300);
          }
        }
      }
    });

    isQuizActive = true;
  }

  function setFeedbackStatus(type, message, strokeCounterText) {
    if (!dom.feedbackBar) return;
    dom.feedbackBar.className = `stroke-feedback-bar status-${type}`;
    if (dom.feedbackMsg) dom.feedbackMsg.textContent = message;
    if (dom.feedbackStrokeCounter) {
      dom.feedbackStrokeCounter.textContent = strokeCounterText || '';
      dom.feedbackStrokeCounter.style.display = strokeCounterText ? 'inline-block' : 'none';
    }
  }

  function showInlineToast(char, accuracy, lifetimeCount) {
    if (!dom.inlineToast) return;
    if (inlineToastTimer) {
      clearTimeout(inlineToastTimer);
      inlineToastTimer = null;
    }
    if (dom.toastCompleteMsg) {
      dom.toastCompleteMsg.textContent = `ยอดเยี่ยม! ความแม่นยำ ${accuracy}%`;
    }
    if (dom.toastCompleteSub) {
      dom.toastCompleteSub.textContent = `✍️ คัดสะสม ${lifetimeCount} ครั้ง`;
    }
    dom.inlineToast.classList.add('show');
    inlineToastTimer = setTimeout(() => {
      dom.inlineToast.classList.remove('show');
    }, 2200);
  }

  function showCompletionModal(char, strokes, mistakes, attempts, accuracy, totalLifetimeCount) {
    if (!dom.completeOverlay) return;
    if (dom.completeCharLarge) dom.completeCharLarge.textContent = char;
    if (dom.completePinyinMeaning) {
      dom.completePinyinMeaning.textContent = `${currentWord.pinyin} • ${currentWord.meaning}`;
    }
    if (dom.metricStrokes) dom.metricStrokes.textContent = `${strokes} ขีด`;
    if (dom.metricAttempts) dom.metricAttempts.textContent = `${attempts} ครั้ง (${mistakes} พลาด)`;
    if (dom.metricAccuracy) dom.metricAccuracy.textContent = `${accuracy}%`;
    if (dom.completeLifetimeBadge) {
      dom.completeLifetimeBadge.textContent = `✍️ คัดตัวนี้สะสมแล้ว ${totalLifetimeCount} ครั้ง${repeatCharacter ? ' (เปิดโหมดคัดซ้ำ 🔁)' : ''}`;
    }

    dom.completeOverlay.classList.add('show');
  }

  // Navigation functions
  function nextCharacterOrWord() {
    const chars = Array.from(currentWord.hanzi);
    if (currentCharIndex < chars.length - 1) {
      // Go to next character in current word
      currentCharIndex += 1;
      renderCharSelector();
      setupCharacterWriter();
    } else {
      // Advance to next word in filtered list
      nextWord();
    }
  }

  function nextWord() {
    if (filteredVocabulary.length === 0) return;
    currentWordIndex = (currentWordIndex + 1) % filteredVocabulary.length;
    loadWord(filteredVocabulary[currentWordIndex], 0);
  }

  function prevWord() {
    if (filteredVocabulary.length === 0) return;
    currentWordIndex = (currentWordIndex - 1 + filteredVocabulary.length) % filteredVocabulary.length;
    loadWord(filteredVocabulary[currentWordIndex], 0);
  }

  function randomWord() {
    if (filteredVocabulary.length === 0) return;
    const randIdx = Math.floor(Math.random() * filteredVocabulary.length);
    currentWordIndex = randIdx;
    loadWord(filteredVocabulary[currentWordIndex], 0);
  }

  // Public jump method: Called from Flashcards or Story Sheet
  function jumpToPractice(hanziOrWordObj) {
    if (!hanziOrWordObj) return;

    let targetWord = null;
    if (typeof hanziOrWordObj === 'object' && hanziOrWordObj.hanzi) {
      targetWord = hanziOrWordObj;
    } else if (typeof hanziOrWordObj === 'string' && typeof HSK_DATA !== 'undefined') {
      targetWord = HSK_DATA.find(item => item.hanzi === hanziOrWordObj) || {
        id: Date.now(),
        hanzi: hanziOrWordObj,
        pinyin: '',
        meaning: '',
        meaning_en: '',
        level: 'HSK'
      };
    }

    if (targetWord) {
      // Switch to practice view
      if (typeof window.switchAppView === 'function') {
        window.switchAppView('practice');
      }
      loadWord(targetWord, 0);
    }
  }

  // Initialize Practice Module
  function initPractice() {
    dom = {
      viewPractice: document.getElementById('view-practice'),
      practiceLevelBar: document.getElementById('practice-level-bar'),
      statTotalSessions: document.getElementById('practice-stat-total-sessions'),
      statCompletedChars: document.getElementById('practice-stat-completed-chars'),
      statAvgAccuracy: document.getElementById('practice-stat-avg-accuracy'),
      practiceHskBadge: document.getElementById('practice-hsk-badge'),
      charCountBadge: document.getElementById('practice-char-count-badge'),
      fullWordText: document.getElementById('practice-full-word-text'),
      btnPronounce: document.getElementById('practice-btn-audio'),
      pinyinText: document.getElementById('practice-pinyin'),
      meaningText: document.getElementById('practice-meaning'),
      meaningEnText: document.getElementById('practice-meaning-en'),
      charSelector: document.getElementById('practice-char-selector'),
      writerTarget: document.getElementById('practice-writer-target'),
      feedbackBar: document.getElementById('stroke-feedback-bar'),
      feedbackMsg: document.getElementById('feedback-msg'),
      feedbackStrokeCounter: document.getElementById('feedback-stroke-counter'),
      btnHint: document.getElementById('btn-practice-hint'),
      btnRestart: document.getElementById('btn-practice-restart'),
      toggleGuide: document.getElementById('toggle-practice-guide'),
      toggleRepeat: document.getElementById('toggle-practice-repeat'),
      toggleDialog: document.getElementById('toggle-practice-dialog'),
      inlineToast: document.getElementById('practice-inline-toast'),
      toastCompleteMsg: document.getElementById('toast-complete-msg'),
      toastCompleteSub: document.getElementById('toast-complete-sub'),
      btnPrevWord: document.getElementById('btn-practice-prev'),
      btnRandomWord: document.getElementById('btn-practice-random'),
      btnNextWord: document.getElementById('btn-practice-next'),
      completeOverlay: document.getElementById('practice-complete-overlay'),
      completeCharLarge: document.getElementById('complete-char-large'),
      completePinyinMeaning: document.getElementById('complete-pinyin-meaning'),
      metricStrokes: document.getElementById('metric-strokes'),
      metricAttempts: document.getElementById('metric-attempts'),
      metricAccuracy: document.getElementById('metric-accuracy'),
      completeLifetimeBadge: document.getElementById('complete-lifetime-badge'),
      // New Statistics Modal Elements
      statsBoard: document.getElementById('practice-stats-board'),
      btnOpenStatsModal: document.getElementById('btn-open-stats-modal'),
      statsModal: document.getElementById('practice-stats-modal'),
      modalStatsBackdrop: document.getElementById('modal-stats-backdrop'),
      btnCloseStatsModal: document.getElementById('btn-close-stats-modal'),
      modalStatSessions: document.getElementById('modal-stat-sessions'),
      modalStatChars: document.getElementById('modal-stat-chars'),
      modalStatAccuracy: document.getElementById('modal-stat-accuracy'),
      modalStatTopChar: document.getElementById('modal-stat-top-char'),
      statsCharsGrid: document.getElementById('stats-chars-grid'),
      historyTotalTag: document.getElementById('history-total-tag'),

      // New Word Picker Elements
      btnOpenWordPicker: document.getElementById('btn-open-word-picker'),
      btnHeaderPickWord: document.getElementById('btn-header-pick-word'),
      wordPickerModal: document.getElementById('practice-word-picker-modal'),
      modalPickerBackdrop: document.getElementById('modal-picker-backdrop'),
      btnClosePickerModal: document.getElementById('btn-close-picker-modal'),
      pickerSearchInput: document.getElementById('picker-search-input'),
      pickerSearchClear: document.getElementById('picker-search-clear'),
      pickerLevelFilter: document.getElementById('picker-level-filter'),
      pickerResultsCount: document.getElementById('picker-results-count'),
      pickerWordsGrid: document.getElementById('picker-words-grid')
    };

    const savedSettings = getSettings();
    showGuide = savedSettings.showGuide !== false;
    repeatCharacter = savedSettings.repeatCharacter === true;
    showDialog = savedSettings.showDialog === true;
    if (dom.toggleGuide) dom.toggleGuide.checked = showGuide;
    if (dom.toggleRepeat) dom.toggleRepeat.checked = repeatCharacter;
    if (dom.toggleDialog) dom.toggleDialog.checked = showDialog;

    initSpeech();
    updateStatsDashboard();

    // Level Filter Bar
    if (dom.practiceLevelBar) {
      dom.practiceLevelBar.addEventListener('click', (e) => {
        const chip = e.target.closest('.practice-level-chip');
        if (!chip) return;
        const lvl = chip.dataset.level;

        dom.practiceLevelBar.querySelectorAll('.practice-level-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        currentLevels = lvl === 'all' ? ['all'] : [lvl];
        filteredVocabulary = filterVocabulary();
        currentWordIndex = 0;
        if (filteredVocabulary.length > 0) {
          loadWord(filteredVocabulary[0], 0);
        }
      });
    }

    // Toggle Guide
    if (dom.toggleGuide) {
      dom.toggleGuide.addEventListener('change', (e) => {
        showGuide = e.target.checked;
        saveSettings({ showGuide });
        setupCharacterWriter();
      });
    }

    // Toggle Repeat Character
    if (dom.toggleRepeat) {
      dom.toggleRepeat.addEventListener('change', (e) => {
        repeatCharacter = e.target.checked;
        saveSettings({ repeatCharacter });
        if (dom.completeLifetimeBadge) {
          const history = getPracticeHistory();
          const chars = Array.from(currentWord ? currentWord.hanzi : '');
          const c = chars[currentCharIndex] || chars[0] || '';
          const rec = history[c];
          const cnt = rec ? rec.count : 0;
          dom.completeLifetimeBadge.textContent = `✍️ คัดตัวนี้สะสมแล้ว ${cnt} ครั้ง${repeatCharacter ? ' (เปิดโหมดคัดซ้ำ 🔁)' : ''}`;
        }
      });
    }

    // Toggle Dialog
    if (dom.toggleDialog) {
      dom.toggleDialog.addEventListener('change', (e) => {
        showDialog = e.target.checked;
        saveSettings({ showDialog });
      });
    }

    // Controls
    if (dom.btnPronounce) {
      dom.btnPronounce.addEventListener('click', () => {
        if (currentWord) playPronunciation(currentWord.hanzi);
      });
    }

    if (dom.btnHint) {
      dom.btnHint.addEventListener('click', () => {
        if (currentWriter) {
          currentWriter.animateStroke(currentStrokeCount);
        }
      });
    }

    if (dom.btnRestart) {
      dom.btnRestart.addEventListener('click', () => {
        setupCharacterWriter();
      });
    }

    if (dom.btnPrevWord) dom.btnPrevWord.addEventListener('click', prevWord);
    if (dom.btnRandomWord) dom.btnRandomWord.addEventListener('click', randomWord);
    if (dom.btnNextWord) dom.btnNextWord.addEventListener('click', nextWord);

    // Completion modal actions
    if (dom.btnPracticeAgain) {
      dom.btnPracticeAgain.addEventListener('click', () => {
        dom.completeOverlay.classList.remove('show');
        setupCharacterWriter();
      });
    }

    if (dom.btnCompleteNext) {
      dom.btnCompleteNext.addEventListener('click', () => {
        dom.completeOverlay.classList.remove('show');
        nextCharacterOrWord();
      });
    }

    // =========================================================
    // Statistics Modal Implementation
    // =========================================================
    function openStatsModal() {
      if (!dom.statsModal) return;
      const history = getPracticeHistory();
      const totals = getPracticeTotals();
      const chars = Object.keys(history);

      if (dom.modalStatSessions) dom.modalStatSessions.textContent = totals.totalSessions;
      if (dom.modalStatChars) dom.modalStatChars.textContent = chars.length;
      if (dom.modalStatAccuracy) {
        const avg = totals.totalSessions > 0 ? Math.round(totals.totalAccuracySum / totals.totalSessions) : 0;
        dom.modalStatAccuracy.textContent = `${avg}%`;
      }

      // Find top practiced character
      let topChar = '-';
      let maxCount = 0;
      chars.forEach(c => {
        if (history[c].count > maxCount) {
          maxCount = history[c].count;
          topChar = `${c} (${maxCount} ครั้ง)`;
        }
      });
      if (dom.modalStatTopChar) dom.modalStatTopChar.textContent = topChar;

      // Render character cards in grid
      if (dom.historyTotalTag) dom.historyTotalTag.textContent = `${chars.length} ตัว`;
      if (dom.statsCharsGrid) {
        if (chars.length === 0) {
          dom.statsCharsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 24px 0;">
              ยังไม่มีประวัติการคัดตัวอักษร ลองเริ่มคัดคำแรกได้เลย!
            </div>`;
        } else {
          // Sort by lastPracticed descending
          const sortedChars = chars.sort((a, b) => (history[b].lastPracticed || 0) - (history[a].lastPracticed || 0));
          let html = '';
          sortedChars.forEach(c => {
            const item = history[c];
            html += `
              <div class="stat-char-item">
                <div class="stat-char-hanzi">${c}</div>
                <div class="stat-char-meta">
                  <span class="stat-char-count">${item.count} ครั้ง</span>
                  <span class="stat-char-acc">${item.bestAccuracy}%</span>
                </div>
                <button class="btn-char-practice-quick" data-char="${c}">✍️ คัดตัวนี้</button>
              </div>`;
          });
          dom.statsCharsGrid.innerHTML = html;

          // Wire click on quick practice buttons
          dom.statsCharsGrid.querySelectorAll('.btn-char-practice-quick').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const charToPractice = e.currentTarget.dataset.char;
              closeStatsModal();
              jumpToPractice(charToPractice);
            });
          });
        }
      }

      dom.statsModal.classList.add('show');
    }

    function closeStatsModal() {
      if (dom.statsModal) dom.statsModal.classList.remove('show');
    }

    dom.statsBoard?.addEventListener('click', openStatsModal);
    dom.btnOpenStatsModal?.addEventListener('click', openStatsModal);
    dom.btnCloseStatsModal?.addEventListener('click', closeStatsModal);
    dom.modalStatsBackdrop?.addEventListener('click', closeStatsModal);

    // =========================================================
    // Word Picker & Vocabulary Browser Implementation
    // =========================================================
    let pickerCurrentLevel = 'all';
    let pickerSearchQuery = '';

    function openWordPickerModal() {
      if (!dom.wordPickerModal) return;
      pickerCurrentLevel = currentLevels[0] || 'all';

      // Sync level chips in picker
      if (dom.pickerLevelFilter) {
        dom.pickerLevelFilter.querySelectorAll('.picker-level-chip').forEach(chip => {
          chip.classList.toggle('active', chip.dataset.level === pickerCurrentLevel);
        });
      }

      if (dom.pickerSearchInput) {
        dom.pickerSearchInput.value = '';
        pickerSearchQuery = '';
      }

      renderPickerWords();
      dom.wordPickerModal.classList.add('show');
      setTimeout(() => dom.pickerSearchInput?.focus(), 150);
    }

    function closeWordPickerModal() {
      if (dom.wordPickerModal) dom.wordPickerModal.classList.remove('show');
    }

    function getFilteredPickerWords() {
      if (typeof HSK_DATA === 'undefined') return [];
      let list = HSK_DATA;

      if (pickerCurrentLevel !== 'all') {
        const hasHsk789 = pickerCurrentLevel === 'HSK 7' || pickerCurrentLevel === 'HSK 8' || pickerCurrentLevel === 'HSK 9';
        list = list.filter(item => {
          if (item.level === pickerCurrentLevel) return true;
          if (hasHsk789 && (item.level === 'HSK 7' || item.level === 'HSK 8' || item.level === 'HSK 9' || item.level === 'HSK 7-8' || item.level === 'HSK 7-9')) {
            return true;
          }
          return false;
        });
      }

      if (pickerSearchQuery.trim()) {
        const q = pickerSearchQuery.trim().toLowerCase();
        list = list.filter(item => {
          return (item.hanzi && item.hanzi.toLowerCase().includes(q)) ||
                 (item.pinyin && item.pinyin.toLowerCase().includes(q)) ||
                 (item.meaning && item.meaning.toLowerCase().includes(q)) ||
                 (item.meaning_en && item.meaning_en.toLowerCase().includes(q));
        });
      }

      return list;
    }

    function renderPickerWords() {
      if (!dom.pickerWordsGrid) return;
      const history = getPracticeHistory();
      const words = getFilteredPickerWords();

      if (dom.pickerResultsCount) {
        dom.pickerResultsCount.textContent = `พบ ${words.length} คำ`;
      }

      if (words.length === 0) {
        dom.pickerWordsGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 32px 0;">
            ไม่พบคำศัพท์ที่ตรงกับการค้นหา
          </div>`;
        return;
      }

      // Limit initial rendering to first 120 words for smooth performance
      const displayWords = words.slice(0, 120);
      let html = '';

      displayWords.forEach((word) => {
        const chars = Array.from(word.hanzi);
        const isSingle = chars.length <= 1;

        if (isSingle) {
          // Single-character word (e.g. 一, 大)
          const charCount = history[word.hanzi] ? history[word.hanzi].count : 0;
          html += `
            <div class="picker-word-card" data-word-id="${word.id}" data-char-idx="0">
              <div class="picker-word-top">
                <span class="picker-word-hsk">${word.level}</span>
                ${charCount > 0 ? `<span class="picker-word-practiced">✍️ คัดแล้ว ${charCount}</span>` : ''}
              </div>
              <div class="picker-word-hanzi">${word.hanzi}</div>
              <div class="picker-word-pinyin">${word.pinyin}</div>
              <div class="picker-word-meaning" title="${word.meaning}">${word.meaning}</div>
            </div>`;
        } else {
          // Multi-character word (e.g. 一些, 一下, 学校)
          const practicedChars = chars.filter(c => history[c] && history[c].count > 0).length;
          const allPracticed = practicedChars === chars.length;

          // Build character pills HTML
          let charPillsHtml = '';
          chars.forEach((c, idx) => {
            const cnt = history[c] ? history[c].count : 0;
            charPillsHtml += `
              <button class="picker-char-pill ${cnt > 0 ? 'practiced' : ''}" data-word-id="${word.id}" data-char-idx="${idx}" title="แตะเพื่อเลือกเขียนตัว ${c}">
                <span class="pill-char">${c}</span>
                <span class="pill-cnt">${cnt}</span>
              </button>`;
          });

          html += `
            <div class="picker-word-card multi-char" data-word-id="${word.id}" data-char-idx="0">
              <div class="picker-word-top">
                <span class="picker-word-hsk">${word.level}</span>
                ${practicedChars > 0 ? `<span class="picker-word-practiced ${allPracticed ? 'all-done' : ''}">✍️ ${practicedChars}/${chars.length} ตัว</span>` : ''}
              </div>
              <div class="picker-word-hanzi">${word.hanzi}</div>
              <div class="picker-word-pinyin">${word.pinyin}</div>
              <div class="picker-word-meaning" title="${word.meaning}">${word.meaning}</div>
              <div class="picker-char-selector-row">
                <span class="picker-sub-label">เลือกตัวเขียน:</span>
                <div class="picker-char-pills">${charPillsHtml}</div>
              </div>
            </div>`;
        }
      });

      dom.pickerWordsGrid.innerHTML = html;

      // Wire card and pill clicks
      dom.pickerWordsGrid.querySelectorAll('.picker-char-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
          e.stopPropagation(); // prevent parent card click
          const wordId = parseInt(pill.dataset.wordId, 10);
          const charIdx = parseInt(pill.dataset.charIdx, 10) || 0;
          const found = HSK_DATA.find(w => w.id === wordId);
          if (found) {
            closeWordPickerModal();
            loadWord(found, charIdx);
          }
        });
      });

      dom.pickerWordsGrid.querySelectorAll('.picker-word-card').forEach(card => {
        card.addEventListener('click', () => {
          const wordId = parseInt(card.dataset.wordId, 10);
          const charIdx = parseInt(card.dataset.charIdx, 10) || 0;
          const found = HSK_DATA.find(w => w.id === wordId);
          if (found) {
            closeWordPickerModal();
            loadWord(found, charIdx);
          }
        });
      });
    }

    dom.btnOpenWordPicker?.addEventListener('click', openWordPickerModal);
    dom.btnHeaderPickWord?.addEventListener('click', openWordPickerModal);
    dom.btnClosePickerModal?.addEventListener('click', closeWordPickerModal);
    dom.modalPickerBackdrop?.addEventListener('click', closeWordPickerModal);

    // Filter Level inside Picker
    dom.pickerLevelFilter?.addEventListener('click', (e) => {
      const chip = e.target.closest('.picker-level-chip');
      if (!chip) return;
      dom.pickerLevelFilter.querySelectorAll('.picker-level-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      pickerCurrentLevel = chip.dataset.level;
      renderPickerWords();
    });

    // Debounced search input
    let searchDebounce = null;
    dom.pickerSearchInput?.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        pickerSearchQuery = e.target.value;
        renderPickerWords();
      }, 150);
    });

    dom.pickerSearchClear?.addEventListener('click', () => {
      if (dom.pickerSearchInput) dom.pickerSearchInput.value = '';
      pickerSearchQuery = '';
      renderPickerWords();
    });

    // Initialize vocabulary list
    filteredVocabulary = filterVocabulary();
    if (filteredVocabulary.length > 0) {
      loadWord(filteredVocabulary[0], 0);
    }
  }

  // Export to window
  window.PracticeManager = {
    init: initPractice,
    jumpToPractice: jumpToPractice,
    loadWord: loadWord,
    getPracticeTotals: getPracticeTotals,
    getPracticeHistory: getPracticeHistory
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPractice);
  } else {
    initPractice();
  }
})();


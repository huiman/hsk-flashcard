/**
 * HSK Flashcard - Tutor & Study Groups Controller (js/tutor.js)
 * Manages study group clustering, filters, interactive quiz,
 * TTS pronunciation, practice integration, and AI prompt exporter.
 */

window.HSK_TUTOR = (function() {
  'use strict';

  const ALL_HSK = ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6", "HSK 7", "HSK 8", "HSK 9"];

  // 1. Module State
  const state = {
    groupBy: 'radical', // 'radical' | 'category' | 'both' | 'phonetic'
    focus: 'all',
    maxPerGroup: 12,
    skipKnown: false,
    currentGroups: [],
    quizQuestions: [],
    currentQuizIndex: 0,
    quizScore: 0,
    quizAnswered: false
  };

  // Helper to read active HSK levels from the app's system setting
  function getActiveLevels() {
    try {
      if (typeof window.getSelectedLevels === 'function') {
        const lvls = window.getSelectedLevels();
        if (Array.isArray(lvls) && lvls.length > 0) {
          if (lvls.includes('all') || lvls.length === ALL_HSK.length) return [...ALL_HSK];
          return lvls;
        }
      }
      const raw = localStorage.getItem('hsk_selected_levels');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed.includes('all') || parsed.length === ALL_HSK.length) return [...ALL_HSK];
          return parsed;
        }
      }
    } catch (e) {}
    return ['HSK 1'];
  }

  // 2. DOM Elements Cache
  let dom = {};

  function cacheDom() {
    dom = {
      viewTutor: document.getElementById('view-tutor'),
      tutorLevelBar: document.getElementById('tutor-level-bar'),
      tutorLevelChips: document.querySelectorAll('.tutor-level-chip'),
      btnTutorPrompt: document.getElementById('btn-tutor-prompt'),
      btnTutorQuizJump: document.getElementById('btn-tutor-quiz-jump'),
      activeLevelsDisplay: document.getElementById('tutor-active-levels-display'),
      btnChangeLevel: document.getElementById('btn-tutor-change-level'),
      groupbyPills: document.querySelectorAll('.btn-groupby-pill'),
      focusChipsBar: document.getElementById('focus-chips-bar'),
      maxSlider: document.getElementById('tutor-max-slider'),
      maxValBadge: document.getElementById('tutor-max-val'),
      skipKnownToggle: document.getElementById('toggle-skip-known'),
      skipCountBadge: document.getElementById('skip-count-badge'),
      btnGenerate: document.getElementById('btn-generate-groups'),
      summaryBar: document.getElementById('tutor-summary-bar'),
      summaryText: document.getElementById('tutor-summary-text'),
      summaryPill: document.getElementById('tutor-summary-pill'),
      groupsList: document.getElementById('tutor-groups-list'),
      quizContainer: document.getElementById('tutor-quiz-container'),
      quizBadgeTitle: document.getElementById('quiz-badge-title'),
      quizScorePill: document.getElementById('quiz-score-pill'),
      quizContent: document.getElementById('quiz-content'),
      promptModal: document.getElementById('tutor-prompt-modal'),
      btnCloseModal: document.getElementById('btn-close-prompt-modal'),
      btnCopyModalPrompt: document.getElementById('btn-copy-modal-prompt'),
      promptCodeText: document.getElementById('prompt-code-text'),
      toast: document.getElementById('tutor-toast'),
      toastText: document.getElementById('tutor-toast-text')
    };
  }

  // 3. Vocab Data & Known Words Helper
  function getHskData() {
    if (typeof window !== 'undefined' && Array.isArray(window.HSK_DATA) && window.HSK_DATA.length > 0) {
      return window.HSK_DATA;
    }
    if (typeof HSK_DATA !== 'undefined' && Array.isArray(HSK_DATA) && HSK_DATA.length > 0) {
      if (typeof window !== 'undefined') window.HSK_DATA = HSK_DATA;
      return HSK_DATA;
    }
    return [];
  }

  function getKnownIds() {
    try {
      return JSON.parse(localStorage.getItem('hsk_known_ids')) || [];
    } catch (e) {
      return [];
    }
  }

  function getKnownWordsList() {
    const knownIds = new Set(getKnownIds());
    const vocab = getHskData();
    if (vocab.length === 0 || knownIds.size === 0) return [];
    return vocab.filter(w => knownIds.has(w.id));
  }

  function updateKnownBadge() {
    const count = getKnownIds().length;
    if (dom.skipCountBadge) {
      dom.skipCountBadge.textContent = `${count} คำ`;
    }
  }

  // 4. Focus Sub-filters Renderer
  function renderFocusChips() {
    if (!dom.focusChipsBar) return;
    dom.focusChipsBar.innerHTML = '';

    const createChip = (val, label, active) => {
      const btn = document.createElement('button');
      btn.className = `focus-chip ${active ? 'active' : ''}`;
      btn.dataset.focus = val;
      btn.textContent = label;
      btn.addEventListener('click', () => {
        state.focus = val;
        renderFocusChips();
        generateGroups();
      });
      return btn;
    };

    // 'All' chip
    dom.focusChipsBar.appendChild(createChip('all', 'ทั้งหมด (All)', state.focus === 'all'));

    if (state.groupBy === 'radical' || state.groupBy === 'both') {
      const topRadicals = ['氵', '亻', '扌', '口', '木', '讠', '艹', '饣', '纟', '日', '月', '宀', '心', '火', '辶', '目', '钅', '女', '犭', '疒', '贝'];
      topRadicals.forEach(rad => {
        const info = window.HSK_TUTOR_DATA.RADICALS[rad];
        const label = info ? `${rad} (${info.meaningTh.split('/')[0].trim()})` : rad;
        dom.focusChipsBar.appendChild(createChip(rad, label, state.focus === rad));
      });
    } else if (state.groupBy === 'category') {
      window.HSK_TUTOR_DATA.SEMANTIC_CATEGORIES.forEach(cat => {
        const label = `${cat.icon} ${cat.name.split('(')[0].trim()}`;
        dom.focusChipsBar.appendChild(createChip(cat.id, label, state.focus === cat.id));
      });
    } else if (state.groupBy === 'phonetic') {
      window.HSK_TUTOR_DATA.PHONETIC_FAMILIES.forEach(fam => {
        const label = `${fam.root} (${fam.pinyin})`;
        dom.focusChipsBar.appendChild(createChip(fam.root, label, state.focus === fam.root));
      });
    }
  }

  // 5. Speech Synthesis Helper
  function speakChinese(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  // 6. Toast Notification
  let toastTimer = null;
  function showToast(message) {
    if (!dom.toast) return;
    if (dom.toastText) dom.toastText.textContent = message;
    dom.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      dom.toast.classList.remove('show');
    }, 2800);
  }

  // Helper to render active HSK levels in both the top level-bar and config badge
  function updateActiveLevelsUI() {
    const levels = getActiveLevels();
    const isAll = levels.length === ALL_HSK.length;

    // Update chips in top tutor-level-bar (like other cards)
    if (dom.tutorLevelChips && dom.tutorLevelChips.length > 0) {
      dom.tutorLevelChips.forEach(chip => {
        const lvl = chip.dataset.level;
        if (lvl === 'all') {
          chip.classList.toggle('active', isAll);
        } else {
          chip.classList.toggle('active', levels.includes(lvl) || isAll);
        }
      });
    }

    // Update badge in configuration card
    if (dom.activeLevelsDisplay) {
      if (isAll) {
        dom.activeLevelsDisplay.innerHTML = '<span class="active-lvl-tag">ทั้งหมด (HSK 1 - 9)</span>';
      } else {
        dom.activeLevelsDisplay.innerHTML = levels.map(l => `<span class="active-lvl-tag">${l}</span>`).join(' ');
      }
    }
  }

  // Helper to update app-wide HSK levels and sync everywhere
  function setAppLevels(newLevels) {
    if (!Array.isArray(newLevels) || newLevels.length === 0) {
      newLevels = ['HSK 1'];
    }
    try {
      localStorage.setItem('hsk_selected_levels', JSON.stringify(newLevels));
    } catch (e) {}

    // Dispatch global event so Flashcards, Settings, and Tutor all sync
    window.dispatchEvent(new CustomEvent('app:levels-changed', { detail: { selectedLevels: newLevels } }));
    updateActiveLevelsUI();
    generateGroups();
  }

  // 7. Core Grouping Engine
  function generateGroups() {
    if (!dom.groupsList) cacheDom();
    const vocab = getHskData();
    if (vocab.length === 0) {
      console.warn('[Tutor] HSK_DATA not ready');
      return;
    }

    const activeLevels = getActiveLevels();
    updateActiveLevelsUI();

    const knownSet = new Set(getKnownIds());
    const selectedLevelSet = new Set(activeLevels);
    const hasHsk789 = activeLevels.some(l => l === 'HSK 7' || l === 'HSK 8' || l === 'HSK 9');

    // Filter words across all selected levels together
    let pool = vocab.filter(w => {
      if (selectedLevelSet.has(w.level)) return true;
      if (hasHsk789 && (w.level === 'HSK 7' || w.level === 'HSK 8' || w.level === 'HSK 9' || w.level === 'HSK 7-8' || w.level === 'HSK 7-9')) return true;
      return false;
    });

    // Exclude known words if requested
    if (state.skipKnown) {
      pool = pool.filter(w => !knownSet.has(w.id));
    }

    let groups = [];

    // Branch A: Group by Radical
    if (state.groupBy === 'radical') {
      const map = new Map();
      pool.forEach(word => {
        const firstChar = word.hanzi[0];
        const rad = window.HSK_TUTOR_DATA.detectRadical(firstChar) || '其他';
        if (state.focus !== 'all' && rad !== state.focus) return;

        if (!map.has(rad)) {
          const radInfo = window.HSK_TUTOR_DATA.RADICALS[rad];
          map.set(rad, {
            id: rad,
            type: 'radical',
            title: radInfo ? `กลุ่มรากอักษร "${rad}" · ${radInfo.meaningTh}` : `กลุ่มอักษร "${rad}"`,
            tag: rad,
            desc: radInfo ? radInfo.hook : 'กลุ่มคำที่มีรากอักษรและส่วนประกอบร่วมกัน',
            hook: radInfo ? radInfo.hook : 'สังเกตส่วนประกอบร่วมกันเพื่อช่วยจดจำความหมาย',
            words: []
          });
        }
        map.get(rad).words.push(word);
      });
      groups = Array.from(map.values());
    }

    // Branch B: Group by Semantic Category
    else if (state.groupBy === 'category') {
      const map = new Map();
      pool.forEach(word => {
        const cat = window.HSK_TUTOR_DATA.detectCategory(word);
        if (!cat) return;
        if (state.focus !== 'all' && cat.id !== state.focus) return;

        if (!map.has(cat.id)) {
          map.set(cat.id, {
            id: cat.id,
            type: 'category',
            title: `${cat.icon} หมวดหมู่วิถีชีวิต · ${cat.name}`,
            tag: cat.name.split('(')[0].trim(),
            desc: cat.desc,
            hook: cat.hook,
            words: []
          });
        }
        map.get(cat.id).words.push(word);
      });
      groups = Array.from(map.values());
    }

    // Branch C: Group by Both (Radical + Category hybrid)
    else if (state.groupBy === 'both') {
      const map = new Map();
      pool.forEach(word => {
        const firstChar = word.hanzi[0];
        const rad = window.HSK_TUTOR_DATA.detectRadical(firstChar);
        const cat = window.HSK_TUTOR_DATA.detectCategory(word);
        if (!rad) return;
        if (state.focus !== 'all' && rad !== state.focus && (!cat || cat.id !== state.focus)) return;

        const key = cat ? `${rad}__${cat.id}` : rad;
        if (!map.has(key)) {
          const radInfo = window.HSK_TUTOR_DATA.RADICALS[rad];
          const radText = radInfo ? radInfo.meaningTh.split('/')[0].trim() : rad;
          const catText = cat ? cat.name.split('(')[0].trim() : 'คำศัพท์ทั่วไป';
          map.set(key, {
            id: key,
            type: 'both',
            title: `กลุ่มอักษร "${rad}" (${radText}) · หมวด ${catText}`,
            tag: `${rad} + ${catText}`,
            desc: radInfo ? `${radInfo.hook} (บริบท: ${catText})` : `คำศัพท์ที่มีราก ${rad}`,
            hook: radInfo ? radInfo.hook : 'เรียนรู้การผสมผสานระหว่างรากศัพท์และหมวดหมู่ความหมาย',
            words: []
          });
        }
        map.get(key).words.push(word);
      });
      groups = Array.from(map.values());
    }

    // Branch D: Group by Phonetic Components
    else if (state.groupBy === 'phonetic') {
      window.HSK_TUTOR_DATA.PHONETIC_FAMILIES.forEach(fam => {
        if (state.focus !== 'all' && fam.root !== state.focus) return;
        const charSet = new Set(fam.chars);
        const matchedWords = pool.filter(w => {
          for (const char of w.hanzi) {
            if (charSet.has(char)) return true;
          }
          return false;
        });

        if (matchedWords.length > 0) {
          groups.push({
            id: fam.root,
            type: 'phonetic',
            title: fam.title,
            tag: `เสียง ${fam.pinyin}`,
            desc: fam.desc,
            hook: `คำในกลุ่มนี้ใช้ "${fam.root}" เป็นแกนเสียง สื่อถึงความเกี่ยวข้องของการสะกดและสระที่ใกล้เคียงกัน`,
            words: matchedWords
          });
        }
      });
    }

    // Order groups by usefulness (most words first, min 2 words per group)
    groups = groups.filter(g => g.words.length >= 2);
    groups.sort((a, b) => b.words.length - a.words.length);

    // Within each group, sort words by HSK level (HSK 1 lowest first, then ID)
    const levelOrder = { 'HSK 1': 1, 'HSK 2': 2, 'HSK 3': 3, 'HSK 4': 4, 'HSK 5': 5, 'HSK 6': 6, 'HSK 7': 7, 'HSK 8': 8, 'HSK 9': 9 };
    groups.forEach(g => {
      g.words.sort((w1, w2) => {
        const l1 = levelOrder[w1.level] || 99;
        const l2 = levelOrder[w2.level] || 99;
        if (l1 !== l2) return l1 - l2;
        return w1.id - w2.id;
      });
      // Limit words per group
      g.words = g.words.slice(0, state.maxPerGroup);
    });

    state.currentGroups = groups;
    renderResults();
    buildQuizQuestions();
  }

  // 8. Render Results in DOM
  function renderResults() {
    if (!dom.groupsList) return;
    dom.groupsList.innerHTML = '';

    const totalWords = state.currentGroups.reduce((acc, g) => acc + g.words.length, 0);

    if (dom.summaryText) {
      dom.summaryText.textContent = `พบ ${state.currentGroups.length} กลุ่มคำศัพท์ (${totalWords} คำ)`;
    }
    if (dom.summaryPill) {
      const activeLevels = getActiveLevels();
      dom.summaryPill.textContent = activeLevels.length === ALL_HSK.length ? 'HSK 1 - 9' : activeLevels.join(', ');
    }

    if (state.currentGroups.length === 0) {
      dom.groupsList.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; background: rgba(255,255,255,0.8); border-radius: 16px; border: 1px dashed #cbd5e1;">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">🔍</div>
          <h3 style="color: #334155; margin-bottom: 4px;">ไม่พบคำศัพท์ที่ตรงตามเงื่อนไข</h3>
          <p style="color: #64748b; font-size: 0.9rem;">ลองเลือกเพิ่มระดับ HSK หรือปรับตัวกรองโฟกัสเป็น "ทั้งหมด"</p>
        </div>
      `;
      return;
    }

    state.currentGroups.forEach(group => {
      const card = document.createElement('div');
      card.className = 'study-group-card';

      // Confusables for this group
      const confusables = window.HSK_TUTOR_DATA.findConfusablesForWords(group.words);
      const sentences = window.HSK_TUTOR_DATA.getExampleSentences(group.id);

      // Build Table Rows
      const rowsHtml = group.words.map(w => {
        const levelClass = `level-${w.level.toLowerCase().replace(/\s+/g, '')}`;
        const firstRad = window.HSK_TUTOR_DATA.detectRadical(w.hanzi[0]) || '-';
        const secondRad = w.hanzi.length > 1 ? (window.HSK_TUTOR_DATA.detectRadical(w.hanzi[1]) || '') : '';
        const radDisplay = secondRad && secondRad !== firstRad ? `${firstRad} / ${secondRad}` : firstRad;
        const cat = window.HSK_TUTOR_DATA.detectCategory(w);
        const catDisplay = cat ? cat.name.split('(')[0].trim() : '-';

        return `
          <tr>
            <td>
              <div class="word-hanzi-cell">
                <span class="word-hanzi-text">${w.hanzi}</span>
                <button class="word-btn-audio" data-hanzi="${w.hanzi}" title="ฟังเสียงอ่าน">🔊</button>
              </div>
            </td>
            <td><span class="word-pinyin-cell">${w.pinyin}</span></td>
            <td>
              <div class="word-meaning-cell">
                <span>${w.meaning}</span>
                <span class="word-meaning-en">${w.meaning_en || ''}</span>
              </div>
            </td>
            <td><span class="word-level-badge ${levelClass}">${w.level}</span></td>
            <td><span style="font-weight:600; color:#475569;">${radDisplay}</span></td>
            <td><span style="color:#64748b; font-size:0.8rem;">${catDisplay}</span></td>
            <td>
              <button class="word-btn-practice" data-hanzi="${w.hanzi[0]}" data-word-id="${w.id}" title="เปิดในแท็บฝึกคัดลายมือ">
                ✍️ คัด
              </button>
            </td>
          </tr>
        `;
      }).join('');

      // Build Sentences HTML
      const sentencesHtml = sentences.map(s => `
        <div class="sentence-item">
          <div class="sentence-zh-row">
            <span class="sentence-zh">${s.hanzi}</span>
            <button class="sentence-btn-audio" data-hanzi="${s.hanzi}" title="ฟังประโยค">🔊</button>
          </div>
          <div class="sentence-py">${s.pinyin}</div>
          <div class="sentence-th">${s.th}</div>
          <div class="sentence-en">${s.en}</div>
        </div>
      `).join('');

      // Build Confusables HTML if any
      const confusablesHtml = confusables.length > 0 ? `
        <div class="confusables-box">
          <span class="confusables-icon">⚠️</span>
          <div class="confusables-content">
            <strong>คำที่มักสับสนหรือคล้ายคลึง:</strong><br/>
            ${confusables.join('<br/>')}
          </div>
        </div>
      ` : '';

      card.innerHTML = `
        <div class="group-header">
          <div class="group-title-box">
            <div class="group-title-row">
              <h3 class="group-title">${group.title}</h3>
              <span class="group-tag-badge">${group.tag}</span>
            </div>
            <div class="group-desc">${group.desc}</div>
          </div>
          <span class="group-word-count">${group.words.length} คำ</span>
        </div>

        <div class="group-table-wrap">
          <table class="group-vocab-table">
            <thead>
              <tr>
                <th>อักษรจีน</th>
                <th>พินอิน</th>
                <th>ความหมาย (ไทย/อังกฤษ)</th>
                <th>ระดับ HSK</th>
                <th>หมวดอักษร</th>
                <th>หมวดหมู่</th>
                <th>ฝึกฝน</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div class="hook-box">
          <span class="hook-icon">💡</span>
          <div class="hook-content">
            <strong>Memory Hook (กลเม็ดช่วยจำ):</strong> ${group.hook}
          </div>
        </div>

        <div class="sentences-box">
          <div class="sentences-title">📖 ตัวอย่างประโยคการใช้งาน (2 Example Sentences)</div>
          ${sentencesHtml}
        </div>

        ${confusablesHtml}
      `;

      // Attach audio & practice listeners inside this card
      card.querySelectorAll('.word-btn-audio, .sentence-btn-audio').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          speakChinese(btn.dataset.hanzi);
        });
      });

      card.querySelectorAll('.word-btn-practice').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const wordId = parseInt(btn.dataset.wordId, 10);
          const vocab = getHskData();
          const found = vocab ? vocab.find(w => w.id === wordId) : null;
          if (found && window.PracticeManager && typeof window.PracticeManager.jumpToPractice === 'function') {
            window.PracticeManager.jumpToPractice(found);
          } else if (typeof window.switchAppView === 'function') {
            window.switchAppView('practice');
          }
        });
      });

      dom.groupsList.appendChild(card);
    });
  }

  // 9. Interactive 5-Question Quiz Engine
  function buildQuizQuestions() {
    const allWords = [];
    state.currentGroups.forEach(g => allWords.push(...g.words));

    if (allWords.length === 0) {
      if (dom.quizContainer) dom.quizContainer.style.display = 'none';
      return;
    }

    if (dom.quizContainer) dom.quizContainer.style.display = 'flex';

    // Shuffle and pick words for 5 questions
    const shuffled = [...allWords].sort(() => 0.5 - Math.random());
    const count = Math.min(5, shuffled.length);
    const questions = [];

    for (let i = 0; i < count; i++) {
      const targetWord = shuffled[i];
      const isHanziToMeaning = i % 2 === 0;

      // Generate distractors
      const vocab = getHskData();
      const pool = vocab.filter(w => w.id !== targetWord.id);
      const distractors = [...pool].sort(() => 0.5 - Math.random()).slice(0, 3);
      const options = [...distractors, targetWord].sort(() => 0.5 - Math.random());

      if (isHanziToMeaning) {
        questions.push({
          type: 'hanzi-to-meaning',
          promptText: `คำศัพท์ภาษาจีนคำนี้มีความหมายว่าอย่างไร?`,
          promptDisplay: targetWord.hanzi,
          subPrompt: `พินอิน: ${targetWord.pinyin} (${targetWord.level})`,
          correctAnswer: targetWord.meaning,
          correctWord: targetWord,
          options: options.map(o => ({
            label: `${o.meaning} (${o.pinyin})`,
            value: o.meaning,
            isCorrect: o.id === targetWord.id
          }))
        });
      } else {
        questions.push({
          type: 'meaning-to-hanzi',
          promptText: `คำว่า "${targetWord.meaning}" เขียนเป็นอักษรจีนว่าอย่างไร?`,
          promptDisplay: `"${targetWord.meaning}"`,
          subPrompt: `ระดับ ${targetWord.level}`,
          correctAnswer: targetWord.hanzi,
          correctWord: targetWord,
          options: options.map(o => ({
            label: `${o.hanzi} (${o.pinyin})`,
            value: o.hanzi,
            isCorrect: o.id === targetWord.id
          }))
        });
      }
    }

    state.quizQuestions = questions;
    state.currentQuizIndex = 0;
    state.quizScore = 0;
    state.quizAnswered = false;
    renderCurrentQuestion();
  }

  function renderCurrentQuestion() {
    if (!dom.quizContent) return;

    if (state.currentQuizIndex >= state.quizQuestions.length) {
      // Quiz Finished Celebration
      dom.quizContent.innerHTML = `
        <div class="quiz-celebrate-box">
          <div class="quiz-celebrate-icon">🎉</div>
          <div class="quiz-celebrate-title">ยินดีด้วย! คุณทำแบบทดสอบครบแล้ว</div>
          <div class="quiz-celebrate-score">คะแนนของคุณ: ${state.quizScore} / ${state.quizQuestions.length} คะแนน</div>
          <button class="btn-quiz-restart" id="btn-quiz-restart">🔄 ทำแบบทดสอบชุดใหม่อีกครั้ง</button>
        </div>
      `;
      document.getElementById('btn-quiz-restart')?.addEventListener('click', () => {
        buildQuizQuestions();
      });
      return;
    }

    const q = state.quizQuestions[state.currentQuizIndex];
    state.quizAnswered = false;

    if (dom.quizScorePill) {
      dom.quizScorePill.textContent = `ข้อ ${state.currentQuizIndex + 1}/${state.quizQuestions.length} · คะแนน: ${state.quizScore}`;
    }

    const optionsHtml = q.options.map((opt, idx) => `
      <button class="quiz-option-btn" data-index="${idx}">
        <span>${opt.label}</span>
      </button>
    `).join('');

    dom.quizContent.innerHTML = `
      <div class="quiz-question-box">
        <div class="quiz-prompt-text">${q.promptText}</div>
        <div class="quiz-prompt-zh">${q.promptDisplay}</div>
        <div style="text-align: center; color: #64748b; font-size: 0.85rem; margin-top: -8px;">${q.subPrompt}</div>

        <div class="quiz-options-grid">
          ${optionsHtml}
        </div>

        <div class="quiz-feedback-box" id="quiz-feedback-box"></div>

        <div class="quiz-actions-row">
          <button class="btn-quiz-next" id="btn-quiz-next" style="display: none;">
            ${state.currentQuizIndex === state.quizQuestions.length - 1 ? 'ดูผลคะแนน 🏆' : 'คำถามถัดไป ➡️'}
          </button>
        </div>
      </div>
    `;

    // Attach answer selection
    const optionBtns = dom.quizContent.querySelectorAll('.quiz-option-btn');
    const feedbackBox = document.getElementById('quiz-feedback-box');
    const nextBtn = document.getElementById('btn-quiz-next');

    optionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (state.quizAnswered) return;
        state.quizAnswered = true;

        const idx = parseInt(btn.dataset.index, 10);
        const selected = q.options[idx];

        // Disable all buttons and show correct answer
        optionBtns.forEach((b, bIdx) => {
          b.disabled = true;
          if (q.options[bIdx].isCorrect) {
            b.classList.add('correct');
          }
        });

        if (selected.isCorrect) {
          state.quizScore++;
          btn.classList.add('correct');
          feedbackBox.className = 'quiz-feedback-box active correct';
          feedbackBox.innerHTML = `✨ <strong>ถูกต้อง!</strong> ${q.correctWord.hanzi} (${q.correctWord.pinyin}) แปลว่า "${q.correctWord.meaning}"`;
        } else {
          btn.classList.add('wrong');
          feedbackBox.className = 'quiz-feedback-box active wrong';
          feedbackBox.innerHTML = `❌ <strong>ยังไม่ถูกต้อง</strong> คำตอบที่ถูกคือ "${q.correctAnswer}" (${q.correctWord.hanzi} - ${q.correctWord.pinyin})`;
        }

        if (dom.quizScorePill) {
          dom.quizScorePill.textContent = `ข้อ ${state.currentQuizIndex + 1}/${state.quizQuestions.length} · คะแนน: ${state.quizScore}`;
        }

        nextBtn.style.display = 'block';
      });
    });

    nextBtn?.addEventListener('click', () => {
      state.currentQuizIndex++;
      renderCurrentQuestion();
    });
  }

  // 10. AI Prompt Generator & Clipboard Copier
  function buildAIPrompt() {
    const activeLevels = getActiveLevels();
    const levelsStr = activeLevels.map(l => l.replace('HSK ', '')).join(', ');
    const groupByStr = state.groupBy === 'radical' ? 'radical' :
                       state.groupBy === 'category' ? 'semantic category' :
                       state.groupBy === 'both' ? 'both' : 'shared phonetic component';
    const focusStr = state.focus === 'all' ? 'all' : state.focus;

    // Retrieve known words list
    const knownWords = getKnownWordsList().slice(0, 30).map(w => w.hanzi).join(', ');
    const knownField = knownWords ? knownWords : '[none]';

    return `You are a Chinese vocabulary tutor. Build study groups from the official HSK 3.0 word list (levels 1-9).

INPUT
- Levels to include: [${levelsStr}]
- Group by: [${groupByStr}]
- Focus (optional): [${focusStr}]
- Max words per group: [${state.maxPerGroup}]
- Words I already know (skip these): [${knownField}]

TASK
1. Search across ALL selected levels together, not level by level.
2. Group words that share the chosen feature. For multi-character words,
   group by the radical of the first character, and mention the second
   character's radical if it is relevant.
3. Order groups from most useful to least, and within each group order
   words by HSK level (lowest first).

OUTPUT (one table per group)
Group title, with a one-line explanation of what connects the words.

| Hanzi | Pinyin | Meaning | HSK level | Radical | Category |

After each table:
- Memory hook: how the radical or category explains the meanings.
- 2 example sentences (hanzi + pinyin + English) using words from the group.
- Confusable words: similar-looking or similar-sounding words to watch for.

RULES
- Use only words that are actually on the HSK list. If you are unsure of a
  word's level, mark it "level unverified" instead of guessing.
- Use Simplified characters with tone-marked pinyin.
- Keep meanings short (under 8 words).
- Do not repeat a word in more than one group unless I asked for "both".

END WITH
A 5-question quiz on the words above (mix of hanzi→meaning and
meaning→hanzi), with answers hidden until I reply.`;
  }

  function openPromptModal() {
    const promptText = buildAIPrompt();
    if (dom.promptCodeText) {
      dom.promptCodeText.textContent = promptText;
    }
    if (dom.promptModal) {
      dom.promptModal.classList.add('active');
    }
  }

  function closePromptModal() {
    if (dom.promptModal) {
      dom.promptModal.classList.remove('active');
    }
  }

  async function copyPromptToClipboard() {
    const promptText = buildAIPrompt();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(promptText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = promptText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast('📋 คัดลอก Prompt สำหรับ AI เรียบร้อยแล้ว!');
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
      showToast('⚠️ คัดลอกไม่สำเร็จ กรุณากดดูตัวอย่างแล้วก๊อปปี้ด้วยตนเอง');
    }
  }

  // 11. Event Listeners Setup
  function initEvents() {
    // Quick Prompt Buttons
    dom.btnTutorPrompt?.addEventListener('click', () => {
      openPromptModal();
    });

    dom.btnCopyModalPrompt?.addEventListener('click', () => {
      copyPromptToClipboard();
      closePromptModal();
    });

    dom.btnCloseModal?.addEventListener('click', closePromptModal);
    dom.promptModal?.addEventListener('click', (e) => {
      if (e.target === dom.promptModal) closePromptModal();
    });

    // Jump to Quiz Button
    dom.btnTutorQuizJump?.addEventListener('click', () => {
      if (dom.quizContainer) {
        dom.quizContainer.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // Tutor Level Bar Chips click selection (identical to flashcards and other cards)
    if (dom.tutorLevelChips && dom.tutorLevelChips.length > 0) {
      dom.tutorLevelChips.forEach(chip => {
        chip.addEventListener('click', () => {
          const level = chip.dataset.level;
          let current = getActiveLevels();

          if (level === 'all') {
            if (current.length === ALL_HSK.length) {
              setAppLevels(['HSK 1']);
            } else {
              setAppLevels([...ALL_HSK]);
            }
          } else {
            if (current.includes(level)) {
              if (current.length > 1) {
                setAppLevels(current.filter(l => l !== level));
              } else {
                showToast('⚠️ ต้องเลือกอย่างน้อย 1 ระดับ HSK');
              }
            } else {
              setAppLevels([...current, level]);
            }
          }
        });

        // Double-click to isolate single level
        chip.addEventListener('dblclick', (e) => {
          e.preventDefault();
          const level = chip.dataset.level;
          if (level === 'all') {
            setAppLevels([...ALL_HSK]);
          } else {
            setAppLevels([level]);
          }
        });
      });
    }

    // Button to trigger setting or level change
    dom.btnChangeLevel?.addEventListener('click', () => {
      const btnSettings = document.getElementById('btn-open-settings');
      if (btnSettings) {
        btnSettings.click();
      } else if (typeof window.switchAppView === 'function') {
        window.switchAppView('flashcard');
      }
    });

    // Listen for global HSK level changes from Flashcards or Settings
    window.addEventListener('app:levels-changed', () => {
      updateActiveLevelsUI();
      generateGroups();
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'hsk_selected_levels') {
        updateActiveLevelsUI();
        generateGroups();
      }
    });

    // Group-by Pills
    dom.groupbyPills.forEach(pill => {
      pill.addEventListener('click', () => {
        dom.groupbyPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.groupBy = pill.dataset.groupby;
        state.focus = 'all'; // Reset focus
        renderFocusChips();
        generateGroups();
      });
    });

    // Max Words Slider
    dom.maxSlider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.maxPerGroup = val;
      if (dom.maxValBadge) dom.maxValBadge.textContent = val;
    });

    dom.maxSlider?.addEventListener('change', () => {
      generateGroups();
    });

    // Skip Known Words Toggle
    dom.skipKnownToggle?.addEventListener('change', (e) => {
      state.skipKnown = e.target.checked;
      generateGroups();
    });

    // Generate Button
    dom.btnGenerate?.addEventListener('click', () => {
      generateGroups();
      showToast('✨ อัปเดตกลุ่มคำศัพท์เรียบร้อยแล้ว');
    });
  }

  // 12. Public Initialization
  function initTutor() {
    cacheDom();
    updateKnownBadge();
    renderFocusChips();
    initEvents();

    // Initial generation
    generateGroups();
  }

  return {
    init: initTutor,
    generateGroups,
    buildAIPrompt,
    copyPromptToClipboard,
    openPromptModal
  };
})();

// Auto initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.HSK_TUTOR.init();
  });
} else {
  window.HSK_TUTOR.init();
}

/**
 * HSK Story Library & Interactive Reader Logic
 */

(function () {
  function getStories() {
    return window.HSK_STORIES_DATA || [];
  }

  // LocalStorage Key for Read History
  const STORAGE_KEY_READ_CHAPTERS = 'hsk_read_chapters'; // array of "storySlug/chapterSlug"

  function getReadChapters() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_READ_CHAPTERS)) || [];
    } catch (e) {
      return [];
    }
  }

  function markChapterAsRead(storySlug, chapterSlug) {
    if (!storySlug || !chapterSlug) return;
    const key = `${storySlug}/${chapterSlug}`;
    const readList = getReadChapters();
    if (!readList.includes(key)) {
      readList.push(key);
      localStorage.setItem(STORAGE_KEY_READ_CHAPTERS, JSON.stringify(readList));
    }
  }

  function isChapterRead(storySlug, chapterSlug) {
    if (!storySlug || !chapterSlug) return false;
    const readList = getReadChapters();
    return readList.includes(`${storySlug}/${chapterSlug}`);
  }

  function getStoryReadProgress(story) {
    if (!story || !story.chapters || story.chapters.length === 0) return { readCount: 0, total: 0, isCompleted: false };
    const readList = getReadChapters();
    const readCount = story.chapters.filter(ch => readList.includes(`${story.slug}/${ch.slug}`)).length;
    return {
      readCount,
      total: story.chapters.length,
      isCompleted: readCount >= story.chapters.length && story.chapters.length > 0
    };
  }

  let currentLevelFilter = 'all';
  let activeStory = null;
  let activeChapterIndex = 0;
  let showPinyin = true;
  let showTranslation = true;
  let currentSpeedIndex = 1;
  const speeds = [0.75, 1.0, 1.25, 1.5];

  // DOM Elements
  const tabFlashcard = document.getElementById('tab-flashcard');
  const tabStories = document.getElementById('tab-stories');
  const viewFlashcard = document.getElementById('view-flashcard');
  const viewStories = document.getElementById('view-stories');

  const storiesLevelBar = document.getElementById('stories-level-bar');
  const storiesGrid = document.getElementById('stories-grid');

  // Reader Elements
  const readerModal = document.getElementById('story-reader-modal');
  const btnReaderBack = document.getElementById('btn-reader-back');
  const readerHskBadge = document.getElementById('reader-hsk-badge');
  const readerChapterTitle = document.getElementById('reader-chapter-title');
  const btnTogglePinyin = document.getElementById('btn-toggle-pinyin');
  const btnToggleTrans = document.getElementById('btn-toggle-trans');
  const chapterNavRow = document.getElementById('chapter-nav-row');
  const readerContentBody = document.getElementById('reader-content-body');
  const btnPrevChap = document.getElementById('btn-reader-prev-chap');
  const btnNextChap = document.getElementById('btn-reader-next-chap');

  // Audio Bar Elements
  const audioBtnPlay = document.getElementById('audio-btn-play');
  const audioScrubber = document.getElementById('audio-scrubber');
  const audioTimeCurrent = document.getElementById('audio-time-current');
  const audioTimeDuration = document.getElementById('audio-time-duration');
  const audioSpeedBtn = document.getElementById('audio-speed-btn');

  // 1. Initialize View Tabs
  function initTabs() {
    tabFlashcard?.addEventListener('click', () => switchView('flashcard'));
    tabStories?.addEventListener('click', () => switchView('stories'));
  }

  function switchView(viewName) {
    if (viewName === 'flashcard') {
      tabFlashcard.classList.add('active');
      tabStories.classList.remove('active');
      viewFlashcard.classList.add('active');
      viewStories.classList.remove('active');
    } else {
      tabStories.classList.add('active');
      tabFlashcard.classList.remove('active');
      viewStories.classList.add('active');
      viewFlashcard.classList.remove('active');
      renderStoriesList();
    }
  }

  // 2. Stories List & Filtering
  function initFilters() {
    if (!storiesLevelBar) return;
    storiesLevelBar.addEventListener('click', (e) => {
      const chip = e.target.closest('.story-level-chip');
      if (!chip) return;
      document.querySelectorAll('.story-level-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentLevelFilter = chip.dataset.level;
      renderStoriesList();
    });
  }

  async function ensureStoriesLoaded() {
    if (window.HSK_STORIES_DATA && Array.isArray(window.HSK_STORIES_DATA) && window.HSK_STORIES_DATA.length > 0) {
      console.log('[HSKStory] Loaded stories from window.HSK_STORIES_DATA:', window.HSK_STORIES_DATA.length);
      return window.HSK_STORIES_DATA;
    }
    console.warn('[HSKStory] window.HSK_STORIES_DATA not found or empty, fetching data/stories.json...');
    try {
      const resp = await fetch('data/stories.json?t=' + Date.now());
      if (resp.ok) {
        const json = await resp.json();
        if (Array.isArray(json) && json.length > 0) {
          window.HSK_STORIES_DATA = json;
          console.log('[HSKStory] Successfully loaded stories from data/stories.json:', json.length);
          return json;
        }
      } else {
        console.error('[HSKStory] data/stories.json fetch status:', resp.status);
      }
    } catch (e) {
      console.error('[HSKStory] Failed to fetch data/stories.json fallback', e);
    }
    return [];
  }

  async function renderStoriesList() {
    if (!storiesGrid) return;
    const allStories = await ensureStoriesLoaded();
    console.log('[HSKStory] renderStoriesList: total stories =', allStories.length, 'current filter =', currentLevelFilter);

    const filtered = allStories.filter(story => {
      if (!story) return false;
      if (currentLevelFilter === 'all') return true;
      return String(story.hsk_level) === String(currentLevelFilter);
    });

    if (filtered.length === 0) {
      if (allStories.length === 0) {
        storiesGrid.innerHTML = `
          <div style="text-align:center;padding:40px 20px;color:#94a3b8;grid-column:1/-1;">
            <p style="font-size:2rem;margin-bottom:8px;">⏳</p>
            <p style="font-weight:600;font-size:1.1rem;color:#475569;">กำลังโหลดคลังนิทาน...</p>
            <p style="font-size:0.85rem;margin-top:6px;">หากไม่แสดงผล กรุณากดปุ่ม <b>Ctrl + F5</b> เพื่อรีเฟรชหน้าเว็บ</p>
            <button onclick="window.location.reload(true)" style="margin-top:12px;padding:8px 16px;background:#4f46e5;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">🔄 โหลดข้อมูลใหม่</button>
          </div>
        `;
      } else {
        storiesGrid.innerHTML = `
          <div style="text-align:center;padding:40px 20px;color:#94a3b8;grid-column:1/-1;">
            <p style="font-size:2rem;margin-bottom:8px;">📚</p>
            <p>ยังไม่มีนิทานในระดับ HSK ${currentLevelFilter}</p>
          </div>
        `;
      }
      return;
    }

    storiesGrid.innerHTML = filtered.map(story => {
      const borderColors = {
        1: '#16a34a', 2: '#0d9488', 3: '#0284c7', 4: '#ca8a04',
        5: '#ea580c', 6: '#dc2626', 7: '#db2777', 8: '#c026d3', 9: '#7c3aed'
      };
      const borderColor = borderColors[story.hsk_level] || '#4f46e5';
      const progress = getStoryReadProgress(story);

      let statusBadge = '';
      if (progress.isCompleted) {
        statusBadge = `<span class="story-badge-read">✅ อ่านจบแล้ว</span>`;
      } else if (progress.readCount > 0) {
        statusBadge = `<span class="story-badge-progress">📖 อ่านแล้ว ${progress.readCount}/${progress.total}</span>`;
      }

      return `
        <article class="story-card" data-slug="${story.slug}" style="border-left-color: ${borderColor}">
          <div class="story-card-top">
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="story-badge-level hsk-${story.hsk_level}">HSK ${story.hsk_level}</span>
              ${statusBadge}
            </div>
            <div class="story-card-meta">
              <span>🎧 มีเสียงอ่าน</span>
              <span>·</span>
              <span>${story.genre || 'Story'}</span>
            </div>
          </div>
          <h2 class="story-card-title-zh">${story.title || ''}</h2>
          <h3 class="story-card-title-en">${story.title_en || ''}</h3>
          <p class="story-card-synopsis">${story.synopsis || ''}</p>
          <div class="story-card-footer">
            <span class="story-card-chapters-count">📖 ${story.chapters ? story.chapters.length : 0} ตอน</span>
            <span class="story-card-action">อ่านเรื่องนี้ ➔</span>
          </div>
        </article>
      `;
    }).join('');

    // Attach click listeners to cards
    storiesGrid.querySelectorAll('.story-card').forEach(card => {
      card.addEventListener('click', () => {
        const slug = card.dataset.slug;
        const selected = allStories.find(s => s.slug === slug);
        if (selected) {
          openStoryReader(selected, 0);
        }
      });
    });
  }

  // 3. Reader Logic
  function openStoryReader(story, chapterIndex = 0) {
    activeStory = story;
    activeChapterIndex = chapterIndex;
    readerModal.classList.add('open');
    renderCurrentChapter();
  }

  function closeStoryReader() {
    readerModal.classList.remove('open');
    if (window.storyPlayer) {
      window.storyPlayer.stopAll();
    }
    // Re-render story list to reflect updated read statuses
    renderStoriesList();
  }

  function renderCurrentChapter() {
    if (!activeStory || !activeStory.chapters) return;
    const chapter = activeStory.chapters[activeChapterIndex];
    if (!chapter) return;

    // Mark this chapter as read
    markChapterAsRead(activeStory.slug, chapter.slug);

    // Update Header
    readerHskBadge.textContent = `HSK ${activeStory.hsk_level}`;
    readerHskBadge.className = `reader-hsk-badge story-badge-level hsk-${activeStory.hsk_level}`;
    readerChapterTitle.textContent = `${chapter.number}. ${chapter.title} (${chapter.title_en || ''})`;

    // Update Chapter Navigation Pills
    chapterNavRow.innerHTML = activeStory.chapters.map((ch, idx) => {
      const read = isChapterRead(activeStory.slug, ch.slug);
      const activeClass = idx === activeChapterIndex ? 'active' : '';
      const readClass = read ? 'read' : '';
      const checkIcon = read ? '✓ ' : '';
      return `
        <button class="chap-nav-chip ${activeClass} ${readClass}" data-idx="${idx}">
          ${checkIcon}ตอนที่ ${ch.number}: ${ch.title}
        </button>
      `;
    }).join('');

    chapterNavRow.querySelectorAll('.chap-nav-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (idx !== activeChapterIndex) {
          activeChapterIndex = idx;
          renderCurrentChapter();
        }
      });
    });

    // Load Audio Track
    if (window.storyPlayer && chapter.audio_url) {
      window.storyPlayer.loadTrack(chapter.audio_url);
    }

    // Render Story Content
    renderChapterContent(chapter);

    // Update pagination buttons
    btnPrevChap.disabled = activeChapterIndex <= 0;
    btnNextChap.disabled = activeChapterIndex >= activeStory.chapters.length - 1;
    btnPrevChap.style.opacity = activeChapterIndex <= 0 ? '0.4' : '1';
    btnNextChap.style.opacity = activeChapterIndex >= activeStory.chapters.length - 1 ? '0.4' : '1';
  }

  function renderChapterContent(chapter) {
    readerContentBody.className = `reader-content-body ${showPinyin ? '' : 'hide-pinyin'} ${showTranslation ? '' : 'hide-trans'}`;
    
    // Check if we have pre-parsed pinyin_data
    const pinyinData = chapter.pinyin_data || [];
    const translationMap = chapter.translation_data || {};
    const transEntries = Object.entries(translationMap);

    function normalizeZh(str) {
      return (str || '').replace(/[\s\u2000-\u200f\u3000"'“”‘’：:，,。！？!?、—…]+/g, '');
    }

    if (pinyinData.length > 0) {
      let html = '';
      pinyinData.forEach((paraTokens, pIdx) => {
        let paraHanzi = '';
        let paraRubyHtml = '';

        paraTokens.forEach(token => {
          const w = token.w || '';
          const p = token.p;
          paraHanzi += w;
          if (p) {
            paraRubyHtml += `<ruby>${w}<rt>${p}</rt></ruby>`;
          } else {
            paraRubyHtml += `<span>${w}</span>`;
          }
        });

        // Find matched English translations for this paragraph
        const normPara = normalizeZh(paraHanzi);
        const matchedTranslations = [];
        transEntries.forEach(([zhKey, enVal]) => {
          const normKey = normalizeZh(zhKey);
          if (normKey && normPara.includes(normKey)) {
            matchedTranslations.push(enVal);
          }
        });

        const combinedEnTrans = matchedTranslations.length > 0
          ? matchedTranslations.join(' ')
          : (translationMap[paraHanzi] || '');

        html += `
          <div class="story-para">
            <div class="story-sentence" data-sentence="${encodeURIComponent(paraHanzi)}" title="แตะเพื่อฟังการออกเสียง">
              ${paraRubyHtml}
            </div>
            ${combinedEnTrans ? `<div class="sentence-trans-block">${combinedEnTrans}</div>` : ''}
          </div>
        `;
      });
      readerContentBody.innerHTML = html;
    } else if (chapter.content_html) {
      // Direct HTML fallback
      readerContentBody.innerHTML = `<div class="story-para">${chapter.content_html}</div>`;
    } else {
      readerContentBody.innerHTML = `
        <p style="color:#94a3b8;text-align:center;padding:40px 0;">
          ไม่มีเนื้อหาสำหรับตอนนี้
        </p>
      `;
    }

    // Sentence click-to-speak
    readerContentBody.querySelectorAll('.story-sentence').forEach(el => {
      el.addEventListener('click', () => {
        const text = decodeURIComponent(el.dataset.sentence || '');
        if (text && window.storyPlayer) {
          readerContentBody.querySelectorAll('.story-sentence').forEach(s => s.classList.remove('speaking'));
          el.classList.add('speaking');
          window.storyPlayer.speakSentence(text);
          setTimeout(() => el.classList.remove('speaking'), 3500);
        }
      });
    });
  }

  // 4. Audio Controls & Events
  function initAudioControls() {
    if (!window.storyPlayer) return;

    audioBtnPlay?.addEventListener('click', () => {
      window.storyPlayer.toggle();
    });

    audioSpeedBtn?.addEventListener('click', () => {
      currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
      const speed = speeds[currentSpeedIndex];
      window.storyPlayer.setSpeed(speed);
      audioSpeedBtn.textContent = `${speed}x`;
    });

    audioScrubber?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      window.storyPlayer.seek(val);
    });

    window.storyPlayer.onTimeUpdateCallback = (current, duration) => {
      if (audioScrubber && duration > 0) {
        audioScrubber.max = duration;
        audioScrubber.value = current;
      }
      if (audioTimeCurrent) audioTimeCurrent.textContent = formatTime(current);
      if (audioTimeDuration && duration > 0) audioTimeDuration.textContent = formatTime(duration);
    };

    window.storyPlayer.onStateChangeCallback = (playing) => {
      if (audioBtnPlay) {
        audioBtnPlay.textContent = playing ? '⏸️' : '▶️';
      }
    };
  }

  function formatTime(secs) {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // 5. Reader Toggles
  function initReaderControls() {
    btnReaderBack?.addEventListener('click', closeStoryReader);

    btnTogglePinyin?.addEventListener('click', () => {
      showPinyin = !showPinyin;
      btnTogglePinyin.classList.toggle('active', showPinyin);
      readerContentBody?.classList.toggle('hide-pinyin', !showPinyin);
    });

    btnToggleTrans?.addEventListener('click', () => {
      showTranslation = !showTranslation;
      btnToggleTrans.classList.toggle('active', showTranslation);
      readerContentBody?.classList.toggle('hide-trans', !showTranslation);
    });

    btnPrevChap?.addEventListener('click', () => {
      if (activeChapterIndex > 0) {
        activeChapterIndex--;
        renderCurrentChapter();
      }
    });

    btnNextChap?.addEventListener('click', () => {
      if (activeStory && activeChapterIndex < activeStory.chapters.length - 1) {
        activeChapterIndex++;
        renderCurrentChapter();
      }
    });
  }

  function init() {
    initTabs();
    initFilters();
    initAudioControls();
    initReaderControls();
    renderStoriesList();
  }

  // Initialize on DOM Ready or immediately if document is already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

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
  const speeds = [0.75, 1.0, 1.25, 1.5];
  let showPinyin = window.AppSettings ? window.AppSettings.get('story_pinyin', true) : true;
  let showTranslation = window.AppSettings ? window.AppSettings.get('story_trans', false) : false;
  const initialSpeed = window.AppSettings ? window.AppSettings.get('story_playback_speed', 1.0) : 1.0;
  let currentSpeedIndex = speeds.indexOf(initialSpeed) >= 0 ? speeds.indexOf(initialSpeed) : 1;

  // DOM Elements
  const tabFlashcard = document.getElementById('tab-flashcard');
  const tabStories = document.getElementById('tab-stories');
  const tabPractice = document.getElementById('tab-practice');
  const viewFlashcard = document.getElementById('view-flashcard');
  const viewStories = document.getElementById('view-stories');
  const viewPractice = document.getElementById('view-practice');

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
    tabPractice?.addEventListener('click', () => switchView('practice'));
  }

  const VIEW_TITLES = {
    flashcard: '🀄 Flashcards',
    stories: '📖 HSK Stories',
    practice: '✍️ ฝึกคัดอักษรจีน'
  };

  function switchView(viewName) {
    if (tabFlashcard) tabFlashcard.classList.toggle('active', viewName === 'flashcard');
    if (tabStories) tabStories.classList.toggle('active', viewName === 'stories');
    if (tabPractice) tabPractice.classList.toggle('active', viewName === 'practice');

    if (viewFlashcard) viewFlashcard.classList.toggle('active', viewName === 'flashcard');
    if (viewStories) viewStories.classList.toggle('active', viewName === 'stories');
    if (viewPractice) viewPractice.classList.toggle('active', viewName === 'practice');

    // Update top header title dynamically
    const brandTitleEl = document.getElementById('app-brand-title');
    if (brandTitleEl && VIEW_TITLES[viewName]) {
      brandTitleEl.textContent = VIEW_TITLES[viewName];
    }

    if (viewName === 'stories') {
      renderStoriesList();
    }
  }

  window.switchAppView = switchView;

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

    // List of parsed sentences and words for current chapter to track word-by-word audio synchronization
    let currentChapterSentences = []; // [{ el, text, charCount, startTime, endTime, words: [{ el, text, charCount, startTime, endTime }] }]
    let allWordTokens = []; // Flat list of all word tokens with timing: [{ el, text, startTime, endTime }]
    let activeHighlightedWordEl = null;

    function setHighlightedWord(wordEl) {
      if (activeHighlightedWordEl === wordEl) return;
      if (activeHighlightedWordEl) {
        activeHighlightedWordEl.classList.remove('reading-word-active');
      }
      activeHighlightedWordEl = wordEl;
      if (activeHighlightedWordEl) {
        activeHighlightedWordEl.classList.add('reading-word-active');
        activeHighlightedWordEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function clearAllWordHighlights() {
      if (activeHighlightedWordEl) {
        activeHighlightedWordEl.classList.remove('reading-word-active');
        activeHighlightedWordEl = null;
      }
      readerContentBody.querySelectorAll('.reading-word-active').forEach(el => {
        el.classList.remove('reading-word-active');
      });
    }

    function updateAudioSentenceHighlight(currentTime) {
      if (!allWordTokens || allWordTokens.length === 0) return;
      
      let matchedWord = null;
      for (let i = 0; i < allWordTokens.length; i++) {
        const w = allWordTokens[i];
        if (currentTime >= w.startTime && currentTime < w.endTime) {
          matchedWord = w.el;
          break;
        }
      }

      setHighlightedWord(matchedWord);
    }

    function clearAudioSentenceHighlights() {
      clearAllWordHighlights();
    }

    if (pinyinData.length > 0) {
      let html = '';
      let globalSentenceIdx = 0;

      pinyinData.forEach((paraTokens, pIdx) => {
        // Group tokens into individual sentences by punctuation
        const paraSentences = [];
        let currTokens = [];

        paraTokens.forEach(tok => {
          currTokens.push(tok);
          const w = tok.w || '';
          if (/[。！？!?]/.test(w)) {
            paraSentences.push(currTokens);
            currTokens = [];
          } else if (currTokens.length === 1 && /^[”’"']$/.test(w) && paraSentences.length > 0) {
            paraSentences[paraSentences.length - 1].push(tok);
            currTokens = [];
          }
        });
        if (currTokens.length > 0) {
          paraSentences.push(currTokens);
        }

        let paraSentencesHtml = '';
        const paraMatchedTranslations = [];

        paraSentences.forEach(sentTokens => {
          let sentHanzi = '';
          let sentRubyHtml = '';
          let sentWordOffset = 0;

          sentTokens.forEach((token, tIdx) => {
            const w = token.w || '';
            const p = token.p;
            const startChar = sentWordOffset;
            const endChar = sentWordOffset + w.length;
            sentWordOffset = endChar;
            sentHanzi += w;

            if (p) {
              sentRubyHtml += `<ruby class="story-word-token" data-token-idx="${tIdx}" data-start="${startChar}" data-end="${endChar}">${w}<rt>${p}</rt></ruby>`;
            } else {
              sentRubyHtml += `<span class="story-word-token" data-token-idx="${tIdx}" data-start="${startChar}" data-end="${endChar}">${w}</span>`;
            }
          });

          // Match translation for this sentence
          const normSent = normalizeZh(sentHanzi);
          let matchedEn = '';
          for (const [zhKey, enVal] of transEntries) {
            const normKey = normalizeZh(zhKey);
            if (normKey && (normKey === normSent || normSent.includes(normKey) || normKey.includes(normSent))) {
              matchedEn = enVal;
              break;
            }
          }

          if (matchedEn) {
            paraMatchedTranslations.push(matchedEn);
          }

          paraSentencesHtml += `
            <span class="story-sentence" data-sent-idx="${globalSentenceIdx++}" data-sentence="${encodeURIComponent(sentHanzi)}" title="แตะเพื่อฟังการออกเสียง">
              ${sentRubyHtml}
            </span>
          `;
        });

        const combinedEnTrans = paraMatchedTranslations.length > 0
          ? paraMatchedTranslations.join(' ')
          : '';

        html += `
          <div class="story-para">
            ${paraSentencesHtml}
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

    // Build sentence and word timings, and interactive speech synthesis listeners
    currentChapterSentences = [];
    allWordTokens = [];
    const sentenceEls = readerContentBody.querySelectorAll('.story-sentence');
    let totalChars = 0;

    sentenceEls.forEach((el, idx) => {
      const text = decodeURIComponent(el.dataset.sentence || '').trim();
      const cleanChars = text.replace(/[\s\u2000-\u200f\u3000"'“”‘’：:，,。！？!?、—…]+/g, '');
      const count = Math.max(cleanChars.length, 1);
      totalChars += count;

      // Extract all word tokens within this sentence
      const tokenEls = el.querySelectorAll('.story-word-token');
      const words = [];
      let sentCleanCharCount = 0;

      tokenEls.forEach(tokenEl => {
        // Extract plain text from token (excluding ruby rt text)
        let tokenText = '';
        if (tokenEl.tagName.toLowerCase() === 'ruby') {
          tokenEl.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              tokenText += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() !== 'rt') {
              tokenText += node.textContent;
            }
          });
        } else {
          tokenText = tokenEl.textContent || '';
        }

        const cleanTokenChars = tokenText.replace(/[\s\u2000-\u200f\u3000"'“”‘’：:，,。！？!?、—…]+/g, '');
        const wordCharCount = Math.max(cleanTokenChars.length, tokenText.length > 0 ? 1 : 0);
        sentCleanCharCount += wordCharCount;

        const wordObj = {
          el: tokenEl,
          text: tokenText,
          charCount: wordCharCount,
          startTime: 0,
          endTime: 0
        };
        words.push(wordObj);
      });

      // If no tokens found, create a fallback single token pointing to el
      if (words.length === 0) {
        words.push({
          el: el,
          text: text,
          charCount: count,
          startTime: 0,
          endTime: 0
        });
      }

      currentChapterSentences.push({
        el,
        text,
        charCount: count,
        startTime: 0,
        endTime: 0,
        words
      });
    });

    // Helper to calculate estimated audio timings per sentence and per word token once audio duration is available
    function recalculateAudioTimings(duration) {
      if (!duration || duration <= 0 || totalChars <= 0) return;
      let runningTime = 0;
      allWordTokens = [];

      currentChapterSentences.forEach(sent => {
        const sentDuration = (sent.charCount / totalChars) * duration;
        sent.startTime = runningTime;
        sent.endTime = runningTime + sentDuration;

        // Subdivide sentence duration among its words proportionally
        const sentWords = sent.words;
        const sentWordsTotalChars = sentWords.reduce((sum, w) => sum + (w.charCount || 1), 0);
        let wordRunningTime = sent.startTime;

        sentWords.forEach((word, wIdx) => {
          const wordWeight = (word.charCount || 1) / (sentWordsTotalChars || 1);
          const wordDuration = wIdx === sentWords.length - 1 
            ? (sent.endTime - wordRunningTime) // avoid floating point rounding gap
            : sentDuration * wordWeight;

          word.startTime = wordRunningTime;
          word.endTime = wordRunningTime + wordDuration;
          wordRunningTime += wordDuration;

          allWordTokens.push(word);
        });

        runningTime += sentDuration;
      });
    }

    // Helper to shift audio playback or TTS to read starting from a specific word
    function playFromWord(wordEl, sentIdx) {
      closeWordSheet();
      const audio = window.storyPlayer?.audio;
      const duration = (audio && audio.duration && !isNaN(audio.duration)) ? audio.duration : 0;
      if (duration > 0 && recalculateAudioTimings) {
        recalculateAudioTimings(duration);
      }

      // Find timing for this word token
      let targetStartTime = -1;
      if (allWordTokens && allWordTokens.length > 0) {
        const found = allWordTokens.find(w => w.el === wordEl);
        if (found) targetStartTime = found.startTime;
      }

      const sentData = currentChapterSentences[sentIdx];
      if (targetStartTime < 0 && sentData) {
        targetStartTime = sentData.startTime;
      }

      if (chapter.audio_url && duration > 0 && targetStartTime >= 0) {
        window.storyPlayer.stopSpeech();
        window.storyPlayer.seek(targetStartTime);
        window.storyPlayer.play();
        updateAudioSentenceHighlight(targetStartTime);
        return;
      }

      if (chapter.audio_url && targetStartTime >= 0) {
        window.storyPlayer.stopSpeech();
        const audioEl = window.storyPlayer.audio;
        const onMeta = () => {
          if (audioEl.duration && recalculateAudioTimings) {
            recalculateAudioTimings(audioEl.duration);
            window.storyPlayer.seek(targetStartTime);
            updateAudioSentenceHighlight(targetStartTime);
          }
        };
        audioEl.addEventListener('loadedmetadata', onMeta, { once: true });
        window.storyPlayer.play();
        return;
      }

      // Fallback to TTS reading from this sentence
      playSentenceAt(sentIdx);
    }

    // Attach Click on Sentence: Seek audio player to this sentence time and play
    function playSentenceAt(sentIdx) {
      closeWordSheet();
      const sentEl = sentenceEls[sentIdx];
      if (!sentEl) return;
      const text = decodeURIComponent(sentEl.dataset.sentence || '');
      if (!text || !window.storyPlayer) return;

      const audio = window.storyPlayer.audio;
      const duration = (audio && audio.duration && !isNaN(audio.duration)) ? audio.duration : 0;
      if (duration > 0 && recalculateAudioTimings) {
        recalculateAudioTimings(duration);
      }

      const sentData = currentChapterSentences[sentIdx];

      // If audio track is available and duration is known
      if (chapter.audio_url && duration > 0 && sentData) {
        window.storyPlayer.stopSpeech();
        window.storyPlayer.seek(sentData.startTime);
        window.storyPlayer.play();
        updateAudioSentenceHighlight(sentData.startTime);
        return;
      }

      // If audio track is available but metadata/duration is still loading:
      if (chapter.audio_url && sentData) {
        window.storyPlayer.stopSpeech();
        const audioEl = window.storyPlayer.audio;
        const onMeta = () => {
          if (audioEl.duration && recalculateAudioTimings) {
            recalculateAudioTimings(audioEl.duration);
            const updatedSent = currentChapterSentences[sentIdx];
            if (updatedSent) {
              window.storyPlayer.seek(updatedSent.startTime);
              updateAudioSentenceHighlight(updatedSent.startTime);
            }
          }
        };
        audioEl.addEventListener('loadedmetadata', onMeta, { once: true });
        window.storyPlayer.play();
        return;
      }

      // Fallback to SpeechSynthesis (TTS) only if chapter has no audio track
      if (window.storyPlayer.isPlaying) {
        window.storyPlayer.pause();
      }

      clearAllWordHighlights();
      const tokenEls = sentEl.querySelectorAll('.story-word-token');
      if (tokenEls.length > 0) {
        setHighlightedWord(tokenEls[0]);
      }

      window.storyPlayer.speakSentence(
        text,
        /* onStart */ () => {
          if (tokenEls.length > 0) setHighlightedWord(tokenEls[0]);
        },
        /* onEnd */ () => {
          clearAllWordHighlights();
        },
        /* onBoundary */ (event) => {
          if (event.name === 'word' || event.name === 'sentence') {
            const charIdx = event.charIndex;
            let matchedToken = null;
            for (let i = 0; i < tokenEls.length; i++) {
              const tok = tokenEls[i];
              const start = parseInt(tok.dataset.start, 10);
              const end = parseInt(tok.dataset.end, 10);
              if (!isNaN(start) && !isNaN(end) && charIdx >= start && charIdx < end) {
                matchedToken = tok;
                break;
              }
            }
            if (matchedToken) {
              setHighlightedWord(matchedToken);
            }
          }
        }
      );
    }

    // Sentence Container: 1 click translates sentence, double-click shifts audio reading to this sentence
    sentenceEls.forEach((el, sentIdx) => {
      let sentClickTimer = null;
      let sentLastClickTime = 0;

      el.addEventListener('click', (e) => {
        // If clicked on an individual word token, let the word token handler handle it
        if (e.target.closest('.story-word-token')) return;

        const now = Date.now();
        if (now - sentLastClickTime < 280) {
          // Double click: Shift audio reading to this sentence
          clearTimeout(sentClickTimer);
          sentClickTimer = null;
          sentLastClickTime = 0;
          playSentenceAt(sentIdx);
        } else {
          sentLastClickTime = now;
          clearTimeout(sentClickTimer);
          sentClickTimer = setTimeout(() => {
            // Single click: Show sentence translation in translation sheet
            const text = decodeURIComponent(el.dataset.sentence || '').trim();
            const parentPara = el.closest('.story-para');
            let trans = '';
            if (parentPara) {
              const transEl = parentPara.querySelector('.sentence-trans-block');
              if (transEl) trans = transEl.textContent.trim();
            }
            openWordSheet(text, '', trans);
            sentClickTimer = null;
          }, 260);
        }
      });
    });

    // Translation block: 1 click toggles/shows translation, double click shifts audio to read that sentence
    readerContentBody.querySelectorAll('.sentence-trans-block').forEach(transEl => {
      let transClickTimer = null;
      let transLastClickTime = 0;

      transEl.addEventListener('click', () => {
        const now = Date.now();
        const parentPara = transEl.closest('.story-para');
        const firstSent = parentPara?.querySelector('.story-sentence');
        const sIdx = firstSent ? parseInt(firstSent.dataset.sentIdx, 10) : -1;

        if (now - transLastClickTime < 280) {
          // Double click: Shift audio reading to this sentence
          clearTimeout(transClickTimer);
          transClickTimer = null;
          transLastClickTime = 0;
          if (sIdx >= 0) playSentenceAt(sIdx);
        } else {
          transLastClickTime = now;
          clearTimeout(transClickTimer);
          transClickTimer = setTimeout(() => {
            // Single click: Highlight/focus the sentence without shifting playback
            if (firstSent) {
              firstSent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            transClickTimer = null;
          }, 260);
        }
      });
    });

    // =========================================================
    // Word Translation Sheet Controller (HSKStory style)
    // =========================================================
    const wordSheet = document.getElementById('story-word-sheet');
    const sheetHanzi = document.getElementById('sheet-hanzi');
    const sheetHskBadge = document.getElementById('sheet-hsk-badge');
    const sheetPinyin = document.getElementById('sheet-pinyin');
    const sheetDefinitions = document.getElementById('sheet-definitions');
    const sheetBtnSpeak = document.getElementById('sheet-btn-speak');
    const sheetBtnPractice = document.getElementById('sheet-btn-practice');
    const sheetBtnClose = document.getElementById('sheet-btn-close');
    const sheetBtnTransSent = document.getElementById('sheet-btn-trans-sent');
    const sheetTransChevron = document.getElementById('sheet-trans-chevron');
    const sheetSentenceContent = document.getElementById('sheet-sentence-content');

    let currentSheetWord = '';
    let currentSheetSentTrans = '';

    function closeWordSheet() {
      if (wordSheet) {
        wordSheet.classList.remove('show');
      }
    }

    sheetBtnClose?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeWordSheet();
    });

    sheetBtnSpeak?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentSheetWord && window.storyPlayer) {
        window.storyPlayer.speakSentence(currentSheetWord);
      }
    });

    sheetBtnPractice?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeWordSheet();
      closeStoryReader();
      if (window.PracticeManager && currentSheetWord) {
        window.PracticeManager.jumpToPractice(currentSheetWord);
      }
    });

    sheetBtnTransSent?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!sheetSentenceContent) return;
      const isShowing = sheetSentenceContent.classList.toggle('show');
      sheetBtnTransSent.classList.toggle('expanded', isShowing);
    });

    // Lookup word data in HSK_DATA
    function lookupWordInfo(hanzi, fallbackPinyin = '') {
      let found = null;
      if (typeof HSK_DATA !== 'undefined' && Array.isArray(HSK_DATA)) {
        found = HSK_DATA.find(item => item.hanzi === hanzi);
        if (!found) {
          // If 1-character, check if it's part of a known word
          found = HSK_DATA.find(item => item.hanzi.startsWith(hanzi) || item.hanzi.endsWith(hanzi));
        }
      }

      if (found) {
        return {
          hanzi: hanzi,
          pinyin: found.pinyin || fallbackPinyin,
          level: found.level || 'HSK 1',
          meaning_en: found.meaning_en || '',
          meaning_th: found.meaning || ''
        };
      }

      return {
        hanzi: hanzi,
        pinyin: fallbackPinyin,
        level: 'HSK',
        meaning_en: '',
        meaning_th: ''
      };
    }

    function openWordSheet(wordText, pinyin, sentenceTrans) {
      if (!wordSheet) return;
      currentSheetWord = wordText;
      currentSheetSentTrans = sentenceTrans;

      const info = lookupWordInfo(wordText, pinyin);

      if (sheetHanzi) sheetHanzi.textContent = info.hanzi;
      if (sheetHskBadge) sheetHskBadge.textContent = info.level;
      if (sheetPinyin) sheetPinyin.textContent = info.pinyin;

      // Build definitions list
      let defsHtml = '';
      const defItems = [];
      if (info.meaning_en) {
        // Split meanings by semicolon
        info.meaning_en.split(';').forEach(s => {
          const t = s.trim();
          if (t) defItems.push(t);
        });
      }
      if (info.meaning_th) {
        info.meaning_th.split('/').forEach(s => {
          const t = s.trim();
          if (t && !defItems.includes(t)) defItems.push(t);
        });
      }

      if (defItems.length === 0) {
        defsHtml = '<div class="sheet-def-item"><span>แตะเพื่อแปลคำศัพท์</span></div>';
      } else {
        defItems.forEach((d, i) => {
          defsHtml += `
            <div class="sheet-def-item">
              <span class="sheet-def-num">${i + 1}.</span>
              <span>${d}</span>
            </div>
          `;
        });
      }
      if (sheetDefinitions) sheetDefinitions.innerHTML = defsHtml;

      // Sentence translation block
      if (sheetSentenceContent) {
        sheetSentenceContent.textContent = sentenceTrans || 'ไม่มีคำแปลประโยค';
        sheetSentenceContent.classList.remove('show');
      }
      if (sheetBtnTransSent) {
        sheetBtnTransSent.classList.remove('expanded');
      }

      wordSheet.classList.add('show');
    }

    // Attach click listeners on all word tokens inside readerContentBody:
    // 1 click = translate word in bottom sheet
    // 2 clicks (double click/tap) = shift audio/TTS to read from this word
    readerContentBody.querySelectorAll('.story-word-token').forEach(tokenEl => {
      let wordClickTimer = null;
      let wordLastClickTime = 0;

      const handleWordAction = (isDouble) => {
        const parentSent = tokenEl.closest('.story-sentence');
        const sIdx = parentSent ? parseInt(parentSent.dataset.sentIdx, 10) : 0;

        if (isDouble) {
          // Double click: Shift audio playback or TTS to read from this word
          playFromWord(tokenEl, !isNaN(sIdx) ? sIdx : 0);
          return;
        }

        // Single click: Translate word in bottom sheet
        // Get plain text of token (excluding <rt>)
        let wText = '';
        if (tokenEl.tagName.toLowerCase() === 'ruby') {
          tokenEl.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              wText += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() !== 'rt') {
              wText += node.textContent;
            }
          });
        } else {
          wText = tokenEl.textContent || '';
        }

        wText = wText.trim();
        if (!wText || /^[\s\u2000-\u200f\u3000"'“”‘’：:，,。！？!?、—…]+$/.test(wText)) return;

        // Get Pinyin from <rt> if available
        const rtEl = tokenEl.querySelector('rt');
        const pinyin = rtEl ? rtEl.textContent.trim() : '';

        // Find parent sentence translation
        let sentenceTrans = '';
        if (parentSent) {
          const parentPara = parentSent.closest('.story-para');
          if (parentPara) {
            const transBlock = parentPara.querySelector('.sentence-trans-block');
            if (transBlock) sentenceTrans = transBlock.textContent.trim();
          }
        }

        openWordSheet(wText, pinyin, sentenceTrans);
      };

      tokenEl.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent sentence container event

        const now = Date.now();
        if (now - wordLastClickTime < 280) {
          // Double click detected!
          clearTimeout(wordClickTimer);
          wordClickTimer = null;
          wordLastClickTime = 0;
          handleWordAction(/* isDouble */ true);
        } else {
          wordLastClickTime = now;
          clearTimeout(wordClickTimer);
          wordClickTimer = setTimeout(() => {
            handleWordAction(/* isDouble */ false);
            wordClickTimer = null;
          }, 260);
        }
      });

      // Also listen to dblclick event directly as desktop native fallback
      tokenEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        clearTimeout(wordClickTimer);
        wordClickTimer = null;
        wordLastClickTime = 0;
        handleWordAction(/* isDouble */ true);
      });
    });

    // Dismiss bottom sheet on tapping reader content outside
    readerContentBody.addEventListener('click', () => {
      closeWordSheet();
    });

    // Expose update functions for audio player timeupdate
    window.__updateStorySentenceHighlight = updateAudioSentenceHighlight;
    window.__recalcStoryAudioTimings = recalculateAudioTimings;
    window.__clearStoryAudioHighlight = clearAudioSentenceHighlights;
  }

  // 4. Audio Controls & Events
  function initAudioControls() {
    if (!window.storyPlayer) return;

    audioBtnPlay?.addEventListener('click', () => {
      window.storyPlayer.toggle();
    });

    // Set initial speed
    const initialPlaybackRate = speeds[currentSpeedIndex];
    window.storyPlayer.setSpeed(initialPlaybackRate);
    if (audioSpeedBtn) {
      audioSpeedBtn.textContent = `${initialPlaybackRate}x`;
    }

    audioSpeedBtn?.addEventListener('click', () => {
      currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
      const speed = speeds[currentSpeedIndex];
      window.storyPlayer.setSpeed(speed);
      audioSpeedBtn.textContent = `${speed}x`;
      if (window.AppSettings) {
        window.AppSettings.set('story_playback_speed', speed);
      }
    });

    audioScrubber?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      window.storyPlayer.seek(val);
      if (window.__updateStorySentenceHighlight) {
        window.__updateStorySentenceHighlight(val);
      }
    });

    window.storyPlayer.onTimeUpdateCallback = (current, duration) => {
      if (audioScrubber && duration > 0) {
        audioScrubber.max = duration;
        audioScrubber.value = current;
      }
      if (audioTimeCurrent) audioTimeCurrent.textContent = formatTime(current);
      if (audioTimeDuration && duration > 0) audioTimeDuration.textContent = formatTime(duration);

      // Recalculate audio sentence timings and highlight currently read sentence
      if (duration > 0 && window.__recalcStoryAudioTimings) {
        window.__recalcStoryAudioTimings(duration);
      }
      if (window.__updateStorySentenceHighlight) {
        window.__updateStorySentenceHighlight(current);
      }
    };

    window.storyPlayer.onStateChangeCallback = (playing) => {
      if (audioBtnPlay) {
        audioBtnPlay.textContent = playing ? '⏸️' : '▶️';
      }
      if (!playing && window.__clearStoryAudioHighlight) {
        // If stopped or paused at end
        if (window.storyPlayer.audio && window.storyPlayer.audio.ended) {
          window.__clearStoryAudioHighlight();
        }
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

    // Sync button states with initial settings
    if (btnTogglePinyin) btnTogglePinyin.classList.toggle('active', showPinyin);
    if (btnToggleTrans) btnToggleTrans.classList.toggle('active', showTranslation);

    btnTogglePinyin?.addEventListener('click', () => {
      showPinyin = !showPinyin;
      btnTogglePinyin.classList.toggle('active', showPinyin);
      readerContentBody?.classList.toggle('hide-pinyin', !showPinyin);
      if (window.AppSettings) {
        window.AppSettings.set('story_pinyin', showPinyin);
      }
    });

    btnToggleTrans?.addEventListener('click', () => {
      showTranslation = !showTranslation;
      btnToggleTrans.classList.toggle('active', showTranslation);
      readerContentBody?.classList.toggle('hide-trans', !showTranslation);
      if (window.AppSettings) {
        window.AppSettings.set('story_trans', showTranslation);
      }
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

    // Listen to unified AppSettings events (e.g. changed via Settings modal)
    window.addEventListener('app:setting-changed', (e) => {
      const { key, value } = e.detail || {};
      if (key === 'story_pinyin') {
        showPinyin = value;
        btnTogglePinyin?.classList.toggle('active', showPinyin);
        readerContentBody?.classList.toggle('hide-pinyin', !showPinyin);
      } else if (key === 'story_trans') {
        showTranslation = value;
        btnToggleTrans?.classList.toggle('active', showTranslation);
        readerContentBody?.classList.toggle('hide-trans', !showTranslation);
      } else if (key === 'story_playback_speed') {
        const speed = parseFloat(value);
        if (!isNaN(speed)) {
          currentSpeedIndex = speeds.indexOf(speed) >= 0 ? speeds.indexOf(speed) : 1;
          window.storyPlayer?.setSpeed(speed);
          if (audioSpeedBtn) audioSpeedBtn.textContent = `${speed}x`;
        }
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

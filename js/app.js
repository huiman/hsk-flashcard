/**
     * 2. การจัดการ State และ LocalStorage
     */
    const STORAGE_KEYS = {
      KNOWN_IDS: "hsk_known_ids",
      SCORE: "hsk_score",
      AUTOPLAY: "hsk_autoplay",
      LOOP: "hsk_loop",
      LEVELS: "hsk_selected_levels"
    };

    const ALL_LEVELS = ["HSK 1", "HSK 2", "HSK 3", "HSK 4"];

    let knownIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.KNOWN_IDS)) || [];
    let score = parseInt(localStorage.getItem(STORAGE_KEYS.SCORE), 10) || 0;
    let isAutoplay = localStorage.getItem(STORAGE_KEYS.AUTOPLAY) === "true";
    let isAudioLoop = localStorage.getItem(STORAGE_KEYS.LOOP) !== null 
      ? localStorage.getItem(STORAGE_KEYS.LOOP) === "true" 
      : true;
    let selectedLevels = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEVELS)) || ["HSK 1", "HSK 2"];
    
    let currentCard = null;
    let historyCards = [];
    let historyIndex = -1;
    let loopTimeout = null;
    let strokeLoopTimeout = null;

    const cardEl = document.getElementById("flashcard");
    const hanziWriterContainer = document.getElementById("hanzi-writer-container");
    const pinyinEl = document.getElementById("card-pinyin");
    const meaningEl = document.getElementById("card-meaning");
    const meaningEnEl = document.getElementById("card-meaning-en");
    const levelEl = document.getElementById("card-level");

    const knownCountEl = document.getElementById("known-count");
    const remainingCountEl = document.getElementById("remaining-count");
    const scoreCountEl = document.getElementById("score-count");

    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    const btnKnow = document.getElementById("btn-know");
    const btnReset = document.getElementById("btn-reset");
    const btnAudioFront = document.getElementById("btn-audio-front");
    const btnAudioBack = document.getElementById("btn-audio-back");
    const btnStrokeReplay = document.getElementById("btn-stroke-replay");
    const toggleAutoplay = document.getElementById("toggle-autoplay");
    const toggleLoop = document.getElementById("toggle-loop");
    const levelChips = document.querySelectorAll(".level-chip");

    // สร้าง Toast แจ้งเตือนเมื่อจำได้แล้ว
    const toastEl = document.createElement("div");
    toastEl.className = "known-toast";
    toastEl.innerHTML = "<span>✅</span><span>จำได้แล้ว +10</span>";
    document.querySelector(".card-scene").appendChild(toastEl);

    function showKnownToast() {
      toastEl.classList.add("show");
      setTimeout(() => {
        toastEl.classList.remove("show");
      }, 750);
    }

    let currentWriters = [];

    toggleAutoplay.checked = isAutoplay;
    if (toggleLoop) toggleLoop.checked = isAudioLoop;

    levelChips.forEach(chip => {
      chip.classList.toggle("active", selectedLevels.includes(chip.dataset.level));
    });

    /**
     * 3. Logic ฟังก์ชัน
     */
    function saveState() {
      localStorage.setItem(STORAGE_KEYS.KNOWN_IDS, JSON.stringify(knownIds));
      localStorage.setItem(STORAGE_KEYS.SCORE, score.toString());
      localStorage.setItem(STORAGE_KEYS.AUTOPLAY, isAutoplay.toString());
      localStorage.setItem(STORAGE_KEYS.LOOP, isAudioLoop.toString());
      localStorage.setItem(STORAGE_KEYS.LEVELS, JSON.stringify(selectedLevels));
    }

    function getFilteredData() {
      return HSK_DATA.filter(item => selectedLevels.includes(item.level));
    }

    function updateStats() {
      const filtered = getFilteredData();
      const knownInFiltered = knownIds.filter(id => filtered.some(item => item.id === id));
      const remaining = filtered.length - knownInFiltered.length;
      knownCountEl.textContent = knownInFiltered.length;
      remainingCountEl.textContent = remaining;
      scoreCountEl.textContent = score;
      if (btnPrev) {
        btnPrev.disabled = historyIndex <= 0;
      }
    }

    let activeUtterance = null;
    let chineseVoice = null;

    function initVoices() {
      if (!('speechSynthesis' in window)) return;
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;
      // หาเสียงภาษาจีน zh-CN หรือขึ้นต้นด้วย zh
      chineseVoice = voices.find(v => v.lang === 'zh-CN' || v.lang === 'zh_CN') 
        || voices.find(v => v.lang.startsWith('zh'))
        || null;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = initVoices;
      initVoices();
    }

    function stopAudio() {
      if (loopTimeout) {
        clearTimeout(loopTimeout);
        loopTimeout = null;
      }
      if ('speechSynthesis' in window) {
        if (activeUtterance) {
          activeUtterance.onend = null;
          activeUtterance.onerror = null;
          activeUtterance = null;
        }
        window.speechSynthesis.cancel();
      }
    }

    // ตารางคำอ่านพิเศษสำหรับตัวอักษรหลายเสียง (Polyphone) เมื่ออ่านคำเดี่ยวๆ
    const PRONUNCIATION_OVERRIDES = {
      "了": "勒" // เอนจิน TTS จีนจะอ่าน "勒" ว่า "le" (เลอ) อย่างถูกต้องตรงตามพินอิน HSK 1
    };

    function playAudio(text, loop = isAudioLoop) {
      if (!('speechSynthesis' in window)) return;
      stopAudio();

      if (!chineseVoice) {
        initVoices();
      }

      // ดึงคำอ่าน override หากเป็นอักษรหลายเสียง หรือใช้ข้อความเดิม
      const spokenText = PRONUNCIATION_OVERRIDES[text] || text;
      const utterance = new SpeechSynthesisUtterance(spokenText);
      activeUtterance = utterance;
      utterance.lang = "zh-CN";
      if (chineseVoice) {
        utterance.voice = chineseVoice;
      }
      utterance.rate = 0.85;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        activeUtterance = null;
        if (loop && isAudioLoop && currentCard && currentCard.hanzi === text) {
          loopTimeout = setTimeout(() => {
            playAudio(text, true);
          }, 1200);
        }
      };

      utterance.onerror = (e) => {
        console.warn("SpeechSynthesis error:", e);
        activeUtterance = null;
        // หาก error ไม่ใช่การถูก cancel แล้ว loop ยังเปิดอยู่ ให้ลองใหม่
        if (loop && isAudioLoop && e.error !== 'canceled' && e.error !== 'interrupted' && currentCard && currentCard.hanzi === text) {
          loopTimeout = setTimeout(() => {
            playAudio(text, true);
          }, 1500);
        }
      };

      // ในบางบราวเซอร์ speechSynthesis อาจค้าง state paused
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.speak(utterance);
    }

    function getRandomCard() {
      const availablePool = getFilteredData().filter(item => !knownIds.includes(item.id));
      if (availablePool.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * availablePool.length);
      return availablePool[randomIndex];
    }

    /**
     * วาดลำดับขีดอักษรจีนด้วย HanziWriter
     */
    function loadStrokeOrder(hanzi) {
      stopStrokeOrderLoop();
      hanziWriterContainer.innerHTML = "";
      currentWriters = [];

      if (!('HanziWriter' in window)) {
        const fallback = document.createElement("div");
        fallback.className = "hanzi-text";
        fallback.textContent = hanzi;
        hanziWriterContainer.appendChild(fallback);
        return;
      }

      const chars = Array.from(hanzi);
      const size = chars.length <= 1 ? 200 : chars.length === 2 ? 140 : 100;

      chars.forEach(char => {
        const target = document.createElement("div");
        target.style.width = size + "px";
        target.style.height = size + "px";
        hanziWriterContainer.appendChild(target);

        const writer = HanziWriter.create(target, char, {
          width: size,
          height: size,
          padding: 5,
          showOutline: true,
          strokeAnimationSpeed: 1,
          delayBetweenStrokes: 180,
          strokeColor: "#111827",
          radicalColor: "#4f46e5",
          outlineColor: "#e5e7eb"
        });

        currentWriters.push(writer);
      });
    }

    function stopStrokeOrderLoop() {
      if (strokeLoopTimeout) {
        clearTimeout(strokeLoopTimeout);
        strokeLoopTimeout = null;
      }
    }

    /**
     * เล่นแอนิเมชันลำดับขีดของแต่ละตัวอักษรทีละตัวตามลำดับ และวนซ้ำต่อเนื่อง (Loop)
     */
    function playStrokeOrderSequential(index = 0, currentHanzi = (currentCard ? currentCard.hanzi : null)) {
      if (!currentCard || currentCard.hanzi !== currentHanzi) return;

      if (index >= currentWriters.length) {
        // เมื่อวาดจบครบทุกตัว ให้พัก 1.5 วินาที แล้วล้างตัวอักษรและเริ่มวนซ้ำใหม่ (Stroke Loop)
        stopStrokeOrderLoop();
        strokeLoopTimeout = setTimeout(() => {
          if (!currentCard || currentCard.hanzi !== currentHanzi) return;
          // ซ่อนขีดเพื่อเริ่มวาดใหม่
          currentWriters.forEach(w => w.hideCharacter());
          playStrokeOrderSequential(0, currentHanzi);
        }, 1500);
        return;
      }

      currentWriters[index].animateCharacter({
        onComplete: () => {
          if (currentCard && currentCard.hanzi === currentHanzi) {
            playStrokeOrderSequential(index + 1, currentHanzi);
          }
        }
      });
    }

    /**
     * แสดงผลการ์ดคำศัพท์
     * @param {Object|null} targetCard - หากระบุจะแสดงการ์ดนั้น (เช่น ย้อนกลับ) หากไม่ระบุจะสุ่มคำใหม่
     */
    function renderCard(targetCard = null) {
      stopAudio();
      stopStrokeOrderLoop();
      cardEl.classList.remove("is-flipped");

      setTimeout(() => {
        if (targetCard) {
          currentCard = targetCard;
        } else {
          if (historyIndex < historyCards.length - 1) {
            historyIndex++;
            currentCard = historyCards[historyIndex];
          } else {
            currentCard = getRandomCard();
            if (currentCard) {
              historyCards.push(currentCard);
              historyIndex = historyCards.length - 1;
            }
          }
        }

        if (!currentCard) {
          hanziWriterContainer.innerHTML = '<div class="hanzi-text">🎉</div>';
          currentWriters = [];
          pinyinEl.textContent = "Wánchéng!";
          meaningEl.textContent = "ยินดีด้วย! คุณจำคำศัพท์ครบหมดแล้ว";
          if (meaningEnEl) meaningEnEl.textContent = "Congratulations! You\'ve mastered all cards!";
          levelEl.textContent = "DONE";
          btnKnow.disabled = true;
          btnNext.disabled = true;
          if (btnPrev) btnPrev.disabled = true;
          return;
        }

        btnKnow.disabled = false;
        btnNext.disabled = false;
        loadStrokeOrder(currentCard.hanzi);
        pinyinEl.textContent = currentCard.pinyin;
        meaningEl.textContent = currentCard.meaning;
        if (meaningEnEl) {
          meaningEnEl.textContent = currentCard.meaning_en || "";
          meaningEnEl.style.display = currentCard.meaning_en ? "inline-flex" : "none";
        }
        levelEl.textContent = currentCard.level;

        // เริ่มเล่นแอนิเมชันลำดับขีดแบบวนซ้ำ (Stroke Loop)
        playStrokeOrderSequential(0, currentCard.hanzi);

        // อ่านอัตโนมัติเมื่อเปิดการ์ดใหม่ (ถ้าเปิด Autoplay)
        if (isAutoplay && currentCard) {
          playAudio(currentCard.hanzi, isAudioLoop);
        }
      }, 200);

      updateStats();
    }

    function goPreviousCard() {
      if (historyIndex > 0) {
        historyIndex--;
        renderCard(historyCards[historyIndex]);
      }
    }

    function markAsKnown() {
      if (!currentCard) return;

      if (!knownIds.includes(currentCard.id)) {
        knownIds.push(currentCard.id);
        score += 10;
        saveState();
        showKnownToast();
        setTimeout(() => {
          renderCard();
        }, 300);
      } else {
        renderCard();
      }
    }

    function resetProgress() {
      if (confirm("ต้องการรีเซ็ตคำศัพท์และคะแนนทั้งหมดใช่หรือไม่?")) {
        knownIds = [];
        score = 0;
        historyCards = [];
        historyIndex = -1;
        saveState();
        renderCard();
      }
    }

    function handleAudioClick(e) {
      e.stopPropagation();
      if (currentCard && currentCard.hanzi) {
        playAudio(currentCard.hanzi, isAudioLoop);
      }
    }

    /**
     * 4. Event Listeners (พร้อมระบบ Double Click / Double Tap = จำได้แล้ว)
     */
    let clickTimer = null;
    const DOUBLE_CLICK_DELAY = 280; // ms

    function handleCardTap() {
      if (clickTimer) {
        // แตะครั้งที่ 2 ภายใน 280ms -> ดับเบิ้ลคลิก/ดับเบิ้ลแท็บ = จำได้แล้ว!
        clearTimeout(clickTimer);
        clickTimer = null;
        markAsKnown();
      } else {
        // แตะครั้งแรก -> รอ 280ms หากไม่มีครั้งที่ 2 จึงพลิกการ์ด
        clickTimer = setTimeout(() => {
          clickTimer = null;
          cardEl.classList.toggle("is-flipped");
        }, DOUBLE_CLICK_DELAY);
      }
    }

    cardEl.addEventListener("click", (e) => {
      // ป้องกันการคลิกจากปุ่มในหน้าการ์ด (เช่น ปุ่มเสียง, ปุ่มวาด)
      if (e.target.closest("button")) return;
      handleCardTap();
    });

    btnNext.addEventListener("click", () => renderCard());
    if (btnPrev) {
      btnPrev.addEventListener("click", goPreviousCard);
    }
    btnKnow.addEventListener("click", markAsKnown);
    btnReset.addEventListener("click", resetProgress);

    btnAudioFront.addEventListener("click", handleAudioClick);
    btnAudioBack.addEventListener("click", handleAudioClick);

    btnStrokeReplay.addEventListener("click", (e) => {
      e.stopPropagation();
      stopStrokeOrderLoop();
      currentWriters.forEach(w => w.hideCharacter());
      playStrokeOrderSequential(0, currentCard ? currentCard.hanzi : null);
    });

    // ปลดล็อค Web Speech API เมื่อผู้ใช้แตะหรือคลิกหน้าเว็บครั้งแรก (แก้ปัญหา Autoplay Policy ของบราวเซอร์)
    function unlockAudioOnFirstInteraction() {
      if ('speechSynthesis' in window) {
        // ทดลอง resume หรือ speak utterance ว่างๆ เบาๆ เพื่อปลดล็อคข้อห้าม Autoplay
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        if (isAutoplay && currentCard && !window.speechSynthesis.speaking && !activeUtterance) {
          playAudio(currentCard.hanzi, isAudioLoop);
        }
      }
      document.removeEventListener("touchstart", unlockAudioOnFirstInteraction);
      document.removeEventListener("click", unlockAudioOnFirstInteraction);
    }
    document.addEventListener("touchstart", unlockAudioOnFirstInteraction, { once: true });
    document.addEventListener("click", unlockAudioOnFirstInteraction, { once: true });

    toggleAutoplay.addEventListener("change", (e) => {
      isAutoplay = e.target.checked;
      saveState();
      if (isAutoplay && currentCard) {
        playAudio(currentCard.hanzi, isAudioLoop);
      } else if (!isAudioLoop) {
        stopAudio();
      }
    });

    if (toggleLoop) {
      toggleLoop.addEventListener("change", (e) => {
        isAudioLoop = e.target.checked;
        saveState();
        if (isAudioLoop && currentCard) {
          playAudio(currentCard.hanzi, true);
        } else {
          stopAudio();
        }
      });
    }

    levelChips.forEach(chip => {
      chip.addEventListener("click", () => {
        const level = chip.dataset.level;
        const isActive = chip.classList.contains("active");

        if (isActive && selectedLevels.length === 1) return;

        if (isActive) {
          selectedLevels = selectedLevels.filter(l => l !== level);
          chip.classList.remove("active");
        } else {
          selectedLevels.push(level);
          chip.classList.add("active");
        }

        historyCards = [];
        historyIndex = -1;
        saveState();
        renderCard();
      });
    });

    /**
     * 5. Mobile Touch Gesture Controls
     *    - ปัดจากขวาไปซ้าย (Swipe Right to Left) ➔ สุ่มคำต่อไป
     *    - ปัดจากซ้ายไปขวา (Swipe Left to Right) ➔ คำก่อนหน้า
     *    - แตะ 1 ครั้ง ➔ พลิกการ์ด (Single Tap)
     *    - แตะ 2 ครั้ง ➔ จำได้แล้ว (Double Tap = markAsKnown)
     */
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const cardSceneEl = document.querySelector(".card-scene") || cardEl;

    cardSceneEl.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    cardSceneEl.addEventListener("touchend", (e) => {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const threshold = 40; // ระยะขั้นต่ำของการปัด (swipe)

      if (absX > threshold && absX > absY) {
        // ปัดแนวนอน (ยกเลิก timer คลิก เพื่อไม่ให้เกิดการพลิกการ์ด)
        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }

        if (deltaX > 0) {
          // ปัดจากซ้ายไปขวา (Swipe left to right) ➔ คำก่อนหน้า
          goPreviousCard();
        } else {
          // ปัดจากขวาไปซ้าย (Swipe right to left) ➔ คำถัดไป
          renderCard();
        }
      }
    }, { passive: true });

    /**
     * 6. Keyboard Shortcuts
     *    - Space / Enter : พลิกการ์ด
     *    - ← (ลูกศรซ้าย)   : คำก่อนหน้า
     *    - → (ลูกศรขวา)   : ข้าม / สุ่มคำต่อไป
     *    - ↑ (ลูกศรขึ้น)  : จำได้แล้ว (+10 คะแนน)
     *    - P              : ฟังเสียงอ่าน
     *    - L              : สลับเปิด/ปิดเสียงวนซ้ำ (Loop)
     *    - S              : ลำดับขีด
     */
    document.addEventListener("keydown", (e) => {
      switch (e.code) {
        case "Space":
        case "Enter":
          e.preventDefault();
          cardEl.classList.toggle("is-flipped");
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPreviousCard();
          break;
        case "ArrowRight":
          e.preventDefault();
          renderCard();
          break;
        case "ArrowUp":
          e.preventDefault();
          markAsKnown();
          break;
        case "KeyP":
          e.preventDefault();
          if (currentCard && currentCard.hanzi) {
            playAudio(currentCard.hanzi, isAudioLoop);
          }
          break;
        case "KeyL":
          e.preventDefault();
          isAudioLoop = !isAudioLoop;
          if (toggleLoop) toggleLoop.checked = isAudioLoop;
          saveState();
          if (isAudioLoop && currentCard) {
            playAudio(currentCard.hanzi, true);
          } else {
            stopAudio();
          }
          break;
        case "KeyS":
          e.preventDefault();
          stopStrokeOrderLoop();
          currentWriters.forEach(w => w.hideCharacter());
          playStrokeOrderSequential(0, currentCard ? currentCard.hanzi : null);
          break;
      }
    });

    renderCard();

    /**
     * 7. PWA Service Worker & Install Prompt
     */
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
          .catch(err => console.warn('[PWA] Service Worker registration failed:', err));
      });
    }

    let deferredPrompt = null;
    const pwaInstallBanner = document.getElementById('pwa-install-banner');
    const btnInstallApp = document.getElementById('btn-install-app');
    const btnInstallClose = document.getElementById('btn-install-close');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (pwaInstallBanner) {
        pwaInstallBanner.classList.add('show');
      }
    });

    if (btnInstallApp) {
      btnInstallApp.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] User accepted the install prompt');
        }
        deferredPrompt = null;
        if (pwaInstallBanner) {
          pwaInstallBanner.classList.remove('show');
        }
      });
    }

    if (btnInstallClose) {
      btnInstallClose.addEventListener('click', () => {
        if (pwaInstallBanner) {
          pwaInstallBanner.classList.remove('show');
        }
      });
    }

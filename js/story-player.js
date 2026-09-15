/**
 * HSK Story Audio & Speech Controller
 */

class StoryAudioPlayer {
  constructor() {
    this.audio = new Audio();
    this.isPlaying = false;
    this.currentTrackUrl = null;
    this.playbackRate = 1.0;
    this.onTimeUpdateCallback = null;
    this.onTrackEndCallback = null;
    this.onStateChangeCallback = null;

    this.audio.addEventListener('timeupdate', () => {
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.audio.currentTime, this.audio.duration || 0);
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.audio.currentTime, this.audio.duration || 0);
      }
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
      if (this.onTrackEndCallback) this.onTrackEndCallback();
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      if (this.onStateChangeCallback) this.onStateChangeCallback(true);
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('[StoryAudioPlayer] Audio playback error, fallback to speech synthesis', e);
      this.isPlaying = false;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    });
  }

  loadTrack(url) {
    if (this.currentTrackUrl !== url) {
      this.currentTrackUrl = url;
      this.audio.src = url;
      this.audio.playbackRate = this.playbackRate;
      this.audio.load();
    }
  }

  play() {
    if (!this.currentTrackUrl) return;
    this.audio.playbackRate = this.playbackRate;
    return this.audio.play().catch(err => {
      console.warn('[StoryAudioPlayer] Play was blocked or failed:', err);
    });
  }

  pause() {
    this.audio.pause();
  }

  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(seconds) {
    if (this.audio.duration) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
    }
  }

  setSpeed(rate) {
    this.playbackRate = rate;
    this.audio.playbackRate = rate;
  }

  /**
   * Speak an individual Chinese sentence via SpeechSynthesis
   */
  speakSentence(chineseText, onStart = null, onEnd = null, onBoundary = null) {
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }
    this.stopSpeech();
    const utterance = new SpeechSynthesisUtterance(chineseText);
    utterance.lang = 'zh-CN';
    utterance.rate = this.playbackRate;

    // Pick Chinese voice if available in system
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const zhVoice = voices.find(v => v.lang === 'zh-CN' || v.lang === 'zh_CN') 
        || voices.find(v => v.lang.startsWith('zh'));
      if (zhVoice) utterance.voice = zhVoice;
    }

    this.activeUtterance = utterance;

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onboundary = (event) => {
      if (onBoundary) onBoundary(event);
    };

    const cleanup = () => {
      if (this.activeUtterance === utterance) {
        this.activeUtterance = null;
      }
      if (onEnd) onEnd();
    };

    utterance.onend = cleanup;
    utterance.onerror = cleanup;

    window.speechSynthesis.speak(utterance);
  }

  stopSpeech() {
    if ('speechSynthesis' in window) {
      if (this.activeUtterance) {
        this.activeUtterance.onend = null;
        this.activeUtterance.onerror = null;
        this.activeUtterance = null;
      }
      window.speechSynthesis.cancel();
    }
  }

  stopAll() {
    this.pause();
    this.stopSpeech();
  }
}

window.storyPlayer = new StoryAudioPlayer();

# HSK Flashcards & HSKStory Library

A PWA Chinese learning platform featuring:
- **🀄 Flashcards (HSK 1-4)** with stroke order animations (`hanzi-writer`), audio pronunciation, loop mode, and score tracking.
- **📖 HSKStory Graded Library (HSK 1-9)** with stories cloned from [HSKStory (hskstory.com)](https://hskstory.com/):
  - Stories graded across HSK 1 to HSK 9.
  - Native narrator audio with speed controls (0.75x, 1.0x, 1.25x, 1.5x) and audio scrubber.
  - Interactive ruby pinyin annotations with toggle (`拼`).
  - Sentence-by-sentence English translations with toggle (`EN`).
  - Sentence tap-to-listen pronunciation with SpeechSynthesis fallback.
  - Chapter navigation & pagination.
  - Full offline PWA caching support.

## Crawler & Dataset Management

To crawl or expand stories from HSKStory:
```bash
# Crawl 1 story per level (starter bundle)
python3 scripts/crawl_hskstory.py 1

# Crawl 3 stories per level
python3 scripts/crawl_hskstory.py 3

# Crawl full library across all HSK levels
python3 scripts/crawl_hskstory.py --full
```
Outputs are written to `data/stories.json` and bundled into `js/stories-data.js`.


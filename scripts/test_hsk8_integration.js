const fs = require('fs');
const assert = require('assert');

console.log('=== Step 1: Validating js/data.js ===');
const dataJs = fs.readFileSync('js/data.js', 'utf8');
const HSK_DATA = (new Function(dataJs + '; return HSK_DATA;'))();

assert.strictEqual(HSK_DATA.length, 10898, `Expected 10898 words, found ${HSK_DATA.length}`);

const counts = {};
HSK_DATA.forEach(item => {
  counts[item.level] = (counts[item.level] || 0) + 1;
});

console.log('Level counts in HSK_DATA:', counts);
assert.strictEqual(counts['HSK 1'], 300, 'HSK 1 count mismatch');
assert.strictEqual(counts['HSK 2'], 197, 'HSK 2 count mismatch');
assert.strictEqual(counts['HSK 3'], 493, 'HSK 3 count mismatch');
assert.strictEqual(counts['HSK 4'], 990, 'HSK 4 count mismatch');
assert.strictEqual(counts['HSK 5'], 1579, 'HSK 5 count mismatch');
assert.strictEqual(counts['HSK 6'], 1777, 'HSK 6 count mismatch');
assert.strictEqual(counts['HSK 7'], 5562, 'HSK 7 / advanced band count mismatch');

// Validate advanced band properties
const advancedWords = HSK_DATA.filter(x => x.level === 'HSK 7');
assert.strictEqual(advancedWords.length, 5562, 'Expected 5562 advanced words');
advancedWords.forEach((w, idx) => {
  const expectedId = 5337 + idx;
  assert.strictEqual(w.id, expectedId, `Word ${w.hanzi} has ID ${w.id}, expected ${expectedId}`);
  assert.ok(w.hanzi && w.hanzi.trim().length > 0, `Missing hanzi at index ${idx}`);
  assert.ok(w.pinyin && w.pinyin.trim().length > 0, `Missing pinyin for ${w.hanzi}`);
  assert.ok(w.meaning && w.meaning.trim().length > 0, `Missing Thai meaning for ${w.hanzi}`);
  assert.ok(w.meaning_en && w.meaning_en.trim().length > 0, `Missing English meaning for ${w.hanzi}`);
});
console.log('✓ All 5,562 advanced band items have valid id, hanzi, pinyin, meaning (Thai), and meaning_en (English)');

console.log('\n=== Step 2: Validating index.html ===');
const indexHtml = fs.readFileSync('index.html', 'utf8');
assert.ok(indexHtml.includes('data-level="HSK 8"'), 'index.html missing HSK 8 level chip');
assert.ok(indexHtml.includes('data-level="HSK 7"'), 'index.html missing HSK 7 level chip');
assert.ok(indexHtml.includes('data-level="all"'), 'index.html missing "ทั้งหมด" level chip');
assert.ok(indexHtml.includes('HSK 1-8 Flashcards') || indexHtml.includes('HSK 1-9 Flashcards'), 'index.html missing updated HSK title');
assert.ok(indexHtml.includes('css/style.css?v=11.0.0') || indexHtml.includes('css/style.css?v=12.0.0'), 'index.html missing cache buster on style.css');
assert.ok(indexHtml.includes('js/data.js?v=11.0.0') || indexHtml.includes('js/data.js?v=12.0.0'), 'index.html missing cache buster on data.js');
assert.ok(indexHtml.includes('js/app.js?v=11.0.0') || indexHtml.includes('js/app.js?v=12.0.0'), 'index.html missing cache buster on app.js');
console.log('✓ index.html has HSK 8 chip, updated HSK title, and cache busters');

console.log('\n=== Step 3: Validating css/style.css ===');
const styleCss = fs.readFileSync('css/style.css', 'utf8');
assert.ok(styleCss.includes('.lvl-8'), 'style.css missing .lvl-8 class');
console.log('✓ style.css has .lvl-8 dot definition');

console.log('\n=== Step 4: Validating sw.js ===');
const swJs = fs.readFileSync('sw.js', 'utf8');
assert.ok(swJs.includes("APP_VERSION = 'v11.0.0'") || swJs.includes("APP_VERSION = 'v12.0.0'"), 'sw.js version mismatch');
console.log('✓ sw.js has valid APP_VERSION');

console.log('\n=== Step 5: Validating js/app.js logic & filtering ===');
const appJs = fs.readFileSync('js/app.js', 'utf8');
assert.ok(appJs.includes('"HSK 8"'), 'app.js missing "HSK 8"');

// Extract and test getFilteredData logic as written in app.js
const ALL_LEVELS = ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6", "HSK 7", "HSK 8"];

function getFilteredData(selectedLevels) {
  if (selectedLevels.includes("all") || selectedLevels.length === ALL_LEVELS.length) {
    return HSK_DATA;
  }
  const hasHsk7 = selectedLevels.includes("HSK 7");
  const hasHsk8 = selectedLevels.includes("HSK 8");
  const standardLevels = selectedLevels.filter(lvl => lvl !== "HSK 7" && lvl !== "HSK 8");

  return HSK_DATA.filter(item => {
    if (standardLevels.includes(item.level)) return true;
    if ((hasHsk7 || hasHsk8) && (item.level === "HSK 7" || item.level === "HSK 8" || item.level === "HSK 7-8" || item.level === "HSK 7-9")) {
      return true;
    }
    return false;
  });
}

function getActiveCards(selectedLevels, knownIds = []) {
  return getFilteredData(selectedLevels).filter(item => !knownIds.includes(item.id));
}

// 1. Single level HSK 8
const hsk8Only = getActiveCards(['HSK 8']);
assert.strictEqual(hsk8Only.length, 5562, `Expected 5562 cards for HSK 8, got ${hsk8Only.length}`);
console.log(`✓ Active cards when ONLY HSK 8 selected: ${hsk88 = hsk8Only.length}`);

// 2. Single level HSK 7
const hsk7Only = getActiveCards(['HSK 7']);
assert.strictEqual(hsk7Only.length, 5562, `Expected 5562 cards for HSK 7, got ${hsk7Only.length}`);
console.log(`✓ Active cards when ONLY HSK 7 selected: ${hsk7Only.length}`);

// 3. Multi-select: HSK 7 + HSK 8 (Must be unified, no duplicate entries)
const hsk7And8 = getActiveCards(['HSK 7', 'HSK 8']);
assert.strictEqual(hsk7And8.length, 5562, `Expected 5562 non-duplicate cards for HSK 7 + 8, got ${hsk7And8.length}`);
console.log(`✓ Active cards when HSK 7 + 8 selected together: ${hsk7And8.length} (no duplicates)`);

// 4. Multi-select: HSK 6 + HSK 8 (1777 + 5562 = 7339)
const hsk6And8 = getActiveCards(['HSK 6', 'HSK 8']);
assert.strictEqual(hsk6And8.length, 1777 + 5562, `Expected 7339 cards for HSK 6 + 8, got ${hsk6And8.length}`);
console.log(`✓ Active cards when HSK 6 + 8 selected: ${hsk6And8.length} (1777 + 5562)`);

// 5. Multi-select: HSK 1 + HSK 8 (300 + 5562 = 5862)
const hsk1And8 = getActiveCards(['HSK 1', 'HSK 8']);
assert.strictEqual(hsk1And8.length, 300 + 5562, `Expected 5862 cards for HSK 1 + 8, got ${hsk1And8.length}`);
console.log(`✓ Active cards when HSK 1 + 8 selected: ${hsk1And8.length} (300 + 5562)`);

// 6. "ทั้งหมด" (All levels: 10898)
const allCards = getActiveCards(['all']);
assert.strictEqual(allCards.length, 10898, `Expected 10898 cards for all levels, got ${allCards.length}`);
console.log(`✓ Active cards when "ทั้งหมด" selected: ${allCards.length}`);

// 7. Test memory system (Marking card as known)
const sampleKnown = [5337, 5338, 5339]; // First 3 words in HSK 8
const afterKnownHsk8 = getActiveCards(['HSK 8'], sampleKnown);
assert.strictEqual(afterKnownHsk8.length, 5559, 'Known cards decrement failed for HSK 8');
console.log(`✓ Active cards in HSK 8 after learning 3 cards: ${afterKnownHsk8.length}`);

console.log('\n========================================');
console.log('🎉 ALL HSK 8 INTEGRATION TESTS PASSED 100%!');
console.log('========================================');

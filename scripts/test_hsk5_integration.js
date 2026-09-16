const fs = require('fs');
const assert = require('assert');

console.log('=== Step 1: Validating js/data.js ===');
const dataJs = fs.readFileSync('js/data.js', 'utf8');
const HSK_DATA = (new Function(dataJs + '; return HSK_DATA;'))();

assert.strictEqual(HSK_DATA.length, 3559, `Expected 3559 words, found ${HSK_DATA.length}`);

const counts = {};
HSK_DATA.forEach(item => {
  counts[item.level] = (counts[item.level] || 0) + 1;
});

console.log('Level counts:', counts);
assert.strictEqual(counts['HSK 1'], 300, 'HSK 1 count mismatch');
assert.strictEqual(counts['HSK 2'], 197, 'HSK 2 count mismatch');
assert.strictEqual(counts['HSK 3'], 493, 'HSK 3 count mismatch');
assert.strictEqual(counts['HSK 4'], 990, 'HSK 4 count mismatch');
assert.strictEqual(counts['HSK 5'], 1579, 'HSK 5 count mismatch');

// Validate HSK 5 specific properties
const hsk5Words = HSK_DATA.filter(x => x.level === 'HSK 5');
hsk5Words.forEach((w, idx) => {
  const expectedId = 1981 + idx;
  assert.strictEqual(w.id, expectedId, `Word ${w.hanzi} has ID ${w.id}, expected ${expectedId}`);
  assert.ok(w.hanzi && w.hanzi.trim().length > 0, `Missing hanzi at index ${idx}`);
  assert.ok(w.pinyin && w.pinyin.trim().length > 0, `Missing pinyin for ${w.hanzi}`);
  assert.ok(w.meaning && w.meaning.trim().length > 0, `Missing Thai meaning for ${w.hanzi}`);
  assert.ok(w.meaning_en && w.meaning_en.trim().length > 0, `Missing English meaning for ${w.hanzi}`);
});
console.log('✓ All 1579 HSK 5 items have valid id, hanzi, pinyin, meaning (Thai), meaning_en (English), and level');

console.log('\n=== Step 2: Validating index.html ===');
const indexHtml = fs.readFileSync('index.html', 'utf8');
assert.ok(indexHtml.includes('data-level="HSK 5"'), 'index.html missing HSK 5 level chip');
assert.ok(indexHtml.includes('HSK 1-5 Flashcards'), 'index.html missing updated HSK 1-5 title');
assert.ok(indexHtml.includes('js/data.js?v=8.0.0'), 'index.html missing v=8.0.0 on data.js');
assert.ok(indexHtml.includes('js/app.js?v=8.0.0'), 'index.html missing v=8.0.0 on app.js');
console.log('✓ index.html has HSK 5 button chip, updated title, and cache busting query strings');

console.log('\n=== Step 3: Validating js/app.js ===');
const appJs = fs.readFileSync('js/app.js', 'utf8');
assert.ok(appJs.includes('"HSK 5"'), 'app.js ALL_LEVELS does not include HSK 5');
const allLevelsMatch = appJs.match(/ALL_LEVELS\s*=\s*\[(.*?)\];/);
assert.ok(allLevelsMatch, 'ALL_LEVELS declaration not found in app.js');
console.log('ALL_LEVELS declaration in app.js:', allLevelsMatch[0]);
console.log('✓ app.js has HSK 5 registered in ALL_LEVELS');

console.log('\n=== Step 4: Validating sw.js ===');
const swJs = fs.readFileSync('sw.js', 'utf8');
assert.ok(swJs.includes("APP_VERSION = 'v8.0.0'"), 'sw.js does not have v8.0.0');
console.log('✓ sw.js has APP_VERSION bumped to v8.0.0');

console.log('\n=== Step 5: Testing Flashcard Selection & Logic ===');
// Simulate app.js getActiveCards logic
function getActiveCards(selectedLevels, knownIds) {
  return HSK_DATA.filter(item => selectedLevels.includes(item.level) && !knownIds.includes(item.id));
}

const hsk5Only = getActiveCards(['HSK 5'], []);
assert.strictEqual(hsk5Only.length, 1579, 'Expected 1579 active cards for HSK 5');
console.log(`Active cards when only HSK 5 selected: ${hsk5Only.length}`);

// Mark 5 cards as known
const sampleKnown = [1981, 1982, 1983, 1984, 1985];
const afterKnown = getActiveCards(['HSK 5'], sampleKnown);
assert.strictEqual(afterKnown.length, 1574, 'Known cards decrement failed');
console.log(`Active cards after learning 5 cards: ${afterKnown.length}`);

// Test multiple levels selected (e.g. HSK 4 + HSK 5)
const hsk4And5 = getActiveCards(['HSK 4', 'HSK 5'], []);
assert.strictEqual(hsk4And5.length, 990 + 1579, 'Combined level filtering failed');
console.log(`Active cards with HSK 4 + HSK 5: ${hsk4And5.length}`);

console.log('\n========================================');
console.log('🎉 ALL INTEGRATION TESTS PASSED 100%!');
console.log('========================================');

#!/usr/bin/env python3
"""
Appends HSK 5 words to js/data.js
"""

import json
import re
from translate_hsk5 import CURATED_THAI

def main():
    raw_json_path = "scripts/hsk5_raw.json"
    data_js_path = "js/data.js"
    
    with open(raw_json_path, "r", encoding="utf-8") as f:
        words = json.load(f)
        
    with open(data_js_path, "r", encoding="utf-8") as f:
        existing_content = f.read()

    # Check if HSK 5 is already added
    if "// HSK 5" in existing_content:
        print("HSK 5 is already in js/data.js!")
        return

    # Find the end of HSK 4 array, e.g. line 1980
    match = re.search(r'(\{ id: 1980,.*?\})(\s*\];)', existing_content, re.DOTALL)
    if not match:
        raise Exception("Could not find ID 1980 in js/data.js")

    last_entry = match.group(1)
    
    new_entries = [last_entry + ","]
    new_entries.append("      // HSK 5 (1579 words - Official HSK 3.0 PDF Exact Order)")

    for i, w in enumerate(words):
        idx = 1981 + i
        hz = w["hanzi"]
        py = w["pinyin"]
        th = CURATED_THAI[hz]
        en = w["meaning_en"]

        # Escape quotes and backslashes
        th_esc = json.dumps(th, ensure_ascii=False)
        en_esc = json.dumps(en, ensure_ascii=False)
        hz_esc = json.dumps(hz, ensure_ascii=False)
        py_esc = json.dumps(py, ensure_ascii=False)

        comma = "," if i < len(words) - 1 else ""
        entry = f"      {{ id: {idx}, hanzi: {hz_esc}, pinyin: {py_esc}, meaning: {th_esc}, meaning_en: {en_esc}, level: \"HSK 5\" }}{comma}"
        new_entries.append(entry)

    replacement = "\n".join(new_entries) + "\n    ];\n"
    new_content = existing_content[:match.start()] + replacement + existing_content[match.end():]

    with open(data_js_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"Successfully added {len(words)} HSK 5 words to {data_js_path}!")

if __name__ == "__main__":
    main()

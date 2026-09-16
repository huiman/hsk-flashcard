import pymupdf
import re
import json

PDF_PATH = "/home/hui/.gemini/antigravity-ide/brain/44efc17b-01cb-499e-9919-3bea1a0018f8/.user_uploaded/media_1789485497299.pdf"

def extract_raw_words():
    doc = pymupdf.open(PDF_PATH)
    words = []
    for page_idx in range(1, len(doc)):
        page = doc[page_idx]
        d = page.get_text("dict")
        for b in d["blocks"]:
            if "lines" not in b:
                continue
            has_headword = False
            headword_parts = []
            pinyin_parts = []
            en_parts = []
            
            for l in b["lines"]:
                for s in l["spans"]:
                    text = s["text"]
                    font = s["font"]
                    size = round(s["size"], 1)
                    if size >= 11.0 and "Bold" in font:
                        headword_parts.append(text)
                        has_headword = True
                    elif size >= 9.0 and size <= 10.5:
                        pinyin_parts.append(text)
                    elif size >= 8.0 and size <= 8.9:
                        en_parts.append(text)
            
            if has_headword:
                hanzi = "".join(headword_parts).strip()
                pinyin = "".join(pinyin_parts).strip()
                meaning_en = "".join(en_parts).strip()
                # Clean up whitespace
                pinyin = re.sub(r'\s+', ' ', pinyin)
                meaning_en = re.sub(r'\s+', ' ', meaning_en)
                words.append({
                    "page": page_idx + 1,
                    "hanzi": hanzi,
                    "pinyin": pinyin,
                    "meaning_en": meaning_en
                })
    return words

if __name__ == "__main__":
    words = extract_raw_words()
    print(f"Extracted {len(words)} words.")
    if words:
        print("First 3:", words[:3])
        print("Last 3:", words[-3:])
    
    empty_pinyin = [w for w in words if not w["pinyin"]]
    empty_en = [w for w in words if not w["meaning_en"]]
    print(f"Empty pinyin count: {len(empty_pinyin)}")
    print(f"Empty English count: {len(empty_en)}")
    if empty_pinyin:
        print("Sample empty pinyin:", empty_pinyin[:5])
    if empty_en:
        print("Sample empty English:", empty_en[:5])

#!/usr/bin/env python3
"""
Crawler & extractor for HSKStory (hskstory.com) stories, chapters, audio links, and metadata.
"""

import urllib.request
import urllib.parse
import re
import json
import os
import sys
import time

BASE_URL = "https://hskstory.com"
AUDIO_BASE = "https://audio.hskstory.com"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def fetch_url(url, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.read().decode("utf-8", errors="ignore")
        except Exception as e:
            if i == retries - 1:
                print(f"Error fetching {url}: {e}", file=sys.stderr)
                return None
            time.sleep(1)
    return None

def get_stories_for_level(hsk_level):
    url = f"{BASE_URL}/stories/hsk-{hsk_level}"
    html = fetch_url(url)
    if not html:
        return []
    
    # Matches /stories/hsk-{level}/{slug}/{chapter-slug}
    pattern = re.compile(rf'href=[\x27\x22](/stories/hsk-{hsk_level}/([a-z0-9\-]+)/([a-z0-9\-]+))[\x27\x22]')
    found = {}
    for match in pattern.finditer(html):
        full_path, story_slug, chapter_slug = match.groups()
        if story_slug not in found:
            found[story_slug] = {
                "hsk_level": hsk_level,
                "story_slug": story_slug,
                "first_chapter_path": full_path
            }
    return list(found.values())

def parse_chapter_page(chapter_path):
    url = f"{BASE_URL}{chapter_path}"
    html = fetch_url(url)
    if not html:
        return None
    
    rsc_parts = re.findall(r"self\.__next_f\.push\(\[1,\s*\"(.*?)\"\]\)", html)
    if not rsc_parts:
        return None
    
    story_meta = None
    initial_content = None
    pinyin_data = []
    translation_data = {}
    content_html = ""
    
    for p in rsc_parts:
        clean = p.replace('\\"', '"').replace('\\\\', '\\')
        
        # Check story meta
        if '{"story":' in clean and not story_meta:
            idx = clean.find('{"story":')
            for end in range(len(clean), idx, -1):
                try:
                    data = json.loads(clean[idx:end])
                    if "story" in data:
                        story_meta = data.get("story")
                        initial_content = data.get("initialContent")
                        break
                except Exception:
                    continue
        
        # Check pinyin_data
        if clean.startswith("[[{\"w\":") and not pinyin_data:
            try:
                pinyin_data = json.loads(clean)
            except Exception:
                pass
                
        # Check translation_data
        if (clean.startswith("{\"") and "\":\"" in clean and not clean.startswith("{\"story\"")) and not translation_data:
            try:
                parsed = json.loads(clean)
                if isinstance(parsed, dict) and any(isinstance(v, str) for v in parsed.values()):
                    translation_data = parsed
            except Exception:
                pass
                
        # Check content_html
        if "\\u003cp\\u003e" in clean and not content_html:
            try:
                content_html = clean.encode("utf-8").decode("unicode_escape", errors="ignore")
            except Exception:
                pass

    if not story_meta:
        return None
        
    return {
        "story": story_meta,
        "initial_content": initial_content or {},
        "pinyin_data": pinyin_data,
        "translation_data": translation_data,
        "content_html": content_html
    }

def construct_audio_url(hsk_level, story_slug, chapter_num, voice, asset_version):
    ch_str = f"chapter-{chapter_num:02d}.mp3"
    return f"{AUDIO_BASE}/hsk{hsk_level}-{story_slug}/audio/_versions/v{asset_version}/{voice}/{ch_str}"

def crawl_sample(max_per_level=1, output_file="js/stories-data.js"):
    print(f"Starting crawler for HSK 1 to 9 (max {max_per_level} stories per level)...")
    all_stories = []
    
    for level in range(1, 10):
        print(f"\n--- Crawling HSK {level} ---")
        stories = get_stories_for_level(level)
        print(f"Found {len(stories)} stories in HSK {level}")
        
        count = 0
        for item in stories:
            if max_per_level and count >= max_per_level:
                break
            
            slug = item["story_slug"]
            first_path = item["first_chapter_path"]
            print(f"  Fetching: {slug} ...")
            data = parse_chapter_page(first_path)
            if not data or not data.get("story"):
                print(f"    Failed to parse metadata for {slug}")
                continue
                
            story = data["story"]
            init_c = data.get("initial_content") or {}
            
            chapters = story.get("chapters", [])
            parsed_chapters = []
            
            asset_v = init_c.get("audio_asset_version") or 9
            voices = init_c.get("available_voices") or ["luna", "kai"]
            primary_voice = voices[0] if voices else "luna"
            
            # First chapter
            ch1_title = chapters[0].get("title", "") if chapters else ""
            ch1_title_en = chapters[0].get("title_en", "") if chapters else ""
            ch1_slug = chapters[0].get("slug", "") if chapters else ""
            
            audio_url = construct_audio_url(level, slug, 1, primary_voice, asset_v)
            
            parsed_chapters.append({
                "number": 1,
                "title": ch1_title,
                "title_en": ch1_title_en,
                "slug": ch1_slug,
                "audio_url": audio_url,
                "available_voices": voices,
                "translation_data": data.get("translation_data", {}),
                "pinyin_data": data.get("pinyin_data", []),
                "content_html": data.get("content_html", "")
            })
            
            # Fetch remaining chapters if any (up to 3 chapters)
            for ch in chapters[1:3]:
                ch_num = ch.get("number")
                ch_slug = ch.get("slug")
                ch_path = f"/stories/hsk-{level}/{slug}/{ch_slug}"
                print(f"    Fetching chapter {ch_num} ({ch_slug})...")
                ch_data = parse_chapter_page(ch_path)
                if ch_data:
                    ch_init = ch_data.get("initial_content") or {}
                    ch_asset_v = ch_init.get("audio_asset_version") or asset_v
                    ch_voices = ch_init.get("available_voices") or voices
                    ch_audio = construct_audio_url(level, slug, ch_num, primary_voice, ch_asset_v)
                    parsed_chapters.append({
                        "number": ch_num,
                        "title": ch.get("title", ""),
                        "title_en": ch.get("title_en", ""),
                        "slug": ch_slug,
                        "audio_url": ch_audio,
                        "available_voices": ch_voices,
                        "translation_data": ch_data.get("translation_data", {}),
                        "pinyin_data": ch_data.get("pinyin_data", []),
                        "content_html": ch_data.get("content_html", "")
                    })
                time.sleep(0.3)
                
            story_record = {
                "id": story.get("id"),
                "hsk_level": level,
                "slug": slug,
                "title": story.get("title"),
                "title_en": story.get("title_en"),
                "synopsis": story.get("synopsis"),
                "genre": story.get("genre"),
                "chapter_count": len(chapters),
                "chapters": parsed_chapters
            }
            all_stories.append(story_record)
            count += 1
            time.sleep(0.3)
            
    print(f"\nCrawled total {len(all_stories)} stories across HSK 1-9.")
    
    # Save as JSON
    os.makedirs("data", exist_ok=True)
    with open("data/stories.json", "w", encoding="utf-8") as f:
        json.dump(all_stories, f, ensure_ascii=False, indent=2)
    print("Saved to data/stories.json")
    
    # Save as JS variable for PWA offline inclusion
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("/**\n * HSKStory Graded Library Data (HSK 1 - 9)\n * Extracted from hskstory.com\n */\n")
        f.write("window.HSK_STORIES_DATA = ")
        json.dump(all_stories, f, ensure_ascii=False)
        f.write(";\n")
    print(f"Saved to {output_file}")

if __name__ == "__main__":
    max_stories = 2
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        max_stories = int(sys.argv[1])
    elif "--full" in sys.argv:
        max_stories = 0
    crawl_sample(max_per_level=max_stories)

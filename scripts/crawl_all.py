#!/usr/bin/env python3
"""
High-performance resilient bulk crawler for all 175 stories from HSKStory.
Features:
- Incremental checkpointing (saves as it goes)
- Concurrent worker pool for fetching pages fast and safely
- Preserves existing crawled stories so it resumes without re-downloading
"""

import urllib.request
import urllib.parse
import re
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "https://hskstory.com"
AUDIO_BASE = "https://audio.hskstory.com"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def fetch_url(url, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as resp:
                return resp.read().decode("utf-8", errors="ignore")
        except Exception as e:
            if i == retries - 1:
                return None
            time.sleep(0.5)
    return None

def get_stories_for_level(hsk_level):
    url = f"{BASE_URL}/stories/hsk-{hsk_level}"
    html = fetch_url(url)
    if not html:
        return []
    
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
    
    for p in rsc_parts:
        clean = p.replace('\\"', '"').replace('\\\\', '\\')
        
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
        
        if clean.startswith("[[{\"w\":") and not pinyin_data:
            try:
                pinyin_data = json.loads(clean)
            except Exception:
                pass
                
        if (clean.startswith("{\"") and "\":\"" in clean and not clean.startswith("{\"story\"")) and not translation_data:
            try:
                parsed = json.loads(clean)
                if isinstance(parsed, dict) and any(isinstance(v, str) for v in parsed.values()):
                    translation_data = parsed
            except Exception:
                pass

    if not story_meta:
        return None
        
    return {
        "story": story_meta,
        "initial_content": initial_content or {},
        "pinyin_data": pinyin_data,
        "translation_data": translation_data
    }

def construct_audio_url(hsk_level, story_slug, chapter_num, voice, asset_version):
    ch_str = f"chapter-{chapter_num:02d}.mp3"
    return f"{AUDIO_BASE}/hsk{hsk_level}-{story_slug}/audio/_versions/v{asset_version}/{voice}/{ch_str}"

def crawl_single_story(item):
    level = item["hsk_level"]
    slug = item["story_slug"]
    first_path = item["first_chapter_path"]
    
    data = parse_chapter_page(first_path)
    if not data or not data.get("story"):
        return None
        
    story = data["story"]
    init_c = data.get("initial_content") or {}
    chapters = story.get("chapters", [])
    parsed_chapters = []
    
    asset_v = init_c.get("audio_asset_version") or 9
    voices = init_c.get("available_voices") or ["luna", "kai"]
    primary_voice = voices[0] if voices else "luna"
    
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
        "pinyin_data": data.get("pinyin_data", [])
    })
    
    # Process remaining chapters
    for ch in chapters[1:]:
        ch_num = ch.get("number")
        ch_slug = ch.get("slug")
        ch_path = f"/stories/hsk-{level}/{slug}/{ch_slug}"
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
                "pinyin_data": ch_data.get("pinyin_data", [])
            })
            
    return {
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

def main():
    print("=== Bulk HSKStory Crawler Started ===")
    os.makedirs("data", exist_ok=True)
    
    # Load existing to resume
    existing = {}
    if os.path.exists("data/stories.json"):
        try:
            with open("data/stories.json", "r", encoding="utf-8") as f:
                for s in json.load(f):
                    existing[s["slug"]] = s
            print(f"Loaded {len(existing)} existing stories.")
        except Exception as e:
            print("Could not load existing:", e)
            
    all_story_items = []
    for lvl in range(1, 10):
        items = get_stories_for_level(lvl)
        all_story_items.extend(items)
        
    print(f"Found {len(all_story_items)} total stories across HSK 1-9.")
    
    to_crawl = [item for item in all_story_items if item["story_slug"] not in existing]
    print(f"Stories left to download: {len(to_crawl)}")
    
    completed = 0
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_slug = {executor.submit(crawl_single_story, it): it["story_slug"] for it in to_crawl}
        for future in as_completed(future_to_slug):
            slug = future_to_slug[future]
            try:
                story_record = future.result()
                if story_record:
                    existing[slug] = story_record
                    completed += 1
                    print(f"[{completed}/{len(to_crawl)}] Success: HSK {story_record['hsk_level']} - {story_record['title']} ({slug})")
                    
                    # Save checkpoint every 10 stories
                    if completed % 10 == 0 or completed == len(to_crawl):
                        sorted_stories = sorted(existing.values(), key=lambda x: (x["hsk_level"], x.get("id", 0)))
                        with open("data/stories.json", "w", encoding="utf-8") as f:
                            json.dump(sorted_stories, f, ensure_ascii=False, indent=2)
                        with open("js/stories-data.js", "w", encoding="utf-8") as f:
                            f.write("/** HSKStory Graded Library Data (HSK 1 - 9) **/\nwindow.HSK_STORIES_DATA = ")
                            json.dump(sorted_stories, f, ensure_ascii=False)
                            f.write(";\n")
                        print(f"--> Checkpoint saved: {len(sorted_stories)} stories.")
            except Exception as exc:
                print(f"Failed {slug}: {exc}")

    # Final Save
    sorted_stories = sorted(existing.values(), key=lambda x: (x["hsk_level"], x.get("id", 0)))
    with open("data/stories.json", "w", encoding="utf-8") as f:
        json.dump(sorted_stories, f, ensure_ascii=False, indent=2)
    with open("js/stories-data.js", "w", encoding="utf-8") as f:
        f.write("/** HSKStory Graded Library Data (HSK 1 - 9) **/\nwindow.HSK_STORIES_DATA = ")
        json.dump(sorted_stories, f, ensure_ascii=False)
        f.write(";\n")
        
    print(f"\n🎉 Completed! Total stories saved: {len(sorted_stories)}")

if __name__ == "__main__":
    main()

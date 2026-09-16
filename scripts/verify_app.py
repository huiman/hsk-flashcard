#!/usr/bin/env python3
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = "/home/hui/.gemini/antigravity-ide/brain/44efc17b-01cb-499e-9919-3bea1a0018f8"

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        
        # Go to app
        page.goto("http://localhost:8081", wait_until="networkidle")
        time.sleep(1)
        
        # 1. Header verification
        header_text = page.locator("header h1").inner_text()
        print("Header text:", header_text)
        assert "HSK 1-5" in header_text, f"Expected HSK 1-5 in header, got {header_text}"
        
        # 2. Check Level Selector chips
        chips = page.locator(".level-chip")
        chip_texts = [chips.nth(i).inner_text() for i in range(chips.count())]
        print("Available level chips:", chip_texts)
        assert "HSK 5" in chip_texts, "HSK 5 chip missing!"
        
        # 3. Select ONLY HSK 5
        # First click active chips to unselect
        for i in range(chips.count()):
            chip = chips.nth(i)
            lvl = chip.get_attribute("data-level")
            is_active = "active" in (chip.get_attribute("class") or "")
            if lvl != "HSK 5" and is_active:
                chip.click()
                time.sleep(0.2)
            elif lvl == "HSK 5" and not is_active:
                chip.click()
                time.sleep(0.2)
                
        time.sleep(0.5)
        
        # Verify active chips
        active_chips = [chips.nth(i).inner_text() for i in range(chips.count()) if "active" in (chips.nth(i).get_attribute("class") or "")]
        print("Active chips after selection:", active_chips)
        assert active_chips == ["HSK 5"], f"Expected only HSK 5 active, got {active_chips}"
        
        # 4. Check card state
        badge = page.locator("#card-level").inner_text()
        rem_count = page.locator("#remaining-count").inner_text()
        print(f"Card level badge: {badge}, Remaining count: {rem_count}")
        assert badge == "HSK 5", f"Expected HSK 5 badge, got {badge}"
        assert rem_count == "1579", f"Expected remaining count 1579, got {rem_count}"
        
        # Capture screenshot front
        front_path = f"{ARTIFACT_DIR}/hsk5_card_front.png"
        page.screenshot(path=front_path)
        print("Saved front screenshot to", front_path)
        
        # 5. Flip card
        page.locator("#flashcard").click()
        time.sleep(0.5)
        
        pinyin = page.locator("#card-pinyin").inner_text()
        meaning = page.locator("#card-meaning").inner_text()
        meaning_en = page.locator("#card-meaning-en").inner_text()
        print(f"Back side -> Pinyin: '{pinyin}', Meaning TH: '{meaning}', Meaning EN: '{meaning_en}'")
        assert len(pinyin) > 0 and len(meaning) > 0, "Missing back side content!"
        
        # Capture screenshot back
        back_path = f"{ARTIFACT_DIR}/hsk5_card_back.png"
        page.screenshot(path=back_path)
        print("Saved back screenshot to", back_path)
        
        # 6. Click Next
        page.locator("#btn-next").click()
        time.sleep(0.5)
        
        next_badge = page.locator("#card-level").inner_text()
        print(f"Next card level badge: {next_badge}")
        assert next_badge == "HSK 5"
        
        next_rem_count = page.locator("#remaining-count").inner_text()
        print(f"Remaining count after Next: {next_rem_count}")
        
        # Also check dark theme toggle
        page.locator("#btn-global-theme").click()
        time.sleep(0.3)
        dark_path = f"{ARTIFACT_DIR}/hsk5_dark_theme.png"
        page.screenshot(path=dark_path)
        print("Saved dark theme screenshot to", dark_path)
        
        browser.close()
        print("All automated verification steps PASSED successfully!")

if __name__ == "__main__":
    verify()

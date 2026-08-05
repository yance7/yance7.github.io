"""Playwright UI test for Yance Personal Website."""
import json
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8080"
PAGES = [
    ("home", "index.html"),
    ("academics", "academics.html"),
    ("honors", "honors.html"),
    ("research", "research.html"),
    ("works", "works.html"),
    ("concerts", "concerts.html"),
    ("404", "404.html"),
]

results = {}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})

    for name, path in PAGES:
        page = context.new_page()
        console_errors = []
        page_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        try:
            page.goto(f"{BASE}/{path}", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(1500)

            # Check if #app has content
            app_html = page.evaluate("document.querySelector('#app')?.innerHTML?.length || 0")
            # Check for visible content
            body_text = page.evaluate("document.body.innerText.slice(0, 200)")
            # Check for horizontal overflow
            has_overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
            # Take screenshot
            page.screenshot(path=f"y:/Personal Website/test-screenshots/{name}-desktop.png", full_page=True)

            results[name] = {
                "status": "ok",
                "app_content_length": app_html,
                "body_text_preview": body_text[:100],
                "has_horizontal_overflow": has_overflow,
                "console_errors": console_errors[:5],
                "page_errors": page_errors[:3],
            }
        except Exception as e:
            results[name] = {"status": "error", "error": str(e), "console_errors": console_errors[:5], "page_errors": page_errors[:3]}
        finally:
            page.close()

    # Mobile test (375px)
    mobile_context = browser.new_context(viewport={"width": 375, "height": 812})
    for name, path in [("home", "index.html"), ("concerts", "concerts.html"), ("honors", "honors.html")]:
        page = mobile_context.new_page()
        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)
        try:
            page.goto(f"{BASE}/{path}", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(1500)
            has_overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
            page.screenshot(path=f"y:/Personal Website/test-screenshots/{name}-mobile.png", full_page=True)
            results[f"{name}_mobile"] = {
                "status": "ok",
                "has_horizontal_overflow": has_overflow,
                "console_errors": console_errors[:5],
            }
        except Exception as e:
            results[f"{name}_mobile"] = {"status": "error", "error": str(e)}
        finally:
            page.close()

    # Interaction test: concerts lightbox & carousel
    page = context.new_page()
    console_errors = []
    page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)
    try:
        page.goto(f"{BASE}/concerts.html", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(2000)

        # Test carousel: find a concert with multiple images (张艺兴)
        carousel_buttons = page.locator(".carousel-controls button").all()
        carousel_count = len(carousel_buttons)
        if carousel_count >= 2:
            # Click next button
            carousel_buttons[1].click()
            page.wait_for_timeout(500)
            carousel_text_after = page.locator(".carousel-controls span").first.inner_text()
        else:
            carousel_text_after = "no carousel found"

        # Test lightbox: click first concert image
        first_img = page.locator(".concert-poster img").first
        first_img.click()
        page.wait_for_timeout(800)
        lightbox_visible = page.locator(".lightbox").count() > 0 and page.locator(".lightbox").is_visible()
        if lightbox_visible:
            # Test lightbox navigation
            lb_buttons = page.locator(".lightbox button").all()
            lb_button_count = len(lb_buttons)
            # Close lightbox
            page.keyboard.press("Escape")
            page.wait_for_timeout(500)
            lightbox_closed = page.locator(".lightbox").count() == 0
        else:
            lb_button_count = 0
            lightbox_closed = "n/a"

        # Test mobile nav toggle
        page.set_viewport_size({"width": 375, "height": 812})
        page.wait_for_timeout(500)
        menu_btn = page.locator(".menu-trigger")
        menu_visible = menu_btn.is_visible()
        if menu_visible:
            menu_btn.click()
            page.wait_for_timeout(500)
            nav_open = page.locator(".nav-rail").is_visible()
        else:
            nav_open = "menu not visible"

        results["interactions"] = {
            "status": "ok",
            "carousel_buttons_found": carousel_count,
            "carousel_text_after_click": carousel_text_after,
            "lightbox_opened": lightbox_visible,
            "lightbox_button_count": lb_button_count,
            "lightbox_closed_on_esc": lightbox_closed,
            "mobile_menu_visible": menu_visible,
            "mobile_nav_opened_on_click": nav_open,
            "console_errors": console_errors[:5],
        }
    except Exception as e:
        results["interactions"] = {"status": "error", "error": str(e), "console_errors": console_errors[:5]}
    finally:
        page.close()

    browser.close()

print(json.dumps(results, indent=2, ensure_ascii=False))

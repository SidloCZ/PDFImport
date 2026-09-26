import os
import time
from PIL import Image, ImageDraw, ImageFont
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(REPO_ROOT, "assets")
SCREENSHOTS_DIR = os.path.join(ASSETS_DIR, "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

def generate_promo_tile():
    """Generates a clean, neo-brutalist 440x280 promo tile for Chrome Web Store."""
    width, height = 440, 280
    img = Image.new("RGB", (width, height), color="#f4efe6")
    draw = ImageDraw.Draw(img)

    # Outer border (Neo-brutalist 4px black)
    draw.rectangle([6, 6, width - 7, height - 7], outline="#000000", width=4)

    # Accent color bar on top (yellow #ffe600)
    draw.rectangle([10, 10, width - 11, 26], fill="#ffe600")
    draw.line([10, 26, width - 11, 26], fill="#000000", width=2)

    # Window dots (mac/browser style minimalist)
    draw.ellipse([18, 15, 23, 20], fill="#ff2a85", outline="#000000")
    draw.ellipse([28, 15, 33, 20], fill="#ffe600", outline="#000000")
    draw.ellipse([38, 15, 43, 20], fill="#00f59b", outline="#000000")

    # Paste Logo
    logo_path = os.path.join(REPO_ROOT, "icons", "icon128.png")
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert("RGBA")
        logo_resized = logo.resize((96, 96), Image.Resampling.LANCZOS)
        # Neo-brutalist shadow box behind logo
        draw.rectangle([38, 78, 138, 178], fill="#000000")
        draw.rectangle([34, 74, 134, 174], fill="#ffffff", outline="#000000", width=3)
        img.paste(logo_resized, (36, 76), logo_resized)

    # Typography using system sans-serif fonts
    font_title = None
    font_sub = None
    font_badge = None
    
    font_paths = [
        "C:\\Windows\\Fonts\\arialbd.ttf",
        "C:\\Windows\\Fonts\\segoeuib.ttf",
        "C:\\Windows\\Fonts\\tahomabd.ttf"
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            font_title = ImageFont.truetype(fp, 36)
            font_sub = ImageFont.truetype(fp, 15)
            font_badge = ImageFont.truetype(fp, 13)
            break

    if not font_title:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_badge = ImageFont.load_default()

    # Title with neo-brutal shadow
    title_x, title_y = 155, 75
    draw.text((title_x + 2, title_y + 2), "PDFImport", font=font_title, fill="#000000")
    draw.text((title_x, title_y), "PDFImport", font=font_title, fill="#111111")

    # Subtitle badge
    draw.rectangle([title_x + 3, title_y + 48, title_x + 248, title_y + 72], fill="#000000")
    draw.rectangle([title_x, title_y + 45, title_x + 245, title_y + 69], fill="#ffe600", outline="#000000", width=2)
    draw.text((title_x + 10, title_y + 49), "PDF TO AI - FAST IMPORT", font=font_badge, fill="#000000")

    # Features list / badges
    features = [
        ("1-Click Transfer", "#00d2ff"),
        ("Claude - ChatGPT - Gemini - DeepSeek", "#ffffff"),
        ("Local & Web PDFs", "#00f59b")
    ]
    
    fy = 158
    for feat_text, feat_color in features:
        draw.rectangle([title_x + 2, fy + 2, title_x + 247, fy + 24], fill="#000000")
        draw.rectangle([title_x, fy, title_x + 245, fy + 22], fill=feat_color, outline="#000000", width=2)
        draw.text((title_x + 8, fy + 3), feat_text, font=font_badge, fill="#000000")
        fy += 29

    # Bottom bar badge
    draw.rectangle([10, height - 32, width - 11, height - 11], fill="#e5ded3")
    draw.line([10, height - 32, width - 11, height - 32], fill="#000000", width=2)
    draw.text((20, height - 28), "CHROME WEB STORE COMPLIANT - ZERO TRACKING - LOCAL PRIVACY", font=font_badge, fill="#555555")

    out_tile = os.path.join(ASSETS_DIR, "promo_tile_440x280.png")
    img.save(out_tile, format="PNG")
    print(f"Generated promo tile: {out_tile} ({width}x{height} px)")

def capture_screenshots():
    """Captures clean 1280x800 screenshots of the extension pages."""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,800")
    options.add_argument("--hide-scrollbars")
    driver = webdriver.Chrome(options=options)

    try:
        # Options Page
        options_file = os.path.join(REPO_ROOT, "src", "options", "options.html")
        driver.get(f"file:///{options_file.replace(os.sep, '/')}")
        time.sleep(1)
        out_opt = os.path.join(SCREENSHOTS_DIR, "screenshot_options_1280x800.png")
        driver.save_screenshot(out_opt)
        print(f"Captured screenshot: {out_opt}")

        # Large PDF Dialog
        dialog_file = os.path.join(REPO_ROOT, "src", "dialog", "large_pdf_dialog.html")
        driver.get(f"file:///{dialog_file.replace(os.sep, '/')}")
        time.sleep(1)
        out_dlg = os.path.join(SCREENSHOTS_DIR, "screenshot_dialog_1280x800.png")
        driver.save_screenshot(out_dlg)
        print(f"Captured screenshot: {out_dlg}")

    finally:
        driver.quit()

if __name__ == "__main__":
    generate_promo_tile()
    capture_screenshots()

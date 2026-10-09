import os
import time
from PIL import Image, ImageDraw, ImageFont
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(REPO_ROOT, "assets")
SCREENSHOTS_DIR = os.path.join(ASSETS_DIR, "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

def _load_promo_fonts(title_size, body_size, small_size):
    font_paths = [
        "C:\\Windows\\Fonts\\segoeuib.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf",
        "C:\\Windows\\Fonts\\tahomabd.ttf"
    ]
    for font_path in font_paths:
        if os.path.exists(font_path):
            return (
                ImageFont.truetype(font_path, title_size),
                ImageFont.truetype(font_path, body_size),
                ImageFont.truetype(font_path, small_size)
            )
    fallback = ImageFont.load_default()
    return fallback, fallback, fallback


def _paste_logo(draw, image, x, y, size, border_width):
    logo_path = os.path.join(REPO_ROOT, "icons", "icon128.png")
    if not os.path.exists(logo_path):
        return
    logo = Image.open(logo_path).convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
    draw.rectangle([x + border_width, y + border_width, x + size + border_width, y + size + border_width], fill="#000000")
    draw.rectangle([x, y, x + size, y + size], fill="#ffffff", outline="#000000", width=border_width)
    image.paste(logo, (x, y), logo)


def generate_promo_tiles(language):
    """Generates localized store tiles at the exact Partner Center dimensions."""
    copy = {
        "cs": {
            "title": "PDF TO AI",
            "badge": "FAST IMPORT",
            "headline": "Připojte PDF k AI chatu bez ručního stahování",
            "features": ["Jedno kliknutí nebo Alt+G", "Online i místní PDF soubory", "Komprese a extrakce textu", "Zpracování přímo v prohlížeči"],
            "small_badges": ["PDF do AI jedním kliknutím", "Online i místní PDF", "Bez ručního stahování"],
            "footer": "LOKÁLNÍ ZPRACOVÁNÍ · BEZ ANALYTIKY · BEZ VLASTNÍCH SERVERŮ",
            "small_footer": "LOKÁLNÍ ZPRACOVÁNÍ · BEZ SLEDOVÁNÍ"
        },
        "en": {
            "title": "PDF TO AI",
            "badge": "FAST IMPORT",
            "headline": "Attach PDFs to AI chat without manual downloading",
            "features": ["One click or Alt+G", "Online and local PDF files", "Compression and text extraction", "Processing in your browser"],
            "small_badges": ["Send PDFs to AI in one click", "Online and local PDFs", "No manual downloading"],
            "footer": "LOCAL PROCESSING · NO ANALYTICS · NO PRIVATE SERVERS",
            "small_footer": "LOCAL PROCESSING · NO TRACKING"
        }
    }[language]
    font_title, font_body, font_small = _load_promo_fonts(36, 17, 13)

    width, height = 440, 280
    image = Image.new("RGB", (width, height), color="#f4efe6")
    draw = ImageDraw.Draw(image)
    draw.rectangle([6, 6, width - 7, height - 7], outline="#000000", width=4)
    draw.rectangle([10, 10, width - 11, 26], fill="#ffe600")
    draw.line([10, 26, width - 11, 26], fill="#000000", width=2)
    for x, color in [(18, "#ff2a85"), (28, "#ffe600"), (38, "#00f59b")]:
        draw.ellipse([x, 15, x + 5, 20], fill=color, outline="#000000")

    _paste_logo(draw, image, 34, 74, 100, 3)
    draw.text((155, 73), copy["title"], font=font_title, fill="#111111")
    draw.rectangle([155, 120, 400, 147], fill="#ffe600", outline="#000000", width=2)
    draw.text((165, 125), copy["badge"], font=font_small, fill="#000000")
    badges = list(zip(copy["small_badges"], ["#00d2ff", "#00f59b", "#ffffff"]))
    for index, (label, color) in enumerate(badges):
        y = 158 + index * 29
        draw.rectangle([157, y + 2, 402, y + 24], fill="#000000")
        draw.rectangle([155, y, 400, y + 22], fill=color, outline="#000000", width=2)
        draw.text((163, y + 3), label, font=font_small, fill="#000000")
    draw.rectangle([10, height - 32, width - 11, height - 11], fill="#e5ded3")
    draw.line([10, height - 32, width - 11, height - 32], fill="#000000", width=2)
    draw.text((20, height - 28), copy["small_footer"], font=font_small, fill="#555555")
    small_path = os.path.join(ASSETS_DIR, f"promo_tile_{language}_440x280.png")
    image.save(small_path, format="PNG")

    width, height = 1400, 560
    image = Image.new("RGB", (width, height), color="#f4efe6")
    draw = ImageDraw.Draw(image)
    draw.rectangle([12, 12, width - 13, height - 13], outline="#000000", width=6)
    draw.rectangle([20, 20, width - 21, 48], fill="#ffe600")
    draw.line([20, 48, width - 21, 48], fill="#000000", width=3)
    for x, color in [(34, "#ff2a85"), (52, "#ffe600"), (70, "#00f59b")]:
        draw.ellipse([x, 28, x + 9, 37], fill=color, outline="#000000")

    _paste_logo(draw, image, 95, 130, 250, 6)
    title_font, body_font, small_font = _load_promo_fonts(76, 31, 24)
    draw.text((420, 122), copy["title"], font=title_font, fill="#111111")
    draw.rectangle([424, 225, 845, 275], fill="#ffe600", outline="#000000", width=3)
    draw.text((443, 236), copy["badge"], font=body_font, fill="#000000")
    draw.text((420, 315), copy["headline"], font=body_font, fill="#111111")
    features = list(zip(copy["features"], ["#00d2ff", "#00f59b", "#ffffff", "#ffe600"]))
    for index, (label, color) in enumerate(features):
        x = 420 + (index % 2) * 425
        y = 380 + (index // 2) * 62
        draw.rectangle([x + 4, y + 4, x + 390, y + 45], fill="#000000")
        draw.rectangle([x, y, x + 386, y + 41], fill=color, outline="#000000", width=3)
        draw.text((x + 16, y + 8), label, font=small_font, fill="#000000")
    draw.rectangle([20, height - 64, width - 21, height - 21], fill="#e5ded3")
    draw.line([20, height - 64, width - 21, height - 64], fill="#000000", width=3)
    draw.text((42, height - 55), copy["footer"], font=small_font, fill="#555555")
    large_path = os.path.join(ASSETS_DIR, f"promo_tile_{language}_1400x560.png")
    image.save(large_path, format="PNG")
    print(f"Generated {language} promo tile: {small_path} (440x280 px)")
    print(f"Generated {language} promo tile: {large_path} (1400x560 px)")


def generate_czech_promo_tiles():
    generate_promo_tiles("cs")


def generate_english_promo_tiles():
    generate_promo_tiles("en")


def generate_opera_tile():
    """Generates the Opera add-ons promotional tile at its required dimensions."""
    width, height = 300, 188
    font_title, font_body, font_small = _load_promo_fonts(24, 13, 10)
    image = Image.new("RGB", (width, height), color="#f4efe6")
    draw = ImageDraw.Draw(image)
    draw.rectangle([5, 5, width - 6, height - 6], outline="#000000", width=3)
    draw.rectangle([8, 8, width - 9, 22], fill="#ffe600")
    draw.line([8, 22, width - 9, 22], fill="#000000", width=2)
    for x, color in [(15, "#ff2a85"), (24, "#ffe600"), (33, "#00f59b")]:
        draw.ellipse([x, 13, x + 4, 17], fill=color, outline="#000000")

    _paste_logo(draw, image, 22, 42, 64, 2)
    draw.text((101, 43), "PDF TO AI", font=font_title, fill="#111111")
    draw.rectangle([101, 75, 266, 96], fill="#ffe600", outline="#000000", width=2)
    draw.text((110, 79), "FAST IMPORT", font=font_small, fill="#000000")
    draw.text((22, 111), "Attach PDFs to AI chat", font=font_body, fill="#111111")
    draw.text((22, 128), "without manual downloading", font=font_body, fill="#111111")

    draw.rectangle([22, 151, 137, 171], fill="#00d2ff", outline="#000000", width=2)
    draw.text((30, 155), "ONE CLICK", font=font_small, fill="#000000")
    draw.rectangle([145, 151, 266, 171], fill="#00f59b", outline="#000000", width=2)
    draw.text((153, 155), "LOCAL PROCESSING", font=font_small, fill="#000000")

    output_path = os.path.join(ASSETS_DIR, "promo_tile_opera_300x188.png")
    image.save(output_path, format="PNG")
    print(f"Generated Opera promo tile: {output_path} (300x188 px)")

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

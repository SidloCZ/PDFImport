import os
import re
from PIL import Image, ImageFilter

SVG_SOURCE = "PDFImport logo v3.svg"
OUTPUT_DIR = "icons"
SIZES = [16, 32, 48, 128]

def create_centered_svg():
    """Generates a balanced, centered vector SVG in icons/icon.svg."""
    if not os.path.exists(SVG_SOURCE):
        raise FileNotFoundError(f"{SVG_SOURCE} not found!")

    with open(SVG_SOURCE, "r", encoding="utf-8") as f:
        svg_content = f.read()

    paths = re.findall(r"<path[^>]+>", svg_content)
    fg_paths = paths[1:]  # Exclude raw background path

    header = (
        '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" '
        'viewBox="0 0 2048 2048" width="2048" height="2048">\n'
        '<rect width="100%" height="100%" fill="rgb(231,192,117)"/>\n'
        '<g transform="translate(1024, 1024) scale(0.95) translate(-1025, -865)">\n'
    )
    footer = "\n</g>\n</svg>"
    centered_svg = header + "\n".join(fg_paths) + footer

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_svg_path = os.path.join(OUTPUT_DIR, "icon.svg")
    with open(out_svg_path, "w", encoding="utf-8") as f:
        f.write(centered_svg)
    print(f"Generated {out_svg_path}")
    return out_svg_path

def render_png_icons(svg_path):
    """Renders the SVG at high resolution using headless Chrome/Selenium and resizes."""
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options

    options = Options()
    options.add_argument("--headless")
    options.add_argument("--window-size=2048,2048")
    options.add_argument("--hide-scrollbars")
    driver = webdriver.Chrome(options=options)

    abs_svg_url = f"file:///{os.path.abspath(svg_path).replace(os.sep, '/')}"
    driver.get(abs_svg_url)

    high_res_tmp = os.path.join(OUTPUT_DIR, "_tmp_render2048.png")
    driver.save_screenshot(high_res_tmp)
    driver.quit()

    high_img = Image.open(high_res_tmp).convert("RGB")

    for s in SIZES:
        icon = high_img.resize((s, s), Image.Resampling.LANCZOS)
        if s == 16:
            icon = icon.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=3))
        out_path = os.path.join(OUTPUT_DIR, f"icon{s}.png")
        icon.save(out_path, format="PNG")
        print(f"Generated {out_path} ({s}x{s} px)")

    if os.path.exists(high_res_tmp):
        os.remove(high_res_tmp)

if __name__ == "__main__":
    svg_file = create_centered_svg()
    render_png_icons(svg_file)

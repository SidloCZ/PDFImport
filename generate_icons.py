import math
from PIL import Image, ImageDraw

def render_icon(target_size):
    # 4x Supersampling pro dokonale hladké a ostré křivky
    scale = 4
    size = target_size * scale
    s = size / 128.0

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Barva 1: Černé zaoblené pozadí
    pad = int(4 * s)
    radius = int(26 * s)
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        fill=(0, 0, 0, 255)
    )

    WHITE = (255, 255, 255, 255)

    # 2. SOUBOR (levá strana)
    fx = int(16 * s)
    fy = int(20 * s)
    fw = int(42 * s)
    fh = int(88 * s)
    fold = int(14 * s)

    # Obrys souboru
    pts = [
        (fx, fy),
        (fx + fw - fold, fy),
        (fx + fw, fy + fold),
        (fx + fw, fy + fh),
        (fx, fy + fh)
    ]
    draw.polygon(pts, fill=(0, 0, 0, 255), outline=WHITE, width=max(1, int(6 * s)))
    draw.line([fx + fw - fold, fy, fx + fw - fold, fy + fold], fill=WHITE, width=max(1, int(6 * s)))
    draw.line([fx + fw - fold, fy + fold, fx + fw, fy + fold], fill=WHITE, width=max(1, int(6 * s)))

    # Linky textu
    if target_size >= 32:
        draw.line([fx + int(8 * s), fy + int(36 * s), fx + int(24 * s), fy + int(36 * s)], fill=WHITE, width=max(1, int(5.5 * s)))
        draw.line([fx + int(8 * s), fy + int(52 * s), fx + int(30 * s), fy + int(52 * s)], fill=WHITE, width=max(1, int(5.5 * s)))
        draw.line([fx + int(8 * s), fy + int(68 * s), fx + int(20 * s), fy + int(68 * s)], fill=WHITE, width=max(1, int(5.5 * s)))
    else:
        draw.line([fx + int(7 * s), fy + int(46 * s), fx + int(26 * s), fy + int(46 * s)], fill=WHITE, width=max(1, int(6 * s)))

    # 3. SPEED ARROW (střed) - Přesně podle reference
    head_x1 = int(77 * s)
    head_x2 = int(96 * s)
    head_y_mid = int(64 * s)
    head_y1 = int(46 * s)
    head_y2 = int(82 * s)

    # Trojúhelník šipky + hlavní tělo
    shaft_x1 = int(66 * s)
    shaft_y1 = int(55 * s)
    shaft_y2 = int(73 * s)
    
    # Kreslení těla a hrotu
    draw.rectangle([shaft_x1, shaft_y1, head_x1, shaft_y2], fill=WHITE)
    draw.polygon([(head_x1, head_y1), (head_x2, head_y_mid), (head_x1, head_y2)], fill=WHITE)

    # Speed stopy (motion dashes na levé straně)
    dash_h = max(2, int(5 * s))
    dash_r = dash_h // 2

    # Řádek 1 (horní)
    draw.rounded_rectangle([int(50 * s), int(51 * s), int(61 * s), int(51 * s) + dash_h], radius=dash_r, fill=WHITE)
    # Řádek 2
    draw.rounded_rectangle([int(43 * s), int(57.5 * s), int(62 * s), int(57.5 * s) + dash_h], radius=dash_r, fill=WHITE)
    # Řádek 3
    draw.rounded_rectangle([int(51 * s), int(64 * s), int(63 * s), int(64 * s) + dash_h], radius=dash_r, fill=WHITE)
    # Řádek 4 (dolní)
    draw.rounded_rectangle([int(46 * s), int(70.5 * s), int(60 * s), int(70.5 * s) + dash_h], radius=dash_r, fill=WHITE)

    # 4. AI SPARKLE (pravá strana)
    star_cx = int(111 * s)
    star_cy = int(64 * s)
    star_r = 16 * s

    star_pts = []
    n = 32
    for i in range(n):
        angle = i * (2 * math.pi / n)
        px = star_cx + star_r * (math.cos(angle) ** 3)
        py = star_cy + star_r * (math.sin(angle) ** 3)
        star_pts.append((px, py))
    draw.polygon(star_pts, fill=WHITE)

    # Zmenšení zpět pomocí Lanczos filtru
    return img.resize((target_size, target_size), Image.Resampling.LANCZOS)

for s in [16, 48, 128]:
    icon = render_icon(s)
    icon.save(f"icons/icon{s}.png")
    print(f"Rendered Speed Arrow icon: icons/icon{s}.png")

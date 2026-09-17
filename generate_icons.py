import math
from PIL import Image, ImageDraw

def render_icon(target_size):
    # 4x Supersampling pro dokonale hladké křivky
    scale = 4
    size = target_size * scale
    s = size / 128.0

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Černé zaoblené pozadí
    pad = int(4 * s)
    radius = int(26 * s)
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        fill=(0, 0, 0, 255)
    )

    WHITE = (255, 255, 255, 255)

    # 2. SOUBOR (menší a elegantnější, x: 15 až 43, y: 36 až 92)
    fx = int(15 * s)
    fy = int(36 * s)
    fw = int(28 * s)
    fh = int(56 * s)
    fold = int(9 * s)

    stroke_w = max(1, int(4.5 * s))

    pts = [
        (fx, fy),
        (fx + fw - fold, fy),
        (fx + fw, fy + fold),
        (fx + fw, fy + fh),
        (fx, fy + fh)
    ]
    draw.polygon(pts, fill=(0, 0, 0, 255), outline=WHITE, width=stroke_w)
    draw.line([fx + fw - fold, fy, fx + fw - fold, fy + fold], fill=WHITE, width=stroke_w)
    draw.line([fx + fw - fold, fy + fold, fx + fw, fy + fold], fill=WHITE, width=stroke_w)

    # Text linky
    if target_size >= 32:
        draw.line([fx + int(6 * s), fy + int(24 * s), fx + int(18 * s), fy + int(24 * s)], fill=WHITE, width=max(1, int(4 * s)))
        draw.line([fx + int(6 * s), fy + int(38 * s), fx + int(22 * s), fy + int(38 * s)], fill=WHITE, width=max(1, int(4 * s)))
    else:
        draw.line([fx + int(5 * s), fy + int(30 * s), fx + int(19 * s), fy + int(30 * s)], fill=WHITE, width=max(1, int(4.5 * s)))

    # 3. SPEED ARROW (střed, x: 48 až 88 - čistý odstup od souboru i hvězdy)
    head_x1 = int(74 * s)
    head_x2 = int(88 * s)
    head_y_mid = int(64 * s)
    head_y1 = int(52 * s)
    head_y2 = int(76 * s)

    shaft_x1 = int(64 * s)
    shaft_y1 = int(58 * s)
    shaft_y2 = int(70 * s)

    # Tělo a hrot šipky
    draw.rectangle([shaft_x1, shaft_y1, head_x1, shaft_y2], fill=WHITE)
    draw.polygon([(head_x1, head_y1), (head_x2, head_y_mid), (head_x1, head_y2)], fill=WHITE)

    # Speed motion proužky
    dash_h = max(2, int(4 * s))
    dash_r = dash_h // 2

    # Řádek 1
    draw.rounded_rectangle([int(52 * s), int(55 * s), int(60 * s), int(55 * s) + dash_h], radius=dash_r, fill=WHITE)
    # Řádek 2
    draw.rounded_rectangle([int(47 * s), int(60.5 * s), int(59 * s), int(60.5 * s) + dash_h], radius=dash_r, fill=WHITE)
    # Řádek 3
    draw.rounded_rectangle([int(53 * s), int(66 * s), int(61 * s), int(66 * s) + dash_h], radius=dash_r, fill=WHITE)
    # Řádek 4
    draw.rounded_rectangle([int(48 * s), int(71.5 * s), int(58 * s), int(71.5 * s) + dash_h], radius=dash_r, fill=WHITE)

    # 4. AI SPARKLE (pravá strana, střed x: 110, y: 64, radius: 14)
    star_cx = int(110 * s)
    star_cy = int(64 * s)
    star_r = 14 * s

    star_pts = []
    n = 32
    for i in range(n):
        angle = i * (2 * math.pi / n)
        px = star_cx + star_r * (math.cos(angle) ** 3)
        py = star_cy + star_r * (math.sin(angle) ** 3)
        star_pts.append((px, py))
    draw.polygon(star_pts, fill=WHITE)

    return img.resize((target_size, target_size), Image.Resampling.LANCZOS)

for s in [16, 48, 128]:
    icon = render_icon(s)
    icon.save(f"icons/icon{s}.png")
    print(f"Rendered clean non-overlapping icon: icons/icon{s}.png")

import math
from PIL import Image, ImageDraw

def render_icon(target_size):
    # Supersampling 4x pro dokonale hladké a ostré hrany
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

    # 2. Barva 2: Čistě bílá grafika (File -> Arrow -> Sparkle)
    WHITE = (255, 255, 255, 255)

    # SOUBOR
    fx = int(18 * s)
    fy = int(22 * s)
    fw = int(46 * s)
    fh = int(84 * s)
    fold = int(16 * s)

    # Obrys dokumentu
    pts = [
        (fx, fy),
        (fx + fw - fold, fy),
        (fx + fw, fy + fold),
        (fx + fw, fy + fh),
        (fx, fy + fh)
    ]
    draw.polygon(pts, fill=(0, 0, 0, 255), outline=WHITE, width=max(1, int(6.5 * s)))
    
    # Zahnutý roh
    draw.line([fx + fw - fold, fy, fx + fw - fold, fy + fold], fill=WHITE, width=max(1, int(6.5 * s)))
    draw.line([fx + fw - fold, fy + fold, fx + fw, fy + fold], fill=WHITE, width=max(1, int(6.5 * s)))

    # Vodorovné linky textu uvnitř dokumentu
    if target_size >= 32:
        draw.line([fx + int(10 * s), fy + int(36 * s), fx + int(28 * s), fy + int(36 * s)], fill=WHITE, width=max(1, int(6 * s)))
        draw.line([fx + int(10 * s), fy + int(52 * s), fx + int(34 * s), fy + int(52 * s)], fill=WHITE, width=max(1, int(6 * s)))
        draw.line([fx + int(10 * s), fy + int(68 * s), fx + int(22 * s), fy + int(68 * s)], fill=WHITE, width=max(1, int(6 * s)))
    else:
        # Pro 16x16 zjednodušená jedna linka
        draw.line([fx + int(8 * s), fy + int(46 * s), fx + int(32 * s), fy + int(46 * s)], fill=WHITE, width=max(1, int(7 * s)))

    # ŠIPKA (střed)
    ax1 = int(72 * s)
    ax2 = int(88 * s)
    ay = int(64 * s)
    draw.line([ax1, ay, ax2, ay], fill=WHITE, width=max(1, int(6 * s)))
    head = int(8 * s)
    draw.line([ax2 - head, ay - head, ax2, ay], fill=WHITE, width=max(1, int(6 * s)))
    draw.line([ax2 - head, ay + head, ax2, ay], fill=WHITE, width=max(1, int(6 * s)))

    # AI SPARKLE (pravá strana)
    star_cx = int(108 * s)
    star_cy = int(64 * s)
    star_r = 18 * s

    star_pts = []
    n = 32
    for i in range(n):
        angle = i * (2 * math.pi / n)
        px = star_cx + star_r * (math.cos(angle) ** 3)
        py = star_cy + star_r * (math.sin(angle) ** 3)
        star_pts.append((px, py))
    draw.polygon(star_pts, fill=WHITE)

    # Zmenšení zpět s vyhlazením Lanczos
    res = img.resize((target_size, target_size), Image.Resampling.LANCZOS)
    return res

for s in [16, 48, 128]:
    icon = render_icon(s)
    icon.save(f"icons/icon{s}.png")
    print(f"Rendered 2-color icon: icons/icon{s}.png")

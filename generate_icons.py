from PIL import Image, ImageDraw

def render_icon(target_size):
    # 4x Supersampling pro dokonale hladké hrany
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
    CYAN = (0, 210, 255, 255)

    # 2. SOUBOR (bílý, levá strana, x: 16 až 44, y: 31 až 96)
    fx = int(16 * s)
    fy = int(32 * s)
    fw = int(28 * s)
    fh = int(62 * s)
    fold = int(10 * s)
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

    # Textové linky uvnitř souboru
    if target_size >= 32:
        draw.line([fx + int(6 * s), fy + int(24 * s), fx + int(18 * s), fy + int(24 * s)], fill=WHITE, width=max(1, int(4 * s)))
        draw.line([fx + int(6 * s), fy + int(40 * s), fx + int(22 * s), fy + int(40 * s)], fill=WHITE, width=max(1, int(4 * s)))
    else:
        draw.line([fx + int(5 * s), fy + int(32 * s), fx + int(20 * s), fy + int(32 * s)], fill=WHITE, width=max(1, int(4.5 * s)))

    # 3. SPEED ARROW (barevná - azurová/cyan, střed, x: 46 až 88)
    head_x1 = int(72 * s)
    head_x2 = int(88 * s)
    head_y_mid = int(64 * s)
    head_y1 = int(50 * s)
    head_y2 = int(78 * s)

    shaft_x1 = int(60 * s)
    shaft_y1 = int(58 * s)
    shaft_y2 = int(70 * s)

    # Tělo a hrot šipky
    draw.rectangle([shaft_x1, shaft_y1, head_x1, shaft_y2], fill=CYAN)
    draw.polygon([(head_x1, head_y1), (head_x2, head_y_mid), (head_x1, head_y2)], fill=CYAN)

    # 3 aerodynamické pruhy na levé straně
    dash_h = max(2, int(4 * s))
    dash_r = dash_h // 2

    # Horní pruh
    draw.rounded_rectangle([int(52 * s), int(53 * s), int(61 * s), int(53 * s) + dash_h], radius=dash_r, fill=CYAN)
    # Střední pruh
    draw.rounded_rectangle([int(46 * s), int(62 * s), int(58 * s), int(62 * s) + dash_h], radius=dash_r, fill=CYAN)
    # Dolní pruh
    draw.rounded_rectangle([int(52 * s), int(71 * s), int(61 * s), int(71 * s) + dash_h], radius=dash_r, fill=CYAN)

    # 4. TEXT "AI" (bílý, pravá strana, x: 92 až 118, y: 50 až 78)
    letter_w = max(1, int(5.5 * s))

    # Písmeno A
    draw.line([(int(93 * s), int(77 * s)), (int(100 * s), int(51 * s))], fill=WHITE, width=letter_w)
    draw.line([(int(100 * s), int(51 * s)), (int(107 * s), int(77 * s))], fill=WHITE, width=letter_w)
    draw.line([(int(95.5 * s), int(69 * s)), (int(104.5 * s), int(69 * s))], fill=WHITE, width=max(1, int(4.5 * s)))

    # Písmeno I
    draw.line([(int(114 * s), int(51 * s)), (int(114 * s), int(77 * s))], fill=WHITE, width=letter_w)

    return img.resize((target_size, target_size), Image.Resampling.LANCZOS)

for s in [16, 48, 128]:
    icon = render_icon(s)
    icon.save(f"icons/icon{s}.png")
    print(f"Rendered icon with Cyan Speed Arrow and AI text: icons/icon{s}.png")

import math
from PIL import Image, ImageDraw

def create_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    scale = size / 128.0

    # 1. Background plate
    pad = int(3 * scale)
    r = int(24 * scale)
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=r,
        fill=(15, 23, 42, 255),
        outline=(51, 65, 85, 255),
        width=max(1, int(2 * scale))
    )

    # 2. File document on left (soubor)
    doc_x = int(14 * scale)
    doc_y = int(24 * scale)
    doc_w = int(36 * scale)
    doc_h = int(80 * scale)
    fold_s = int(12 * scale)

    # File polygon with folded top-right corner
    file_points = [
        (doc_x, doc_y),
        (doc_x + doc_w - fold_s, doc_y),
        (doc_x + doc_w, doc_y + fold_s),
        (doc_x + doc_w, doc_y + doc_h),
        (doc_x, doc_y + doc_h)
    ]
    draw.polygon(file_points, fill=(30, 41, 59, 255), outline=(226, 232, 240, 255))
    draw.polygon(
        [
            (doc_x + doc_w - fold_s, doc_y),
            (doc_x + doc_w - fold_s, doc_y + fold_s),
            (doc_x + doc_w, doc_y + fold_s)
        ],
        fill=(51, 65, 85, 255),
        outline=(226, 232, 240, 255)
    )

    if size >= 32:
        # File text lines
        line_w = max(1, int(2.5 * scale))
        draw.line([doc_x + int(6 * scale), doc_y + int(28 * scale), doc_x + int(24 * scale), doc_y + int(28 * scale)], fill=(56, 189, 248, 255), width=line_w)
        draw.line([doc_x + int(6 * scale), doc_y + int(42 * scale), doc_x + int(28 * scale), doc_y + int(42 * scale)], fill=(148, 163, 184, 255), width=line_w)
        draw.line([doc_x + int(6 * scale), doc_y + int(56 * scale), doc_x + int(20 * scale), doc_y + int(56 * scale)], fill=(148, 163, 184, 255), width=line_w)

    # 3. Arrow in middle ( -> )
    arrow_y = int(64 * scale)
    arrow_x1 = int(58 * scale)
    arrow_x2 = int(74 * scale)
    arrow_w = max(1, int(3.5 * scale))
    draw.line([arrow_x1, arrow_y, arrow_x2, arrow_y], fill=(56, 189, 248, 255), width=arrow_w)
    
    head_len = int(6 * scale)
    draw.line([arrow_x2 - head_len, arrow_y - head_len, arrow_x2, arrow_y], fill=(56, 189, 248, 255), width=arrow_w)
    draw.line([arrow_x2 - head_len, arrow_y + head_len, arrow_x2, arrow_y], fill=(56, 189, 248, 255), width=arrow_w)

    # 4. AI Sparkle Star on right (AI)
    star_cx = int(100 * scale)
    star_cy = int(64 * scale)
    star_r = 26 * scale

    points = []
    num_pts = 32
    for i in range(num_pts):
        angle = i * (2 * math.pi / num_pts)
        px = star_cx + star_r * (math.cos(angle) ** 3)
        py = star_cy + star_r * (math.sin(angle) ** 3)
        points.append((px, py))
    draw.polygon(points, fill=(168, 85, 247, 255))

    # Inner bright star
    inner_pts = []
    for i in range(num_pts):
        angle = i * (2 * math.pi / num_pts)
        px = star_cx + (star_r * 0.55) * (math.cos(angle) ** 3)
        py = star_cy + (star_r * 0.55) * (math.sin(angle) ** 3)
        inner_pts.append((px, py))
    draw.polygon(inner_pts, fill=(236, 72, 153, 255))

    # Center bright dot
    dot_r = max(1, int(2.5 * scale))
    draw.ellipse([star_cx - dot_r, star_cy - dot_r, star_cx + dot_r, star_cy + dot_r], fill=(255, 255, 255, 255))

    return img

for s in [16, 48, 128]:
    icon = create_icon(s)
    icon.save(f"icons/icon{s}.png")
    print(f"Generated icons/icon{s}.png")

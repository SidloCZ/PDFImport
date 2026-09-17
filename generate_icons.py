import math
from PIL import Image, ImageDraw, ImageFont

def create_icon(size):
    # Create RGBA canvas
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    scale = size / 128.0
    
    # Background squircle
    pad = int(4 * scale)
    radius = int(24 * scale)
    draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=radius, fill=(28, 30, 34, 255), outline=(50, 52, 58, 255), width=max(1, int(2 * scale)))
    
    # PDF document shape (left-top)
    doc_left = int(20 * scale)
    doc_top = int(18 * scale)
    doc_right = int(76 * scale)
    doc_bottom = int(106 * scale)
    doc_r = int(6 * scale)
    draw.rounded_rectangle([doc_left, doc_top, doc_right, doc_bottom], radius=doc_r, fill=(45, 48, 55, 255), outline=(70, 74, 82, 255), width=max(1, int(1.5 * scale)))
    
    # Red PDF badge on document
    badge_l = int(14 * scale)
    badge_t = int(58 * scale)
    badge_r = int(60 * scale)
    badge_b = int(82 * scale)
    draw.rounded_rectangle([badge_l, badge_t, badge_r, badge_b], radius=int(4 * scale), fill=(225, 45, 57, 255))
    
    if size >= 48:
        # Draw "PDF" text lines or simplified bars
        bar_w = int(2 * scale)
        # 3 white lines inside badge if large enough
        draw.line([badge_l + int(6 * scale), badge_t + int(6 * scale), badge_l + int(6 * scale), badge_b - int(6 * scale)], fill=(255, 255, 255, 240), width=max(1, int(2 * scale)))
        draw.line([badge_l + int(14 * scale), badge_t + int(6 * scale), badge_l + int(14 * scale), badge_b - int(6 * scale)], fill=(255, 255, 255, 240), width=max(1, int(2 * scale)))
        draw.line([badge_l + int(22 * scale), badge_t + int(6 * scale), badge_l + int(22 * scale), badge_b - int(6 * scale)], fill=(255, 255, 255, 240), width=max(1, int(2 * scale)))

    # Gemini 4-point sparkle star (bottom-right)
    center_x = int(88 * scale)
    center_y = int(80 * scale)
    outer_r = 32 * scale
    inner_r = 8 * scale
    
    # Draw star polygon using bezier-like interpolation or multi-point polygon
    points = []
    num_points = 32
    for i in range(num_points):
        angle = i * (2 * math.pi / num_points)
        # Astroid shape: r = cos(2*theta) approximation
        # Astroid in polar: x = R * cos^3(t), y = R * sin^3(t)
        px = center_x + outer_r * (math.cos(angle) ** 3)
        py = center_y + outer_r * (math.sin(angle) ** 3)
        points.append((px, py))
        
    draw.polygon(points, fill=(78, 130, 238, 255))
    
    # Inner brighter star
    inner_points = []
    for i in range(num_points):
        angle = i * (2 * math.pi / num_points)
        px = center_x + (outer_r * 0.6) * (math.cos(angle) ** 3)
        py = center_y + (outer_r * 0.6) * (math.sin(angle) ** 3)
        inner_points.append((px, py))
    draw.polygon(inner_points, fill=(175, 120, 245, 255))
    
    # Center white sparkle
    dot_r = max(1, int(3 * scale))
    draw.ellipse([center_x - dot_r, center_y - dot_r, center_x + dot_r, center_y + dot_r], fill=(255, 255, 255, 255))
    
    return img

for s in [16, 48, 128]:
    icon = create_icon(s)
    icon.save(f"icons/icon{s}.png")
    print(f"Generated icons/icon{s}.png")

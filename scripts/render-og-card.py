from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


WIDTH, HEIGHT = 1200, 630
ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / 'public' / 'assets'


def font(size, bold=False, serif=False):
    candidates = []
    if serif:
        candidates.extend([
            r'C:\Windows\Fonts\georgiab.ttf' if bold else r'C:\Windows\Fonts\georgia.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
        ])
    else:
        candidates.extend([
            r'C:\Windows\Fonts\arialbd.ttf' if bold else r'C:\Windows\Fonts\arial.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        ])
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def radial_overlay(size, center, radius, color, max_alpha):
    image = Image.new('RGBA', size, (0, 0, 0, 0))
    pixels = image.load()
    cx, cy = center
    for y in range(max(0, cy - radius), min(size[1], cy + radius)):
        for x in range(max(0, cx - radius), min(size[0], cx + radius)):
            distance = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / radius
            alpha = int(max(0, 1 - distance) ** 1.8 * max_alpha)
            if alpha:
                pixels[x, y] = (*color, alpha)
    return image


def base_card(accent):
    start = (247, 242, 232)
    end = (233, 224, 208)
    base = Image.new('RGB', (WIDTH, HEIGHT), start)
    pixels = base.load()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            amount = (x / WIDTH + y / HEIGHT) / 2
            pixels[x, y] = tuple(int(start[i] * (1 - amount) + end[i] * amount) for i in range(3))

    image = Image.alpha_composite(base.convert('RGBA'), radial_overlay((WIDTH, HEIGHT), (960, 50), 650, accent, 98))
    return Image.alpha_composite(image, radial_overlay((WIDTH, HEIGHT), (145, 560), 590, (198, 151, 78), 72))


def frame(draw, ink, gold, aqua):
    draw.line((74, 92, 1126, 92), fill='#A96F2059', width=1)
    draw.line((74, 538, 1126, 538), fill='#A96F2059', width=1)
    draw.line((74, 92, 74, 538), fill='#1E726D33', width=1)
    draw.line((1126, 92, 1126, 538), fill='#1E726D33', width=1)
    draw.ellipse((934, 82, 1102, 250), outline='#A96F20B3', width=3)
    draw.ellipse((984, 132, 1052, 200), fill=ink)
    draw.ellipse((999, 147, 1013, 161), fill='#F7F2E8')
    draw.line((850, 456, 1086, 456), fill=f'{aqua}55', width=2)


def paste_image(base, path, box):
    if not path.exists():
        return
    left, top, right, bottom = box
    image = Image.open(path).convert('RGB')
    image = ImageOps.fit(image, (right - left, bottom - top), method=Image.Resampling.LANCZOS)
    mask = Image.new('L', image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, image.width - 1, image.height - 1), radius=18, fill=255)
    base.paste(image, (left, top), mask)


def draw_metric_panel(draw, x, y, lines, ink, gold, aqua):
    draw.rounded_rectangle((x, y, x + 340, y + 220), radius=18, fill='#FFFFFF78', outline='#A96F2059', width=2)
    for index, (label, value, color) in enumerate(lines):
        yy = y + 30 + index * 58
        draw.text((x + 24, yy), label, font=font(16), fill='#5A5E66')
        draw.text((x + 190, yy - 5), value, font=font(24, bold=True), fill=color)


def render_card(slug, kicker, title, subtitle, detail, accent, image=None, collage=False):
    base = base_card(accent)
    draw = ImageDraw.Draw(base)
    ink = '#1A1D23'
    gold = '#A96F20'
    aqua = '#1E726D'
    frame(draw, ink, gold, aqua)

    draw.text((110, 140), kicker, font=font(18, bold=True), fill=gold)
    draw.text((104, 175), title, font=font(70, serif=True), fill=ink)
    draw.text((110, 285), subtitle, font=font(25), fill='#5A5E66')
    draw.text((110, 472), detail, font=font(18, bold=True), fill=aqua)

    if image:
        paste_image(base, ASSET_ROOT / image, (735, 270, 1080, 492))
        draw.rounded_rectangle((735, 270, 1080, 492), radius=18, outline=f'{gold}88', width=2)
    elif collage:
        paths = [
            ASSET_ROOT / 'concerts' / 'thumbs' / 'concert-202408-deng-ziqi.webp',
            ASSET_ROOT / 'concerts' / 'thumbs' / 'concert-202504-zhang-jie.webp',
            ASSET_ROOT / 'concerts' / 'thumbs' / 'concert-202606-zhou-jielun.webp',
            ASSET_ROOT / 'concerts' / 'thumbs' / 'concert-202607-xue-zhiqian.webp',
        ]
        boxes = [(735, 270, 900, 375), (915, 270, 1080, 375), (735, 387, 900, 492), (915, 387, 1080, 492)]
        for path, box in zip(paths, boxes):
            paste_image(base, path, box)
    else:
        draw_metric_panel(draw, 735, 270, [('ARCHIVE', slug.upper(), gold), ('STATUS', 'ONLINE', aqua), ('YEAR', '2026', ink)], ink, gold, aqua)

    output = ASSET_ROOT / f'og-{slug}.png'
    output.parent.mkdir(parents=True, exist_ok=True)
    base.convert('RGB').save(output, format='PNG', optimize=True)
    return output


def main():
    cards = [
        ('home', 'PERSONAL ARCHIVE / 2026', 'Yance.', 'RESEARCHER · BUILDER · MUSIC LISTENER', 'DEEP LEARNING / SMART AGRICULTURE / PRODUCTS', (121, 217, 201)),
        ('academics', 'ACADEMICS / SCOREBOARD', 'Study.', 'GPA 4.0 · SAT 1490 · TOEFL 108', 'AP / TRANSCRIPT / LEARNING TRAJECTORY', (121, 217, 201)),
        ('honors', 'HONORS / ARCHIVE', 'Milestones.', '13 distinctions · 2025—2026', 'PIONEER · DISTINGUISHED · MERIT', (166, 152, 230)),
        ('research', 'YANCE / RESEARCH', 'Evidence.', 'Deep Learning × Smart Agriculture', '99.29% · FISHFRESHNET V2 · 2 PAPERS', (121, 217, 201)),
        ('works', 'WORKS / PRODUCT EXPERIENCE', 'FreshEye.', 'Research → Product', 'UPLOAD · RESULT · GRAD-CAM · PDF', (121, 217, 201)),
        ('concerts', 'CONCERTS / LIVE ARCHIVE', 'Listen.', 'A record of nights in light and sound', '2024 — 2026 · POSTER MOSAIC', (198, 151, 78)),
    ]
    for slug, kicker, title, subtitle, detail, accent in cards:
        render_card(
            slug,
            kicker,
            title,
            subtitle,
            detail,
            accent,
            image='case/fresheye-og-cover.png' if slug == 'works' else None,
            collage=slug == 'concerts',
        )
    render_card('card', 'PERSONAL ARCHIVE / 2026', 'Yance.', 'RESEARCHER · BUILDER · MUSIC LISTENER', 'DEEP LEARNING / SMART AGRICULTURE / PRODUCTS', (121, 217, 201))
    print('generated page-specific OG cards in', ASSET_ROOT)


if __name__ == '__main__':
    main()

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH, HEIGHT = 1200, 630
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public' / 'assets' / 'og-card.png'


def font(path, size):
    return ImageFont.truetype(path, size)


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


def main():
    base = Image.new('RGB', (WIDTH, HEIGHT), '#F7F2E8')
    pixels = base.load()
    start = (247, 242, 232)
    end = (233, 224, 208)
    for y in range(HEIGHT):
        for x in range(WIDTH):
            amount = (x / WIDTH + y / HEIGHT) / 2
            pixels[x, y] = tuple(int(start[i] * (1 - amount) + end[i] * amount) for i in range(3))

    base = Image.alpha_composite(base.convert('RGBA'), radial_overlay((WIDTH, HEIGHT), (960, 50), 650, (121, 217, 201), 98))
    base = Image.alpha_composite(base, radial_overlay((WIDTH, HEIGHT), (145, 560), 590, (198, 151, 78), 72))
    draw = ImageDraw.Draw(base)

    gold = '#A96F20'
    ink = '#1A1D23'
    muted = '#5A5E66'
    aqua = '#1E726D'
    draw.line((74, 92, 1126, 92), fill='#A96F2059', width=1)
    draw.line((74, 538, 1126, 538), fill='#A96F2059', width=1)
    draw.line((74, 92, 74, 538), fill='#1E726D33', width=1)
    draw.line((1126, 92, 1126, 538), fill='#1E726D33', width=1)
    draw.ellipse((934, 82, 1102, 250), outline='#A96F20B3', width=3)
    draw.ellipse((984, 132, 1052, 200), fill=ink)
    draw.ellipse((999, 147, 1013, 161), fill='#F7F2E8')

    mono = r'C:\Windows\Fonts\consola.ttf'
    serif = r'C:\Windows\Fonts\georgia.ttf'
    sans = r'C:\Windows\Fonts\arial.ttf'
    draw.text((110, 169), 'PERSONAL ARCHIVE / 2026', font=font(mono, 18), fill=gold, spacing=6)
    draw.text((104, 184), 'Yance.', font=font(serif, 144), fill=ink, stroke_width=0)
    draw.text((110, 386), 'RESEARCHER · BUILDER · MUSIC LISTENER', font=font(sans, 24), fill=muted)
    draw.text((110, 474), 'DEEP LEARNING / SMART AGRICULTURE / PRODUCTS', font=font(mono, 18), fill=aqua)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    base.convert('RGB').save(OUTPUT, format='PNG', optimize=True)
    print(f'generated {OUTPUT} ({WIDTH}x{HEIGHT})')


if __name__ == '__main__':
    main()

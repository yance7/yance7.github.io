from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / 'public' / 'assets' / 'concerts'
OUTPUT_DIR = SOURCE_DIR / 'thumbs'
MAX_SIZE = (640, 640)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    generated = 0
    for source in sorted(SOURCE_DIR.glob('*.jpg')):
        output = OUTPUT_DIR / f'{source.stem}.webp'
        with Image.open(source) as image:
            image.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
            image.save(output, 'WEBP', quality=78, method=6)
        generated += 1
    print(f'generated {generated} concert thumbnails in {OUTPUT_DIR}')


if __name__ == '__main__':
    main()

from collections import Counter
from pathlib import Path

from PIL import Image, UnidentifiedImageError


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / 'public' / 'assets'
IMAGE_SUFFIXES = {'.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp'}
GPS_INFO_TAG = 34853


def main():
    files = sorted(
        path for path in ASSET_DIR.rglob('*')
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    )
    formats = Counter()
    dimensions = Counter()
    gps_files = []
    unreadable = []

    for path in files:
        try:
            with Image.open(path) as image:
                formats[image.format or path.suffix.lower().lstrip('.')] += 1
                dimensions[image.size] += 1
                if image.getexif().get(GPS_INFO_TAG):
                    gps_files.append(path.relative_to(ROOT).as_posix())
        except (OSError, UnidentifiedImageError):
            unreadable.append(path.relative_to(ROOT).as_posix())

    format_summary = ', '.join(f'{name}={count}' for name, count in sorted(formats.items()))
    dimension_summary = ', '.join(
        f'{width}x{height}={count}' for (width, height), count in sorted(dimensions.items())
    )
    print(f'Image files: {len(files)}')
    print(f'Formats: {format_summary or "none"}')
    print(f'Dimensions: {dimension_summary or "none"}')
    print(f'GPS metadata: {len(gps_files)}')
    print(f'Unreadable files: {len(unreadable)}')
    for path in gps_files:
        print(f'GPS file: {path}')
    for path in unreadable:
        print(f'Unreadable file: {path}')

    return 1 if gps_files or unreadable else 0


if __name__ == '__main__':
    raise SystemExit(main())

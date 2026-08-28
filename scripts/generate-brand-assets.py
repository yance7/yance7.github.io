import argparse
import tempfile
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'design-assets' / 'yance-brand-master.png'
OUTPUT = ROOT / 'public' / 'assets' / 'brand'

FULL_SIZES = (256, 128, 96, 64, 48)
ICON_SIZES = (16, 32, 180, 192, 512)

def trim_alpha(image: Image.Image) -> Image.Image:
    alpha = image.getchannel('A')
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError('Brand image is fully transparent.')
    return image.crop(bbox)


def square_canvas(image: Image.Image, padding_ratio: float = 0.06) -> Image.Image:
    width, height = image.size
    size = max(width, height)
    padding = round(size * padding_ratio)
    canvas_size = size + padding * 2
    canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((canvas_size - width) // 2, (canvas_size - height) // 2))
    return canvas


def resize(image: Image.Image, size: int) -> Image.Image:
    return image.resize((size, size), Image.Resampling.LANCZOS)


def save_png(image: Image.Image, path: Path) -> None:
    image.save(path, 'PNG', optimize=True)


def save_webp(image: Image.Image, path: Path) -> None:
    image.save(path, 'WEBP', lossless=True, method=6)


def generate_assets(output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)

    with Image.open(SOURCE) as source:
        if source.mode != 'RGBA':
            raise ValueError(f'Brand source must be RGBA, got {source.mode}.')
        source.load()
        master = square_canvas(trim_alpha(source.copy()))

    for size in FULL_SIZES:
        save_webp(resize(master, size), output / f'yance-mark-{size}.webp')

    save_png(resize(master, 128), output / 'yance-mark-fallback.png')

    for size in ICON_SIZES:
        name = f'yance-icon-{size}.png' if size >= 180 else f'favicon-{size}.png'
        save_png(resize(master, size), output / name)


def main() -> None:
    parser = argparse.ArgumentParser(description='Generate or verify Yance brand runtime assets.')
    parser.add_argument('--check', action='store_true', help='verify committed assets match the selected master source')
    args = parser.parse_args()

    if not args.check:
        generate_assets(OUTPUT)
        return

    with tempfile.TemporaryDirectory(prefix='yance-brand-assets-') as temp_dir:
        generated = Path(temp_dir) / 'brand'
        generate_assets(generated)
        expected_names = sorted(path.name for path in generated.iterdir())
        actual_names = sorted(path.name for path in OUTPUT.iterdir()) if OUTPUT.exists() else []
        if actual_names != expected_names:
            raise SystemExit(
                f'Brand asset set drifted. Expected {expected_names}, found {actual_names}.'
            )
        for name in expected_names:
            with Image.open(generated / name) as expected_image, Image.open(OUTPUT / name) as actual_image:
                expected_image.load()
                actual_image.load()
                expected_rgba = expected_image.convert('RGBA')
                actual_rgba = actual_image.convert('RGBA')
            if expected_rgba.size != actual_rgba.size or expected_rgba.tobytes() != actual_rgba.tobytes():
                raise SystemExit(f'Brand asset drifted from source: {name}')
    print('brand assets: committed files match the selected master source')


if __name__ == '__main__':
    main()

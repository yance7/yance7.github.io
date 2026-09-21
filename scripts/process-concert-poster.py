from argparse import ArgumentParser
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageCms, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = ROOT / 'public' / 'assets' / 'concerts'
DEFAULT_THUMB_EDGE = 640
DEFAULT_MAX_EDGE = 2560
DEFAULT_JPEG_QUALITY = 88
HARD_MAX_BYTES = 2.5 * 1024 * 1024
RECOMMENDED_MAX_BYTES = 1.8 * 1024 * 1024


def to_srgb(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image)
    profile = image.info.get('icc_profile')
    if profile:
        try:
            image = ImageCms.profileToProfile(
                image,
                ImageCms.ImageCmsProfile(BytesIO(profile)),
                ImageCms.createProfile('sRGB'),
                outputMode='RGB',
            )
            return image
        except ImageCms.PyCMSError:
            pass
    return image.convert('RGB')


def fit_within(image: Image.Image, edge: int) -> Image.Image:
    image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
    return image


def process_poster(
    source: Path,
    output: Path,
    thumbnail_edge: int = DEFAULT_THUMB_EDGE,
    max_edge: int = DEFAULT_MAX_EDGE,
    quality: int = DEFAULT_JPEG_QUALITY,
) -> tuple[int, int, int]:
    if source.suffix.lower() not in {'.jpg', '.jpeg', '.png'}:
        raise ValueError(f'Unsupported source format: {source}')
    if output.suffix.lower() != '.jpg':
        raise ValueError(f'Original output must be a JPEG: {output}')

    output.parent.mkdir(parents=True, exist_ok=True)
    thumbnail = output.parent / 'thumbs' / f'{output.stem}.webp'
    thumbnail.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source) as opened:
        image = fit_within(to_srgb(opened), max_edge)
        image.save(
            output,
            'JPEG',
            quality=quality,
            optimize=True,
            progressive=True,
        )
        preview = fit_within(image.copy(), thumbnail_edge)
        preview.save(thumbnail, 'WEBP', quality=78, method=6)

    size = output.stat().st_size
    if size > HARD_MAX_BYTES:
        raise ValueError(
            f'{output.name} is {size / 1024 / 1024:.2f} MiB, above the 2.5 MiB hard limit; review text clarity before lowering quality.'
        )
    if size > RECOMMENDED_MAX_BYTES:
        print(f'warning: {output.name} is {size / 1024 / 1024:.2f} MiB, above the 1.8 MiB recommendation')

    return image.width, image.height, size


def parse_args() -> ArgumentParser:
    parser = ArgumentParser(description='Normalize one concert poster and generate its WebP thumbnail.')
    parser.add_argument('--source', type=Path, required=True, help='Source JPG, JPEG, or PNG file.')
    parser.add_argument('--output-name', required=True, help='ASCII kebab-case JPEG filename, including .jpg.')
    parser.add_argument('--output-dir', type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument('--max-edge', type=int, default=DEFAULT_MAX_EDGE)
    parser.add_argument('--thumbnail-edge', type=int, default=DEFAULT_THUMB_EDGE)
    parser.add_argument('--quality', type=int, default=DEFAULT_JPEG_QUALITY)
    return parser


def main() -> None:
    args = parse_args().parse_args()
    output_name = Path(args.output_name).name
    if output_name != args.output_name or not output_name.isascii():
        raise ValueError('--output-name must be an ASCII filename without path separators')
    width, height, size = process_poster(
        args.source.resolve(),
        args.output_dir.resolve() / output_name,
        thumbnail_edge=args.thumbnail_edge,
        max_edge=args.max_edge,
        quality=args.quality,
    )
    print(f'processed {output_name}: {width}x{height}, {size / 1024:.1f} KiB')


if __name__ == '__main__':
    main()

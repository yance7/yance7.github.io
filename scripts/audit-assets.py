from collections import Counter
from pathlib import Path

from PIL import ExifTags, Image, UnidentifiedImageError


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / 'public' / 'assets'
IMAGE_SUFFIXES = {'.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp'}
GPS_INFO_TAG = 34853
TECHNICAL_METADATA_KEYS = {
    'jfif',
    'jfif_version',
    'jfif_unit',
    'jfif_density',
    'progressive',
    'progression',
    'icc_profile',
    'dpi',
    'transparency',
    'duration',
    'loop',
    'background',
    'adobe',
    'bits',
    'colors',
    'gamma',
    'interlace',
    'mode',
    'quality',
    'rawmode',
    'srgb',
    'subsampling',
}
SENSITIVE_METADATA_KEYS = {
    'exif',
    'xmp',
    'XML:com.adobe.xmp',
    'comment',
    'description',
    'author',
    'artist',
    'copyright',
    'creation_time',
    'date:create',
    'date:modify',
    'UserComment',
    'CameraOwnerName',
    'BodySerialNumber',
    'LensSerialNumber',
    'DateTime',
    'DateTimeOriginal',
    'DateTimeDigitized',
}
NORMALIZED_TECHNICAL_METADATA_KEYS = {
    key.casefold().replace('-', '_').replace(' ', '_')
    for key in TECHNICAL_METADATA_KEYS
}
NORMALIZED_SENSITIVE_METADATA_KEYS = {
    key.casefold().replace('-', '_').replace(' ', '_')
    for key in SENSITIVE_METADATA_KEYS
}


def metadata_key_name(key):
    if isinstance(key, int):
        return f'EXIF:{ExifTags.TAGS.get(key, key)}'
    return str(key)


def normalized_metadata_key(key):
    return metadata_key_name(key).casefold().replace('-', '_').replace(' ', '_')


def is_sensitive_metadata_key(key, source):
    normalized_key = normalized_metadata_key(key)
    if normalized_key in NORMALIZED_TECHNICAL_METADATA_KEYS:
        return False
    if source in {'exif', 'text', 'xmp'}:
        return True
    return (
        normalized_key in NORMALIZED_SENSITIVE_METADATA_KEYS
        or normalized_key.startswith('exif:')
        or normalized_key.startswith('xmp')
        or normalized_key.startswith('xml:com.adobe.xmp')
    )


def collect_sensitive_metadata(image):
    keys = set()
    for key in image.getexif():
        if is_sensitive_metadata_key(key, 'exif'):
            keys.add(metadata_key_name(key))

    for key in image.info:
        if is_sensitive_metadata_key(key, 'info'):
            keys.add(metadata_key_name(key))

    text_metadata = image.text if hasattr(image, 'text') else {}
    for key in text_metadata:
        if is_sensitive_metadata_key(key, 'text'):
            keys.add(metadata_key_name(key))

    xmp_payload = image.info.get('xmp') or image.info.get('XML:com.adobe.xmp')
    if xmp_payload:
        keys.add('xmp')
        getxmp = getattr(image, 'getxmp', None)
        if getxmp:
            try:
                xmp_metadata = getxmp()
            except (OSError, SyntaxError, TypeError, ValueError):
                xmp_metadata = None
            if isinstance(xmp_metadata, dict):
                keys.update(f'xmp:{key}' for key in xmp_metadata)

    return keys


def main():
    files = sorted(
        path for path in ASSET_DIR.rglob('*')
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    )
    formats = Counter()
    dimensions = Counter()
    gps_files = []
    sensitive_metadata_files = {}
    unreadable = []

    for path in files:
        try:
            with Image.open(path) as image:
                image.verify()

            with Image.open(path) as reopened:
                frame_count = getattr(reopened, 'n_frames', 1)
                for frame_index in range(frame_count):
                    reopened.seek(frame_index)
                    reopened.load()
                formats[reopened.format or path.suffix.lower().lstrip('.')] += 1
                dimensions[reopened.size] += 1
                if reopened.getexif().get(GPS_INFO_TAG):
                    gps_files.append(path.relative_to(ROOT).as_posix())
                sensitive_keys = collect_sensitive_metadata(reopened)
                if sensitive_keys:
                    sensitive_metadata_files[path.relative_to(ROOT).as_posix()] = sorted(sensitive_keys)
        except (OSError, UnidentifiedImageError, SyntaxError, ValueError):
            unreadable.append(path.relative_to(ROOT).as_posix())

    format_summary = ', '.join(f'{name}={count}' for name, count in sorted(formats.items()))
    dimension_summary = ', '.join(
        f'{width}x{height}={count}' for (width, height), count in sorted(dimensions.items())
    )
    print(f'Image files: {len(files)}')
    print(f'Formats: {format_summary or "none"}')
    print(f'Dimensions: {dimension_summary or "none"}')
    print(f'GPS metadata: {len(gps_files)}')
    print(f'Sensitive metadata: {len(sensitive_metadata_files)}')
    print(f'Unreadable files: {len(unreadable)}')
    for path in gps_files:
        print(f'GPS file: {path}')
    for path, keys in sorted(sensitive_metadata_files.items()):
        print(f'Sensitive metadata file: {path} ({", ".join(keys)})')
    for path in unreadable:
        print(f'Unreadable file: {path}')

    return 1 if gps_files or sensitive_metadata_files or unreadable else 0


if __name__ == '__main__':
    raise SystemExit(main())

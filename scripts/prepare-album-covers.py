#!/usr/bin/env python3
"""Validate and generate responsive local album covers from approved sources."""

from __future__ import annotations

import argparse
import io
import os
from pathlib import Path
import shutil
import tempfile

from PIL import Image, ImageCms


ALBUM_IDS = (
    'jay-fantasy', 'jay-ye-hui-mei', 'jay-common-jasmine-orange',
    'jj-second-heaven', 'jj-cao-cao', 'jj-she-says',
    'joker-accident', 'joker-beginner', 'joker-extraterrestrial',
    'gem-xposed', 'gem-heartbeat', 'gem-city-zoo',
    'silence-gravity', 'silence-legendary-movement', 'silence-romance-21',
    'jason-most-beautiful-sun', 'jason-after-tomorrow', 'jason-this-is-love',
    'leehom-the-one-and-only', 'leehom-shangri-la', 'leehom-change-me',
    'david-tao-self-titled', 'david-tao-im-ok', 'david-tao-black-tangerine',
)
FULL_SIZE = 1200
THUMB_SIZE = 640
MAX_WEBP_BYTES = {THUMB_SIZE: 150 * 1024, FULL_SIZE: 350 * 1024}
SRGB_PROFILE = ImageCms.createProfile('sRGB')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, required=True, help='Directory containing <album-id>.jpg source files')
    parser.add_argument('--output-dir', type=Path, default=Path('public/assets/albums'), help='Destination directory for generated covers')
    return parser.parse_args()


def normalize_to_srgb(source: Path) -> Image.Image:
    with Image.open(source) as opened:
        opened.load()
        width, height = opened.size
        if width != height:
            raise ValueError(f'{source.name}: source must be square, got {width}x{height}')
        if width < FULL_SIZE:
            raise ValueError(f'{source.name}: source must be at least {FULL_SIZE}px, got {width}x{height}; refusing to upscale')

        profile = opened.info.get('icc_profile')
        if profile:
            try:
                return ImageCms.profileToProfile(
                    opened,
                    ImageCms.ImageCmsProfile(io.BytesIO(profile)),
                    SRGB_PROFILE,
                    outputMode='RGB',
                )
            except ImageCms.PyCMSError as error:
                raise ValueError(f'{source.name}: invalid embedded ICC profile') from error
        return opened.convert('RGB')


def resized(image: Image.Image, size: int) -> Image.Image:
    if image.width < size:
        raise ValueError(f'cannot create {size}px cover from {image.width}px source without upscaling')
    return image.resize((size, size), Image.Resampling.LANCZOS)


def write_webp(image: Image.Image, destination: Path, size: int) -> tuple[int, int]:
    for quality in range(82, 75, -1):
        image.save(destination, format='WEBP', quality=quality, method=6)
        byte_count = destination.stat().st_size
        if byte_count <= MAX_WEBP_BYTES[size]:
            return byte_count, quality
    raise ValueError(
        f'{destination.name}: {byte_count / 1024:.1f} KB exceeds {MAX_WEBP_BYTES[size] / 1024:.0f} KB at minimum quality 76'
    )


def artifact_paths() -> tuple[Path, ...]:
    return tuple(
        [Path(f'{album_id}.jpg') for album_id in ALBUM_IDS]
        + [Path('thumbs') / f'{album_id}-{size}.webp' for album_id in ALBUM_IDS for size in (THUMB_SIZE, FULL_SIZE)]
    )


def validate_artifact(path: Path, expected_format: str, size: int, max_bytes: int | None = None) -> None:
    if not path.is_file() or path.stat().st_size == 0:
        raise ValueError(f'{path.name}: generated file is missing or empty')
    if max_bytes is not None and path.stat().st_size > max_bytes:
        raise ValueError(f'{path.name}: {path.stat().st_size / 1024:.1f} KB exceeds {max_bytes / 1024:.0f} KB')

    with Image.open(path) as image:
        image.verify()
    with Image.open(path) as image:
        if image.format != expected_format or image.mode != 'RGB' or image.size != (size, size):
            raise ValueError(
                f'{path.name}: expected {expected_format} RGB {size}x{size}, '
                f'got {image.format} {image.mode} {image.width}x{image.height}'
            )


def validate_staged_artifacts(staging_dir: Path) -> None:
    for album_id in ALBUM_IDS:
        validate_artifact(staging_dir / f'{album_id}.jpg', 'JPEG', FULL_SIZE)
        for size in (THUMB_SIZE, FULL_SIZE):
            validate_artifact(
                staging_dir / 'thumbs' / f'{album_id}-{size}.webp',
                'WEBP',
                size,
                MAX_WEBP_BYTES[size],
            )


def replace_artifacts(staging_dir: Path, output_dir: Path) -> None:
    backup_dir = staging_dir / 'backup'
    replaced: list[Path] = []
    backed_up: list[Path] = []

    try:
        for relative_path in artifact_paths():
            destination = output_dir / relative_path
            if destination.is_file():
                backup_path = backup_dir / relative_path
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                os.replace(destination, backup_path)
                backed_up.append(relative_path)

        for relative_path in artifact_paths():
            destination = output_dir / relative_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            os.replace(staging_dir / relative_path, destination)
            replaced.append(relative_path)
    except BaseException:
        for relative_path in reversed(replaced):
            (output_dir / relative_path).unlink(missing_ok=True)
        for relative_path in reversed(backed_up):
            os.replace(backup_dir / relative_path, output_dir / relative_path)
        raise


def prepare_album_covers(source_dir: Path, output_dir: Path) -> list[str]:
    missing = [album_id for album_id in ALBUM_IDS if not (source_dir / f'{album_id}.jpg').is_file()]
    if missing:
        raise FileNotFoundError(f'missing source covers: {", ".join(missing)}')

    output_dir.mkdir(parents=True, exist_ok=True)
    staging_dir = Path(tempfile.mkdtemp(prefix='.prepare-album-covers-', dir=output_dir))
    summary: list[str] = []

    try:
        thumbs_dir = staging_dir / 'thumbs'
        thumbs_dir.mkdir()
        for album_id in ALBUM_IDS:
            normalized = normalize_to_srgb(source_dir / f'{album_id}.jpg')
            cover = resized(normalized, FULL_SIZE)
            jpg_path = staging_dir / f'{album_id}.jpg'
            cover.save(jpg_path, format='JPEG', quality=95, optimize=True, progressive=True)

            thumb = resized(normalized, THUMB_SIZE)
            thumb_bytes, thumb_quality = write_webp(thumb, thumbs_dir / f'{album_id}-{THUMB_SIZE}.webp', THUMB_SIZE)
            full_bytes, full_quality = write_webp(cover, thumbs_dir / f'{album_id}-{FULL_SIZE}.webp', FULL_SIZE)
            summary.append(
                f'{album_id}: JPG 1200x1200; WEBP 640 {thumb_bytes / 1024:.1f} KB q{thumb_quality}; '
                f'WEBP 1200 {full_bytes / 1024:.1f} KB q{full_quality}'
            )

        validate_staged_artifacts(staging_dir)
        replace_artifacts(staging_dir, output_dir)
        return summary
    finally:
        shutil.rmtree(staging_dir)


def main() -> None:
    args = parse_args()
    summary = prepare_album_covers(args.source_dir, args.output_dir)

    print(f'Prepared {len(ALBUM_IDS)} RGB/sRGB JPEG covers and {len(ALBUM_IDS) * 2} WebP variants.')
    print('\n'.join(summary))


if __name__ == '__main__':
    main()

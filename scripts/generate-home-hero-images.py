"""Generate the immutable, privacy-reviewed home hero image candidates."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageCms, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / 'public' / 'assets' / 'home-hero'
MANIFEST_PATH = ROOT / 'src' / 'data' / 'homeHeroAssets.json'
SOURCE_FILES = (
    ('hero-01', '图片1.png'),
    ('hero-02', '图片2.jpg'),
    ('hero-03', '图片3.jpg'),
    ('hero-04', '图片4.jpg'),
    ('hero-05', '图片5.jpg'),
    ('hero-06', '图片6.jpg'),
    ('hero-07', '图片7.jpg'),
)
TARGET_WIDTHS = (640, 896, 1280, 2240)
WEBP_QUALITY = 82
JPEG_QUALITY = 82
ALPHA_BACKGROUND = '#26382e'
SRGB_PROFILE = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB'))
SRGB_PROFILE_BYTES = SRGB_PROFILE.tobytes()


class AssetError(RuntimeError):
    """Raised when an image or generated asset violates the release contract."""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _color_managed_rgb(image: Image.Image) -> Image.Image:
    oriented = ImageOps.exif_transpose(image)
    alpha = oriented.getchannel('A') if 'A' in oriented.getbands() else None
    color = oriented
    if alpha is not None:
        color = oriented.convert('RGB')

    embedded_profile = oriented.info.get('icc_profile')
    if embedded_profile:
        try:
            input_profile = ImageCms.ImageCmsProfile(io.BytesIO(embedded_profile))
            converted = ImageCms.profileToProfile(
                color,
                input_profile,
                SRGB_PROFILE,
                outputMode='RGB',
                renderingIntent=ImageCms.Intent.PERCEPTUAL,
            )
        except (ImageCms.PyCMSError, OSError, ValueError) as error:
            raise AssetError(f'无法正确转换嵌入的 ICC 色彩配置: {error}') from error
    else:
        # Images without an embedded profile are treated as standard sRGB.
        converted = color.convert('RGB')

    if alpha is not None:
        background = Image.new('RGB', converted.size, ALPHA_BACKGROUND)
        background.paste(converted, mask=alpha)
        converted = background
    return converted


def _candidate_bytes(image: Image.Image, format_name: str) -> bytes:
    buffer = io.BytesIO()
    if format_name == 'webp':
        image.save(
            buffer,
            format='WEBP',
            quality=WEBP_QUALITY,
            method=6,
            icc_profile=SRGB_PROFILE_BYTES,
        )
    else:
        image.save(
            buffer,
            format='JPEG',
            quality=JPEG_QUALITY,
            optimize=True,
            progressive=True,
            icc_profile=SRGB_PROFILE_BYTES,
        )
    return buffer.getvalue()


def _build_slide(source_path: Path, slide_id: str) -> tuple[dict[str, Any], dict[str, bytes]]:
    try:
        with Image.open(source_path) as source:
            source_format = (source.format or source_path.suffix.lstrip('.')).lower()
            if source_format not in {'jpeg', 'jpg', 'png'}:
                raise AssetError(f'{source_path.name}: 仅支持 JPEG/PNG 输入')
            image = _color_managed_rgb(source)
    except (OSError, ValueError) as error:
        if isinstance(error, AssetError):
            raise
        raise AssetError(f'{source_path.name}: 无法读取图像: {error}') from error

    source_width, source_height = image.size
    candidates: dict[str, list[dict[str, Any]]] = {'webp': [], 'jpeg': []}
    generated: dict[str, bytes] = {}

    for target_width in TARGET_WIDTHS:
        width = min(source_width, target_width)
        if width == source_width and candidates['webp'] and candidates['webp'][-1]['width'] == width:
            continue
        height = max(1, round(source_height * width / source_width))
        resized = image.resize((width, height), Image.Resampling.LANCZOS) if width != source_width else image
        for format_name in ('webp', 'jpeg'):
            encoded = _candidate_bytes(resized, format_name)
            digest = sha256(encoded)
            extension = 'webp' if format_name == 'webp' else 'jpg'
            filename = f'{slide_id}-{width}-{digest[:16]}.{extension}'
            public_path = f'/assets/home-hero/{filename}'
            candidates[format_name].append({
                'src': public_path,
                'width': width,
                'height': height,
                'bytes': len(encoded),
                'sha256': digest,
            })
            generated[filename] = encoded

    slide = {
        'id': slide_id,
        'sourceFormat': 'png' if source_format == 'png' else 'jpeg',
        'width': source_width,
        'height': source_height,
        'sources': candidates,
    }
    return slide, generated


def _read_manifest() -> dict[str, Any]:
    try:
        manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        raise AssetError(f'无法读取资源清单 {MANIFEST_PATH.relative_to(ROOT)}: {error}') from error
    if not isinstance(manifest, dict) or manifest.get('version') != 1 or not isinstance(manifest.get('slides'), list):
        raise AssetError('资源清单格式无效')
    return manifest


def _verify_candidate(slide: dict[str, Any], format_name: str, candidate: dict[str, Any]) -> Path:
    relative_src = candidate.get('src')
    expected_extension = 'webp' if format_name == 'webp' else 'jpg'
    if not isinstance(relative_src, str) or not relative_src.startswith('/assets/home-hero/'):
        raise AssetError(f"{slide.get('id')}: 候选资源路径无效: {relative_src!r}")
    if 'downloads' in relative_src.lower() or '\\' in relative_src:
        raise AssetError(f'{slide.get("id")}: 候选资源路径包含本机信息')
    if not relative_src.endswith(f'.{expected_extension}'):
        raise AssetError(f'{slide.get("id")}: 候选资源格式不匹配: {relative_src}')

    filename = relative_src.rsplit('/', 1)[-1]
    path = OUTPUT_DIR / filename
    try:
        data = path.read_bytes()
    except OSError as error:
        raise AssetError(f'缺少派生资源 {relative_src}: {error}') from error

    digest = sha256(data)
    if candidate.get('sha256') != digest or candidate.get('bytes') != len(data):
        raise AssetError(f'{relative_src}: 字节数或 SHA-256 与清单不匹配')
    if digest[:16] not in filename:
        raise AssetError(f'{relative_src}: 文件名未包含内容指纹')

    try:
        with Image.open(path) as image:
            image.load()
            expected_format = 'WEBP' if format_name == 'webp' else 'JPEG'
            if image.format != expected_format:
                raise AssetError(f'{relative_src}: 实际格式为 {image.format}，预期 {expected_format}')
            if list(image.size) != [candidate.get('width'), candidate.get('height')]:
                raise AssetError(f'{relative_src}: 像素尺寸与清单不匹配')
            if image.getexif():
                raise AssetError(f'{relative_src}: 仍含 EXIF 元数据')
            if any(key.lower() in {'exif', 'xmp', 'xml', 'comment', 'description'} for key in image.info):
                raise AssetError(f'{relative_src}: 仍含 EXIF/XMP/文本元数据')
            profile_data = image.info.get('icc_profile')
            if not profile_data:
                raise AssetError(f'{relative_src}: 缺少明确的 sRGB ICC 配置')
            profile = ImageCms.ImageCmsProfile(io.BytesIO(profile_data))
            description = ImageCms.getProfileDescription(profile).lower()
            if 'srgb' not in description:
                raise AssetError(f'{relative_src}: 输出 ICC 不是 sRGB ({description.strip()})')
    except (OSError, ImageCms.PyCMSError) as error:
        if isinstance(error, AssetError):
            raise
        raise AssetError(f'{relative_src}: 无法完整解码或验证颜色配置: {error}') from error
    return path


def check_assets() -> tuple[int, int]:
    manifest = _read_manifest()
    slides = manifest['slides']
    expected_ids = [slide_id for slide_id, _ in SOURCE_FILES]
    if [slide.get('id') for slide in slides] != expected_ids:
        raise AssetError('清单必须按 hero-01 至 hero-07 的顺序包含恰好七张照片')

    expected_paths: set[Path] = set()
    total_bytes = 0
    for slide in slides:
        width = slide.get('width')
        height = slide.get('height')
        if not isinstance(width, int) or not isinstance(height, int) or width <= 0 or height <= 0:
            raise AssetError(f"{slide.get('id')}: 原图像素尺寸无效")
        if slide.get('sourceFormat') not in {'png', 'jpeg'}:
            raise AssetError(f"{slide.get('id')}: 来源格式无效")
        sources = slide.get('sources')
        if not isinstance(sources, dict) or set(sources) != {'webp', 'jpeg'}:
            raise AssetError(f"{slide.get('id')}: 必须同时提供 WebP 与 JPEG 候选")

        for format_name, candidates in sources.items():
            expected_widths = list(dict.fromkeys(min(width, target) for target in TARGET_WIDTHS))
            if not isinstance(candidates, list) or [item.get('width') for item in candidates] != expected_widths:
                raise AssetError(f"{slide.get('id')}: {format_name} 候选宽度不符合 {expected_widths}")
            for candidate in candidates:
                path = _verify_candidate(slide, format_name, candidate)
                expected_paths.add(path.resolve())
                total_bytes += path.stat().st_size

    actual_paths = {path.resolve() for path in OUTPUT_DIR.glob('hero-*') if path.is_file()}
    if actual_paths != expected_paths:
        extra = sorted(str(path.relative_to(ROOT)) for path in actual_paths - expected_paths)
        missing = sorted(str(path.relative_to(ROOT)) for path in expected_paths - actual_paths)
        raise AssetError(f'派生目录与清单不一致；多余: {extra}; 缺少: {missing}')
    return len(expected_paths), total_bytes


def _previous_generated_paths() -> set[Path]:
    if not MANIFEST_PATH.exists():
        return set()
    try:
        manifest = _read_manifest()
    except AssetError:
        return set()
    paths: set[Path] = set()
    for slide in manifest.get('slides', []):
        for candidates in slide.get('sources', {}).values():
            for candidate in candidates:
                src = candidate.get('src', '')
                if isinstance(src, str) and src.startswith('/assets/home-hero/') and '\\' not in src:
                    paths.add((ROOT / 'public' / src.lstrip('/')).resolve())
    return paths


def generate(source_dir: Path) -> tuple[int, int]:
    if not source_dir.is_dir():
        raise AssetError(f'找不到来源目录: {source_dir}')

    previous_paths = _previous_generated_paths()
    generated_slides: list[dict[str, Any]] = []
    generated_files: dict[str, bytes] = {}
    for slide_id, source_name in SOURCE_FILES:
        source_path = source_dir / source_name
        if not source_path.is_file():
            raise AssetError(f'缺少来源照片: {source_name}')
        slide, files = _build_slide(source_path, slide_id)
        generated_slides.append(slide)
        generated_files.update(files)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    for filename, data in generated_files.items():
        (OUTPUT_DIR / filename).write_bytes(data)

    manifest = {'version': 1, 'slides': generated_slides}
    temporary_manifest = MANIFEST_PATH.with_suffix('.json.tmp')
    temporary_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary_manifest.replace(MANIFEST_PATH)

    current_paths = {(OUTPUT_DIR / filename).resolve() for filename in generated_files}
    for stale_path in previous_paths - current_paths:
        if stale_path.parent == OUTPUT_DIR.resolve() and stale_path.is_file():
            stale_path.unlink()

    return len(generated_files), sum(len(data) for data in generated_files.values())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, default=Path.home() / 'Downloads')
    parser.add_argument('--check', action='store_true', help='只核验提交的清单和派生资源，不读取来源目录')
    arguments = parser.parse_args()

    try:
        if arguments.check:
            count, total_bytes = check_assets()
            print(f'home hero assets OK: {count} candidates, {total_bytes:,} bytes; source directory not accessed')
        else:
            count, total_bytes = generate(arguments.source_dir)
            checked_count, checked_bytes = check_assets()
            if checked_count != count or checked_bytes != total_bytes:
                raise AssetError('生成后资源复核数量或字节数不一致')
            print(f'generated and verified {count} home hero candidates ({total_bytes:,} bytes)')
    except AssetError as error:
        print(f'home hero asset error: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

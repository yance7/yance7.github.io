"""Generate the immutable, privacy-reviewed home hero image candidates."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

from PIL import Image, ImageCms, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / 'public' / 'assets' / 'images' / 'home-hero'
MANIFEST_PATH = ROOT / 'src' / 'data' / 'homeHeroAssets.json'
LEGACY_SLIDE_COUNT = 7
EXPECTED_SLIDE_COUNT = 13
APPEND_SOURCE_COUNT = 6
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


def _build_slide(source_path: Path, slide_id: str) -> tuple[dict[str, Any], dict[str, bytes], dict[str, Any]]:
    try:
        source_bytes = source_path.read_bytes()
        with Image.open(io.BytesIO(source_bytes)) as source:
            source_format = (source.format or source_path.suffix.lstrip('.')).lower()
            if source_format not in {'jpeg', 'jpg', 'png'}:
                raise AssetError(f'{source_path.name}: 仅支持 JPEG/PNG 输入')
            original_width, original_height = source.size
            exif_orientation = source.getexif().get(274)
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
            public_path = f'/assets/images/home-hero/{filename}'
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
    source_record = {
        'file': source_path.name,
        'bytes': len(source_bytes),
        'sha256': sha256(source_bytes),
        'width': original_width,
        'height': original_height,
        'exifOrientation': exif_orientation,
        'orientedWidth': source_width,
        'orientedHeight': source_height,
    }
    return slide, generated, source_record


def _read_manifest_bytes() -> bytes:
    try:
        return MANIFEST_PATH.read_bytes()
    except OSError as error:
        raise AssetError(f'无法读取资源清单 {MANIFEST_PATH.relative_to(ROOT)}: {error}') from error


def _parse_manifest(data: bytes) -> dict[str, Any]:
    try:
        manifest = json.loads(data.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise AssetError(f'无法解析资源清单 {MANIFEST_PATH.relative_to(ROOT)}: {error}') from error
    if not isinstance(manifest, dict) or manifest.get('version') != 1 or not isinstance(manifest.get('slides'), list):
        raise AssetError('资源清单格式无效')
    return manifest


def _read_manifest() -> dict[str, Any]:
    return _parse_manifest(_read_manifest_bytes())


def _verify_candidate(
    slide: dict[str, Any],
    format_name: str,
    candidate: dict[str, Any],
    output_dir: Path = OUTPUT_DIR,
) -> Path:
    relative_src = candidate.get('src')
    expected_extension = 'webp' if format_name == 'webp' else 'jpg'
    if not isinstance(relative_src, str) or not relative_src.startswith('/assets/images/home-hero/'):
        raise AssetError(f"{slide.get('id')}: 候选资源路径无效: {relative_src!r}")
    if 'downloads' in relative_src.lower() or '\\' in relative_src:
        raise AssetError(f'{slide.get("id")}: 候选资源路径包含本机信息')
    if not relative_src.endswith(f'.{expected_extension}'):
        raise AssetError(f'{slide.get("id")}: 候选资源格式不匹配: {relative_src}')

    filename = relative_src.rsplit('/', 1)[-1]
    resolved_output_dir = output_dir.resolve()
    path = (output_dir / filename).resolve()
    if path.parent != resolved_output_dir:
        raise AssetError(f'{relative_src}: 候选资源解析到输出目录之外')
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


def _check_manifest_assets(
    manifest: dict[str, Any],
    expected_count: int,
    output_dir: Path = OUTPUT_DIR,
) -> tuple[int, int]:
    slides = manifest['slides']
    expected_ids = [f'hero-{index:02d}' for index in range(1, expected_count + 1)]
    if [slide.get('id') for slide in slides] != expected_ids:
        raise AssetError(f'清单必须按 hero-01 至 hero-{expected_count:02d} 的顺序包含恰好 {expected_count} 张照片')

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
                path = _verify_candidate(slide, format_name, candidate, output_dir)
                expected_paths.add(path.resolve())
                total_bytes += path.stat().st_size

    actual_paths = {path.resolve() for path in output_dir.glob('hero-*') if path.is_file()}
    if actual_paths != expected_paths:
        extra = sorted(str(path.relative_to(ROOT)) for path in actual_paths - expected_paths)
        missing = sorted(str(path.relative_to(ROOT)) for path in expected_paths - actual_paths)
        raise AssetError(f'派生目录与清单不一致；多余: {extra}; 缺少: {missing}')
    return len(expected_paths), total_bytes


def check_assets(expected_count: int = EXPECTED_SLIDE_COUNT) -> tuple[int, int]:
    manifest = _read_manifest()
    return _check_manifest_assets(manifest, expected_count)


def _write_bytes_atomically(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode='wb',
            prefix=f'.{path.name}.',
            suffix='.tmp',
            dir=path.parent,
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            temporary_file.write(data)
        os.replace(temporary_path, path)
        temporary_path = None
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()


def append_images(source_dir: Path, start_index: int, count: int) -> tuple[int, int, list[dict[str, Any]]]:
    if not source_dir.is_dir():
        raise AssetError(f'找不到来源目录: {source_dir}')
    if count != APPEND_SOURCE_COUNT:
        raise AssetError(f'本次追加必须显式提供 {APPEND_SOURCE_COUNT} 张新照片')

    previous_manifest_bytes = _read_manifest_bytes()
    previous_manifest = _parse_manifest(previous_manifest_bytes)
    previous_slides = previous_manifest['slides']
    if len(previous_slides) != LEGACY_SLIDE_COUNT:
        raise AssetError(f'追加前必须保留完整的旧七图清单，当前为 {len(previous_slides)} 张')
    if start_index != len(previous_slides) + 1:
        raise AssetError(f'追加起始编号必须紧接旧清单，预期 {len(previous_slides) + 1}，收到 {start_index}')

    # Confirm every old candidate and its bytes before adding anything. Never reopen or regenerate old sources.
    check_assets(expected_count=LEGACY_SLIDE_COUNT)
    if _read_manifest_bytes() != previous_manifest_bytes:
        raise AssetError('旧七图清单在追加期间发生变化')
    generated_slides: list[dict[str, Any]] = []
    generated_files: dict[str, bytes] = {}
    source_records: list[dict[str, Any]] = []
    for source_index in range(1, count + 1):
        slide_id = f'hero-{start_index + source_index - 1:02d}'
        source_name = f'图片{source_index}.jpg'
        source_path = source_dir / source_name
        if not source_path.is_file():
            raise AssetError(f'缺少来源照片: {source_name}')
        slide, files, source_record = _build_slide(source_path, slide_id)
        generated_slides.append(slide)
        generated_files.update(files)
        source_records.append(source_record)

    if start_index + count - 1 != EXPECTED_SLIDE_COUNT:
        raise AssetError(f'追加后应恰好包含 {EXPECTED_SLIDE_COUNT} 张照片')

    manifest = {
        'version': previous_manifest['version'],
        'slides': [*previous_slides, *generated_slides],
    }
    manifest_bytes = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    installed_paths: list[Path] = []
    manifest_replaced = False
    output_root = OUTPUT_DIR.resolve()

    try:
        with tempfile.TemporaryDirectory(prefix='.home-hero-stage-', dir=OUTPUT_DIR.parent) as temporary_dir:
            staging_dir = Path(temporary_dir)
            for filename, data in generated_files.items():
                (staging_dir / filename).write_bytes(data)

            for slide in generated_slides:
                for format_name, candidates in slide['sources'].items():
                    for candidate in candidates:
                        _verify_candidate(slide, format_name, candidate, staging_dir)

            staged_paths = {path.resolve() for path in staging_dir.glob('hero-*') if path.is_file()}
            expected_staged_paths = {(staging_dir / filename).resolve() for filename in generated_files}
            if staged_paths != expected_staged_paths:
                raise AssetError('暂存目录与新候选清单不一致')

            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            for filename, data in generated_files.items():
                destination = (OUTPUT_DIR / filename).resolve()
                if destination.parent != output_root:
                    raise AssetError(f'候选路径解析到输出目录之外: {filename}')
                if destination.exists():
                    if destination.read_bytes() != data:
                        raise AssetError(f'同名派生资源已存在但内容不一致: {filename}')
                    continue
                os.replace(staging_dir / filename, destination)
                installed_paths.append(destination)

        _check_manifest_assets(manifest, EXPECTED_SLIDE_COUNT)
        if _read_manifest_bytes() != previous_manifest_bytes:
            raise AssetError('旧七图清单在追加期间发生变化')
        _write_bytes_atomically(MANIFEST_PATH, manifest_bytes)
        manifest_replaced = True
        candidate_count, total_bytes = check_assets()
    except Exception:
        if manifest_replaced:
            _write_bytes_atomically(MANIFEST_PATH, previous_manifest_bytes)
        for installed_path in installed_paths:
            if installed_path.parent == output_root and installed_path.is_file():
                installed_path.unlink()
        raise

    return candidate_count, total_bytes, source_records


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--append-source-dir', type=Path, help='显式追加的六张新照片所在目录')
    parser.add_argument('--start-index', type=int, help='新增照片的首页编号，必须紧接当前清单')
    parser.add_argument('--count', type=int, help='本次追加照片数量')
    parser.add_argument('--check', action='store_true', help='只核验提交的清单和派生资源，不读取来源目录')
    arguments = parser.parse_args()

    append_arguments = (arguments.append_source_dir, arguments.start_index, arguments.count)
    if arguments.check and any(value is not None for value in append_arguments):
        parser.error('--check 不能与追加参数同时使用')
    if not arguments.check and any(value is None for value in append_arguments):
        parser.error('生成资源必须显式提供 --append-source-dir、--start-index 和 --count')

    try:
        if arguments.check:
            count, total_bytes = check_assets()
            print(f'home hero assets OK: {count} candidates, {total_bytes:,} bytes; source directory not accessed')
        else:
            count, total_bytes, source_records = append_images(
                arguments.append_source_dir,
                arguments.start_index,
                arguments.count,
            )
            for source_record in source_records:
                print(
                    f"source {source_record['file']}: {source_record['bytes']:,} bytes; "
                    f"sha256={source_record['sha256']}; "
                    f"EXIF Orientation={source_record['exifOrientation']}; "
                    f"pixels={source_record['width']}x{source_record['height']} -> "
                    f"{source_record['orientedWidth']}x{source_record['orientedHeight']}"
                )
            print(f'generated and verified {count} home hero candidates ({total_bytes:,} bytes)')
    except AssetError as error:
        print(f'home hero asset error: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

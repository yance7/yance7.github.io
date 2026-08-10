#!/usr/bin/env python3
"""Integration tests for the local, atomic album-cover preparation script."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image


REPOSITORY = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPOSITORY / 'scripts' / 'prepare-album-covers.py'
TEST_RESULTS_DIR = REPOSITORY / 'test-results'


def load_script_module():
    spec = importlib.util.spec_from_file_location('prepare_album_covers', SCRIPT_PATH)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def write_sources(source_dir: Path, album_ids: tuple[str, ...], *, low_resolution_id: str | None = None, noisy_id: str | None = None) -> None:
    for index, album_id in enumerate(album_ids):
        if album_id == noisy_id:
            image = Image.effect_noise((1200, 1200), 100).convert('RGB')
        else:
            size = 640 if album_id == low_resolution_id else 1200
            image = Image.new('RGB', (size, size), (index * 7 % 256, index * 13 % 256, index * 19 % 256))
        image.save(source_dir / f'{album_id}.jpg', format='JPEG', quality=95)


def output_snapshot(output_dir: Path) -> dict[str, bytes]:
    return {
        file.relative_to(output_dir).as_posix(): file.read_bytes()
        for file in output_dir.rglob('*')
        if file.is_file()
    }


def seed_existing_output(output_dir: Path, album_ids: tuple[str, ...]) -> dict[str, bytes]:
    thumbs_dir = output_dir / 'thumbs'
    thumbs_dir.mkdir(parents=True)
    for album_id in album_ids:
        (output_dir / f'{album_id}.jpg').write_bytes(f'old-jpeg:{album_id}'.encode())
        for size in (640, 1200):
            (thumbs_dir / f'{album_id}-{size}.webp').write_bytes(f'old-webp:{album_id}:{size}'.encode())
    return output_snapshot(output_dir)


class PrepareAlbumCoversTests(unittest.TestCase):
    def setUp(self) -> None:
        self.module = load_script_module()
        TEST_RESULTS_DIR.mkdir(exist_ok=True)
        self.temp_dir = tempfile.TemporaryDirectory(dir=TEST_RESULTS_DIR)
        self.root = Path(self.temp_dir.name)
        self.source_dir = self.root / 'sources'
        self.source_dir.mkdir()
        self.output_dir = self.root / 'output'

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_prepares_all_expected_validated_cover_variants(self) -> None:
        write_sources(self.source_dir, self.module.ALBUM_IDS)

        self.module.prepare_album_covers(self.source_dir, self.output_dir)

        generated = output_snapshot(self.output_dir)
        self.assertEqual(len(generated), len(self.module.ALBUM_IDS) * 3)
        for album_id in self.module.ALBUM_IDS:
            with Image.open(self.output_dir / f'{album_id}.jpg') as image:
                self.assertEqual((image.format, image.mode, image.size), ('JPEG', 'RGB', (1200, 1200)))
            for size in (640, 1200):
                variant = self.output_dir / 'thumbs' / f'{album_id}-{size}.webp'
                with Image.open(variant) as image:
                    self.assertEqual((image.format, image.mode, image.size), ('WEBP', 'RGB', (size, size)))
                self.assertLessEqual(variant.stat().st_size, self.module.MAX_WEBP_BYTES[size])

    def test_rejects_low_resolution_input_without_changing_existing_output(self) -> None:
        write_sources(self.source_dir, self.module.ALBUM_IDS, low_resolution_id=self.module.ALBUM_IDS[0])
        before = seed_existing_output(self.output_dir, self.module.ALBUM_IDS)

        with self.assertRaisesRegex(ValueError, 'at least 1200px'):
            self.module.prepare_album_covers(self.source_dir, self.output_dir)

        self.assertEqual(output_snapshot(self.output_dir), before)
        self.assertEqual(list(self.output_dir.glob('.prepare-album-covers-*')), [])

    def test_late_webp_failure_leaves_existing_output_untouched(self) -> None:
        write_sources(self.source_dir, self.module.ALBUM_IDS, noisy_id=self.module.ALBUM_IDS[-1])
        before = seed_existing_output(self.output_dir, self.module.ALBUM_IDS)

        with self.assertRaisesRegex(ValueError, 'exceeds'):
            self.module.prepare_album_covers(self.source_dir, self.output_dir)

        self.assertEqual(output_snapshot(self.output_dir), before)
        self.assertEqual(list(self.output_dir.glob('.prepare-album-covers-*')), [])


if __name__ == '__main__':
    unittest.main()

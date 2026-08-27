import argparse
import tempfile
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'design-assets' / 'yance-brand-master.png'
OUTPUT = ROOT / 'public' / 'assets' / 'brand'

FULL_SIZES = (256, 128, 96, 64, 48)
ICON_SIZES = (16, 32, 180, 192, 512)

ICON_BACKGROUND = (7, 29, 48, 255)
ICON_GOLD = (229, 174, 83, 255)
ICON_GOLD_LIGHT = (255, 214, 125, 255)
ICON_TEAL = (24, 187, 204, 255)
ICON_NAVY = (8, 47, 76, 255)
ICON_EDGE = (255, 216, 132, 255)


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


def draw_icon_polygon(draw: Image.Image, coords: list[tuple[int, int]], fill: tuple[int, int, int, int]) -> None:
    draw.polygon(coords, fill=fill)


def make_simplified_icon(size: int = 512, node_count: int = 4) -> Image.Image:
    """Build a size-aware Y, orbit, audio and neural micro identity."""
    from PIL import ImageDraw

    image = Image.new('RGBA', (size, size), ICON_BACKGROUND)
    draw = ImageDraw.Draw(image)
    scale = size / 512

    def points(coords: list[tuple[int, int]]) -> list[tuple[int, int]]:
        return [(round(x * scale), round(y * scale)) for x, y in coords]

    def box(coords: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
        return tuple(round(value * scale) for value in coords)

    def width(value: int) -> int:
        return max(1, round(value * scale))

    # Keep one restrained orbit behind the Y; omit the master's dense mesh.
    orbit_box = box((42, 116, 470, 404))
    draw.ellipse(orbit_box, outline=ICON_TEAL, width=width(9))
    draw.arc(orbit_box, start=152, end=236, fill=ICON_GOLD_LIGHT, width=width(6))

    # These three bold masses preserve the selected master's Y silhouette.
    left_arm = [
        (42, 70), (205, 70), (204, 101), (185, 106), (169, 117),
        (160, 134), (166, 156), (180, 181), (198, 207), (220, 232),
        (245, 252), (265, 267), (237, 263), (208, 250), (180, 232),
        (153, 210), (128, 181), (103, 149), (78, 119), (42, 103),
    ]
    right_arm = [
        (307, 70), (470, 70), (470, 103), (434, 119), (409, 149),
        (384, 181), (359, 210), (332, 232), (304, 250), (277, 263),
        (247, 267), (267, 252), (292, 232), (314, 207), (332, 181),
        (346, 156), (352, 134), (343, 117), (327, 106), (307, 101),
    ]
    stem = [
        (218, 238), (294, 238), (293, 287), (294, 338), (305, 389),
        (320, 412), (362, 426), (362, 448), (150, 448), (150, 426),
        (192, 412), (207, 389), (218, 338), (219, 287),
    ]
    draw_icon_polygon(draw, points(left_arm), ICON_GOLD)
    draw_icon_polygon(draw, points(right_arm), ICON_GOLD)
    draw_icon_polygon(draw, points(stem), ICON_GOLD)

    # Broad navy recesses and one teal ribbon retain the master's contrast system.
    draw_icon_polygon(draw, points([
        (143, 82), (196, 82), (195, 104), (185, 115), (184, 132),
        (198, 162), (222, 198), (250, 231), (267, 247), (247, 239),
        (220, 221), (194, 196), (169, 166), (149, 136),
    ]), ICON_NAVY)
    draw_icon_polygon(draw, points([
        (314, 82), (367, 82), (361, 136), (341, 166), (318, 196),
        (291, 221), (266, 239), (247, 247), (264, 231), (292, 198),
        (316, 162), (330, 132), (329, 115), (319, 104),
    ]), ICON_NAVY)
    draw_icon_polygon(draw, points([
        (240, 248), (271, 248), (273, 289), (274, 341), (285, 391),
        (300, 416), (321, 426), (191, 426), (212, 416), (227, 391),
        (238, 341), (239, 289),
    ]), ICON_NAVY)
    draw_icon_polygon(draw, points([
        (197, 82), (217, 82), (222, 111), (236, 143), (255, 173),
        (277, 202), (292, 222), (273, 245), (250, 226), (228, 197),
        (208, 165), (194, 131),
    ]), ICON_TEAL)
    draw_icon_polygon(draw, points([
        (253, 245), (273, 230), (282, 249), (279, 293), (280, 343),
        (290, 388), (302, 411), (283, 421), (264, 386), (255, 340),
    ]), ICON_TEAL)

    # A compact waveform makes the music/audio motif explicit at every size.
    waveform_x = (226, 240, 254, 268, 282, 296)
    waveform_height = (26, 48, 76, 102, 68, 40)
    waveform_center = 310
    for x, height in zip(waveform_x, waveform_height):
        draw.line(
            points([(x, waveform_center - height // 2), (x, waveform_center + height // 2)]),
            fill=ICON_GOLD_LIGHT,
            width=width(12)
        )

    # Four large nodes echo the master's neural/circuit accents. The 16px
    # favicon intentionally keeps the first three only to avoid micro-noise.
    neural_edges = [
        ((96, 333), (135, 270)),
        ((401, 158), (364, 205)),
        ((390, 405), (342, 372)),
        ((127, 177), (170, 196)),
    ]
    for start, end in neural_edges[:node_count]:
        draw.line(points([start, end]), fill=ICON_EDGE, width=width(7))

    nodes = [
        ((96, 333), ICON_TEAL),
        ((401, 158), ICON_GOLD_LIGHT),
        ((390, 405), ICON_TEAL),
        ((127, 177), ICON_GOLD_LIGHT),
    ]
    for (x, y), fill in nodes[:node_count]:
        draw.ellipse(box((x - 21, y - 21, x + 21, y + 21)), fill=fill, outline=ICON_EDGE, width=width(6))
    return image


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
        # Preserve three readable nodes at 16px; larger icons can carry the
        # fourth accent without competing with the Y and waveform.
        icon = make_simplified_icon(node_count=3 if size == 16 else 4)
        save_png(resize(icon, size), output / f'yance-icon-{size}.png' if size >= 180 else output / f'favicon-{size}.png')


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

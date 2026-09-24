"""Build deterministic WOFF2 subsets for the three-language Home Hero."""

from __future__ import annotations

import argparse
from pathlib import Path

from fontTools import subset, ttLib


REQUIRED_GLYPHS = {
    "sc": "你好，我是 Yance研究、构建与现场相遇",
    "tc": "你好，我是 Yance研究、建構與現場相遇",
}
UNIX_EPOCH_FONT_TIMESTAMP = 0x7C259DC0


def font_codepoints(font: ttLib.TTFont) -> set[int]:
    codepoints: set[int] = set()
    for table in font["cmap"].tables:
        if table.isUnicode():
            codepoints.update(table.cmap)
    return codepoints


def ensure_coverage(font: ttLib.TTFont, required: str, label: str) -> None:
    missing = sorted({char for char in required if ord(char) not in font_codepoints(font)})
    if missing:
        raise ValueError(f"{label} source is missing required characters: {''.join(missing)}")


def subset_font(source: Path, output: Path, required: str, label: str) -> None:
    font = ttLib.TTFont(source)
    ensure_coverage(font, required, label)

    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.recommended_glyphs = True
    options.hinting = True
    options.legacy_kern = True
    options.glyph_names = False

    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=required)
    subsetter.subset(font)

    if "head" in font:
        font["head"].modified = UNIX_EPOCH_FONT_TIMESTAMP
    font.recalcTimestamp = False
    output.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(output)

    built = ttLib.TTFont(output)
    ensure_coverage(built, required, label)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sc-source", type=Path, required=True)
    parser.add_argument("--tc-source", type=Path, required=True)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("public/assets/fonts"),
    )
    args = parser.parse_args()

    subset_font(
        args.sc_source,
        args.output_dir / "lxgw-wenkai-hero-sc.woff2",
        REQUIRED_GLYPHS["sc"],
        "Simplified Chinese",
    )
    subset_font(
        args.tc_source,
        args.output_dir / "lxgw-wenkai-hero-tc.woff2",
        REQUIRED_GLYPHS["tc"],
        "Traditional Chinese",
    )


if __name__ == "__main__":
    main()

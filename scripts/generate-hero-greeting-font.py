"""Build or validate the local homepage subset; never download during a build."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
VERSION = '1.522'
SOURCE_URL = 'https://github.com/lxgw/LxgwWenkaiTC/releases/download/v1.522/LXGWWenKaiTC-Regular.ttf'
SOURCE_SHA256 = 'b1a0795862c1415bf3f393ea50b2a4ea6275012cf5bad3f94feeb1222f555731'
OUTPUT = ROOT / 'src/assets/fonts/hero-greeting-wenkai-tc-regular.woff2'
MANIFEST = ROOT / 'src/assets/fonts/hero-greeting-font.json'


def digest(path):
  return hashlib.sha256(path.read_bytes()).hexdigest()


def characters():
  result = subprocess.run(
    ['node', '--import', 'tsx', 'scripts/export-hero-greeting-characters.ts'],
    cwd=ROOT, check=True, capture_output=True, text=True, encoding='utf-8'
  )
  return json.loads(result.stdout)


def validate(font, required):
  missing = sorted(set(map(ord, required)) - set(font.getBestCmap()))
  if missing:
    raise ValueError('Missing greeting glyphs: ' + ', '.join(f'U+{code:04X}' for code in missing))
  if font['OS/2'].usWeightClass != 400 or font['post'].isFixedPitch:
    raise ValueError('Expected real Regular 400, non-Mono face')
  if font['name'].getDebugName(1) != 'LXGW WenKai TC':
    raise ValueError('Unexpected font family')


def main():
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument('--source', type=Path, help='Official v1.522 Regular TTF; SHA-256 is enforced')
  parser.add_argument('--check', action='store_true', help='Validate actual committed WOFF2 cmap, metadata and hash')
  args = parser.parse_args()
  text = characters()
  if not args.check:
    if args.source is None:
      parser.error('--source is required for generation; download the pinned SOURCE_URL separately')
    if digest(args.source) != SOURCE_SHA256:
      raise ValueError('Official source SHA-256 mismatch')
    font = TTFont(args.source, recalcTimestamp=False)
    validate(font, text['characters'])
    options = subset.Options()
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    options.name_legacy = True
    options.name_languages = ['*']
    options.recalc_timestamp = False
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text['characters'])
    subsetter.subset(font)
    font.flavor = 'woff2'
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    font.save(OUTPUT)
    MANIFEST.write_text(json.dumps({
      'family': 'LXGW WenKai TC', 'style': 'Regular', 'weight': 400,
      'version': VERSION, 'sourceUrl': SOURCE_URL, 'sourceSha256': SOURCE_SHA256,
      'sourceBytes': args.source.stat().st_size, 'subsetBytes': OUTPUT.stat().st_size,
      'subsetSha256': digest(OUTPUT), 'license': 'SIL Open Font License 1.1',
      'characters': text['characters']
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
  with TTFont(OUTPUT) as font:
    validate(font, text['characters'])
  manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
  if manifest['subsetSha256'] != digest(OUTPUT) or manifest['sourceSha256'] != SOURCE_SHA256:
    raise ValueError('Committed font provenance/hash mismatch')
  if manifest['subsetBytes'] != OUTPUT.stat().st_size:
    raise ValueError('Committed font size mismatch')
  print(json.dumps({'glyphCoverage': 'complete', 'requiredCharacters': len(text['characters']),
                    'bytes': OUTPUT.stat().st_size, 'sha256': digest(OUTPUT)}, ensure_ascii=False))


if __name__ == '__main__':
  main()

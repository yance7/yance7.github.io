import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('media release contracts', () => {
  it('reserves a stable responsive lightbox stage', () => {
    const components = readFileSync(resolve(root, 'src/styles/components.css'), 'utf8')
    expect(components).toMatch(/\.lb-stage\s*\{[\s\S]*position:\s*absolute;[\s\S]*inset:\s*44px\s+44px\s+calc\(var\(--lb-meta-reserve\)\s*\+\s*44px\)/)
    expect(components).toMatch(/\.lb-stage\s+img\s*\{[\s\S]*max-height:\s*min\(100%,/)
  })

  it('reports a clean asset metadata audit without changing files', () => {
    const audit = readFileSync(resolve(root, 'scripts/audit-assets.py'), 'utf8')
    expect(audit).toContain('image.verify()')
    expect(audit).toContain('Image.open(path)')
    expect(audit).toContain('reopened.load()')
    expect(audit).toContain('reopened.seek(frame_index)')
    expect(audit).toContain('GPS metadata:')
    expect(audit).toContain('Unreadable files:')
    expect(audit).toContain('return 1 if gps_files or sensitive_metadata_files or unreadable else 0')
  })

  it('blocks sensitive EXIF, XMP, and text metadata while allowing technical fields', () => {
    const audit = readFileSync(resolve(root, 'scripts/audit-assets.py'), 'utf8')

    expect(audit).toContain('SENSITIVE_METADATA_KEYS')
    expect(audit).toContain('TECHNICAL_METADATA_KEYS')
    expect(audit).toContain('getexif()')
    expect(audit).toContain('getxmp()')
    expect(audit).toContain('image.info')
    expect(audit).toContain('image.text')
    expect(audit).toContain('Sensitive metadata:')
    expect(audit).toContain('Sensitive metadata file:')
    expect(audit).toContain('sensitive_metadata_files')
    expect(audit).toContain('relative_to(ROOT).as_posix()')
    expect(audit).toContain('return 1 if gps_files or sensitive_metadata_files or unreadable else 0')

    for (const key of [
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
      'DateTimeDigitized'
    ]) {
      expect(audit).toContain(`'${key}'`)
    }

    for (const key of [
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
      'background'
    ]) {
      expect(audit).toContain(`'${key}'`)
    }
  })

  it('keeps concert poster ICC conversion compatible with the pinned Pillow API', () => {
    const processor = readFileSync(resolve(root, 'scripts/process-concert-poster.py'), 'utf8')
    expect(processor).toContain("outputMode='RGB'")
    expect(processor).not.toContain("output_mode='RGB'")
  })

  it('preserves required Chinese punctuation in Hero WOFF2 subsets', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'yance-home-hero-fonts-'))
    const outputDir = join(fixtureRoot, 'fonts')
    const scriptPath = resolve(root, 'scripts/subset-home-hero-fonts.py')
    const scSource = resolve(root, 'public/assets/fonts/lxgw-wenkai-hero-sc.woff2')
    const tcSource = resolve(root, 'public/assets/fonts/lxgw-wenkai-hero-tc.woff2')

    try {
      const result = spawnSync('python', [
        scriptPath,
        '--sc-source', scSource,
        '--tc-source', tcSource,
        '--output-dir', outputDir
      ], { cwd: root, encoding: 'utf8' })
      const output = `${result.stdout}${result.stderr}`

      expect(result.status).toBe(0)
      expect(output).not.toContain('timestamp seems very low')

      const scSignature = readFileSync(join(outputDir, 'lxgw-wenkai-hero-sc.woff2')).subarray(0, 4).toString('ascii')
      const tcSignature = readFileSync(join(outputDir, 'lxgw-wenkai-hero-tc.woff2')).subarray(0, 4).toString('ascii')

      expect(scSignature).toBe('wOF2')
      expect(tcSignature).toBe('wOF2')

      const coverageCheck = spawnSync('python', [
        '-c',
        `from pathlib import Path
from fontTools.ttLib import TTFont
from runpy import run_path
import sys

fonts = Path(sys.argv[1])
script = Path(sys.argv[2])
comma = '，'
required_glyphs = run_path(script)['REQUIRED_GLYPHS']
missing_manifest = [locale for locale, text in required_glyphs.items() if comma not in text]
missing = [
    name for name in ('lxgw-wenkai-hero-sc.woff2', 'lxgw-wenkai-hero-tc.woff2')
    if ord(comma) not in set(TTFont(fonts / name).getBestCmap())
]
if missing_manifest:
    raise SystemExit(f'Full-width comma missing from required glyphs: {", ".join(missing_manifest)}')
if missing:
    raise SystemExit(f'Full-width comma missing from: {", ".join(missing)}')
`,
        outputDir,
        scriptPath
      ], { cwd: root, encoding: 'utf8' })

      expect(coverageCheck.status, `${coverageCheck.stdout}${coverageCheck.stderr}`).toBe(0)
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('executes the auditor against sensitive, technical, GPS, and corrupt fixtures', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'yance-asset-audit-'))
    const scriptPath = join(fixtureRoot, 'scripts', 'audit-assets.py')
    const assetsPath = join(fixtureRoot, 'public', 'assets')
    mkdirSync(join(fixtureRoot, 'scripts'), { recursive: true })
    mkdirSync(assetsPath, { recursive: true })
    copyFileSync(resolve(root, 'scripts/audit-assets.py'), scriptPath)

    const fixtureScript = `
from pathlib import Path

from PIL import Image, PngImagePlugin


assets = Path(${JSON.stringify(assetsPath)})
image = Image.new('RGB', (4, 4), (10, 20, 30))
image.save(assets / 'clean.jpg')

exif = Image.Exif()
exif[306] = '2026:09:18 12:00:00'
exif[36867] = '2026:09:18 12:00:00'
image.save(assets / 'exif.jpg', exif=exif)

gps = Image.Exif()
gps[34853] = {1: 'N'}
image.save(assets / 'gps.jpg', exif=gps)

text = PngImagePlugin.PngInfo()
text.add_text('Comment', 'private note')
image.save(assets / 'text.png', pnginfo=text)

xmp = PngImagePlugin.PngInfo()
xmp.add_itxt('XML:com.adobe.xmp', '<x:xmpmeta>private note</x:xmpmeta>')
image.save(assets / 'xmp.png', pnginfo=xmp)

frame = Image.new('RGB', (4, 4), (40, 50, 60))
image.save(assets / 'technical.gif', save_all=True, append_images=[frame], duration=10, loop=0)
(assets / 'corrupt.jpg').write_bytes(b'not an image')
`

    try {
      execFileSync('python', ['-c', fixtureScript], { cwd: fixtureRoot })
      const result = spawnSync('python', [scriptPath], {
        cwd: fixtureRoot,
        encoding: 'utf8'
      })
      const output = `${result.stdout}${result.stderr}`

      expect(result.status).toBe(1)
      expect(output).toContain('Image files: 7')
      expect(output).toContain('GPS metadata: 1')
      expect(output).toContain('Sensitive metadata: 4')
      expect(output).toContain('Unreadable files: 1')
      expect(output).toMatch(/Sensitive metadata file: public[\\/]assets[\\/]exif\.jpg .*DateTimeOriginal/)
      expect(output).toMatch(/Sensitive metadata file: public[\\/]assets[\\/]gps\.jpg .*GPSInfo/)
      expect(output).toMatch(/Sensitive metadata file: public[\\/]assets[\\/]text\.png .*Comment/)
      expect(output).toMatch(/Sensitive metadata file: public[\\/]assets[\\/]xmp\.png .*XML:com\.adobe\.xmp/)
      expect(output).toContain('Unreadable file: public/assets/corrupt.jpg')
      expect(output).not.toContain('clean.jpg')
      expect(output).not.toContain('technical.gif')
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })
})

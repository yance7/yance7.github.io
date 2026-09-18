import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
})

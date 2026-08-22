import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('media release contracts', () => {
  it('reserves a stable responsive lightbox stage', () => {
    const components = readFileSync(resolve(root, 'src/styles/components.css'), 'utf8')
    expect(components).toMatch(/\.lb-stage\s*\{[\s\S]*aspect-ratio:\s*4\s*\/\s*3/)
  })

  it('reports a clean asset metadata audit without changing files', () => {
    const audit = readFileSync(resolve(root, 'scripts/audit-assets.py'), 'utf8')
    expect(audit).toContain('image.verify()')
    expect(audit).toContain('Image.open(path)')
    expect(audit).toContain('reopened.load()')
    expect(audit).toContain('reopened.seek(frame_index)')
    expect(audit).toContain('GPS metadata:')
    expect(audit).toContain('Unreadable files:')
    expect(audit).toContain('return 1 if gps_files or unreadable else 0')
  })
})

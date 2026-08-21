import { execFileSync } from 'node:child_process'
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
    const output = execFileSync('python', ['scripts/audit-assets.py'], {
      cwd: root,
      encoding: 'utf8'
    })
    expect(output).toContain('GPS metadata: 0')
    expect(output).toContain('Unreadable files: 0')
  })
})

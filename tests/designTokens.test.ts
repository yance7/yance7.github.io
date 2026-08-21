import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('archive design tokens', () => {
  it('defines the archive typography and layout scale', () => {
    const theme = readFileSync(resolve(process.cwd(), 'src/theme.css'), 'utf8')
    const base = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8')

    expect(theme).toContain('--type-body-size: 1rem')
    expect(theme).toContain('--type-meta-size: .75rem')
    expect(theme).toContain('--w-editorial: 700px')
    expect(theme).toContain('--w-data: 840px')
    expect(base).toContain('font-size: var(--type-body-size)')
  })
})

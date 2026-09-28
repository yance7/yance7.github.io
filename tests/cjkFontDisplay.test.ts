import { describe, expect, it } from 'vitest'
import { getCjkFontDisplay } from '../scripts/cjk-font-display'

describe('CJK font display', () => {
  it('uses the optional display mode for bundled CJK faces', () => {
    expect(getCjkFontDisplay('Noto Sans SC Variable', 'swap')).toBe('optional')
    expect(getCjkFontDisplay('Noto Sans HK Variable', 'swap')).toBe('optional')
  })

  it('keeps Latin and non-swap faces unchanged', () => {
    expect(getCjkFontDisplay('Inter Variable', 'swap')).toBe('swap')
    expect(getCjkFontDisplay('Noto Sans SC Variable', 'block')).toBe('block')
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getContrastRatio, parseHexColor } from '../src/utils/contrast'

const theme = readFileSync(resolve(process.cwd(), 'src/theme.css'), 'utf8')

function themeColor(selector: '--ink' | '--muted' | '--gold-text' | '--aqua' | '--bg', scope: 'light' | 'dark') {
  const block = scope === 'light'
    ? theme.match(/:root,\s*\[data-theme='light'\]\s*\{([\s\S]*?)\n\}/)?.[1]
    : theme.match(/\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/)?.[1]
  const value = block?.match(new RegExp(`${selector}:\\s*(#[0-9A-Fa-f]{6})`))?.[1]
  if (!value) throw new Error(`Missing ${selector} in ${scope} theme`)
  return value
}

describe('contrast helpers', () => {
  it('parses six-digit hex colors and rejects malformed values', () => {
    expect(parseHexColor('#1B2523')).toEqual({ r: 27, g: 37, b: 35 })
    expect(() => parseHexColor('rgb(1, 2, 3)')).toThrow(/hex/i)
  })

  it('calculates the WCAG contrast ratio independent of argument order', () => {
    const lightOnDark = getContrastRatio('#F3F0E9', '#0A1014')
    expect(lightOnDark).toBeGreaterThanOrEqual(4.5)
    expect(getContrastRatio('#0A1014', '#F3F0E9')).toBeCloseTo(lightOnDark, 8)
  })

  it.each(['light', 'dark'] as const)('keeps normal text roles readable in %s theme', (scope) => {
    const background = themeColor('--bg', scope)
    for (const role of ['--ink', '--muted', '--gold-text', '--aqua'] as const) {
      expect(
        getContrastRatio(themeColor(role, scope), background),
        `${scope} ${role} against ${background}`
      ).toBeGreaterThanOrEqual(4.5)
    }
  })
})

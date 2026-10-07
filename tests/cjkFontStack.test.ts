import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const theme = readFileSync(resolve(process.cwd(), 'src/theme.css'), 'utf8')
const cjkFontStacks = [...theme.matchAll(/--font-cjk-sans:\s*([^;]+);/g)].map((match) => match[1])

describe('platform CJK font stack', () => {
  it('uses native simplified Chinese fonts before the bundled fallback', () => {
    const simplified = cjkFontStacks.at(0) ?? ''

    expect(simplified).toContain('Microsoft YaHei')
    expect(simplified).toContain('Noto Sans CJK SC')
    expect(simplified.indexOf('Noto Sans CJK SC')).toBeLessThan(simplified.indexOf('Noto Sans SC Variable'))
  })

  it('uses native traditional Chinese fonts before the bundled fallback', () => {
    const traditional = cjkFontStacks.at(1) ?? ''

    expect(traditional).toContain('Microsoft JhengHei')
    expect(traditional).toContain('Noto Sans CJK TC')
    expect(traditional.indexOf('Noto Sans CJK TC')).toBeLessThan(traditional.indexOf('Noto Sans HK Variable'))
  })
})

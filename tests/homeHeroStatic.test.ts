import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getLocalizedHomeCopy } from '../src/data/locales'

const root = resolve(process.cwd())

describe('HomeHero static contract', () => {
  it('publishes the approved final copy for all locales', () => {
    expect(getLocalizedHomeCopy('zh-CN')).toMatchObject({
      heroGreeting: '你好，我是 Yance',
      heroStatement: '研究、构建，与现场相遇'
    })
    expect(getLocalizedHomeCopy('zh-HK')).toMatchObject({
      heroGreeting: '你好，我是 Yance',
      heroStatement: '研究、建構，與現場相遇'
    })
    expect(getLocalizedHomeCopy('en')).toMatchObject({
      heroGreeting: 'Hi, I’m Yance',
      heroStatement: 'Research, build, and meet the live world'
    })
  })

  it('keeps semantic copy separate from the decorative cursor layer', () => {
    const hero = readFileSync(resolve(root, 'src/components/HomeHero.vue'), 'utf8')
    const typewriter = readFileSync(resolve(root, 'src/components/HomeHeroTypewriter.vue'), 'utf8')

    expect(hero).toContain('class="home-hero-title sr-only"')
    expect(hero).toContain('<HomeHeroTypewriter')
    expect(typewriter).toContain('aria-hidden="true"')
    expect(typewriter).toContain('class="home-hero-cursor" aria-hidden="true"')
  })

  it('loads local script-specific sans faces without the former brush subsets', () => {
    const theme = readFileSync(resolve(root, 'src/theme.css'), 'utf8')
    const stylesheets = [
      readFileSync(resolve(root, 'src/fonts-en.css'), 'utf8'),
      readFileSync(resolve(root, 'src/fonts-zh-cn.css'), 'utf8'),
      readFileSync(resolve(root, 'src/fonts-zh-hk.css'), 'utf8')
    ]

    expect(theme).toContain('--font-home-title: var(--font-latin-serif), var(--font-cjk-sans), sans-serif')
    expect(stylesheets[0]).toContain("@import '@fontsource-variable/noto-sans-sc/index.css'")
    expect(stylesheets[1]).toContain("@import '@fontsource-variable/noto-sans-sc/index.css'")
    expect(stylesheets[2]).toContain("@import '@fontsource-variable/noto-sans-hk/index.css'")

    for (const stylesheet of stylesheets) {
      expect(stylesheet).toContain("@import './fonts.css'")
      expect(stylesheet).not.toMatch(/url\(['"]?https?:/)
      expect(stylesheet).not.toContain('noto-serif')
    }

    expect(theme).not.toContain('LXGW WenKai')
  })
})

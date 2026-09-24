import { readFileSync, statSync } from 'node:fs'
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

  it('ships only local, bounded font subsets for the Hero', () => {
    const fontCss = readFileSync(resolve(root, 'src/fonts.css'), 'utf8')
    const fontFiles = [
      resolve(root, 'public/assets/fonts/lxgw-wenkai-hero-sc.woff2'),
      resolve(root, 'public/assets/fonts/lxgw-wenkai-hero-tc.woff2')
    ]

    for (const file of fontFiles) {
      expect(statSync(file).size, file).toBeLessThanOrEqual(100 * 1024)
    }

    expect(fontCss).toContain('/assets/fonts/lxgw-wenkai-hero-sc.woff2')
    expect(fontCss).toContain('/assets/fonts/lxgw-wenkai-hero-tc.woff2')
    expect(fontCss).not.toMatch(/url\(['"]?https?:/)
  })

  it('pins the reproducible font subset toolchain', () => {
    const requirements = readFileSync(resolve(root, 'requirements-tools.txt'), 'utf8')
    const script = readFileSync(resolve(root, 'scripts/subset-home-hero-fonts.py'), 'utf8')

    expect(requirements).toContain('fonttools==4.65.0')
    expect(script).toContain('fontTools')
    expect(script).toContain('lxgw-wenkai-hero-sc.woff2')
    expect(script).toContain('lxgw-wenkai-hero-tc.woff2')
  })
})

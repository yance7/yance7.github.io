import { describe, expect, it } from 'vitest'
import { injectPrerenderedHtml } from '../scripts/prerenderHtml'

const manifest = {
  '../src/pages/HomePage.vue': {
    file: 'assets/vue/HomePage.js',
    css: ['assets/vue/HomePage.css'],
    imports: ['_SectionHeading.js']
  },
  '../src/pages/ResearchPage.vue': {
    file: 'assets/vue/ResearchPage.js',
    css: ['assets/vue/ResearchPage.css']
  },
  '_SectionHeading.js': {
    file: 'assets/vue/SectionHeading.js',
    css: ['assets/vue/SectionHeading.css']
  },
  '../src/fonts-zh-cn.css': { file: 'assets/vue/fonts-zh-cn.css' },
  '../src/fonts-zh-hk.css': { file: 'assets/vue/fonts-zh-hk.css' },
  '../src/fonts-en.css': { file: 'assets/vue/fonts-en.css' },
  '../src/fonts-home-hero.css': { file: 'assets/vue/fonts-home-hero.css' }
}

const source = '<!doctype html><html lang="zh-CN"><head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'"></head><body data-page="home" data-locale="zh-CN"><div id="app"></div><noscript><p>核心内容与链接可直接浏览；动态效果与部分交互需要 JavaScript。</p></noscript></body></html>'

describe('prerendered HTML injection', () => {
  it('injects localized markup, page dependencies, and only the relevant font stylesheets', () => {
    const html = injectPrerenderedHtml({
      shell: source,
      appHtml: '<main id="main"><h1>你好</h1></main>',
      page: 'home',
      locale: 'zh-CN',
      renderDateIso: '2026-11-01',
      modules: new Set(['src/pages/HomePage.vue', 'src/components/SectionHeading.vue']),
      manifest
    })

    expect(html).toContain('<div id="app"><main id="main"><h1>你好</h1></main></div>')
    expect(html).toContain('data-rendered="ssg"')
    expect(html).toContain('data-render-date="2026-11-01"')
    expect(html).toContain('href="/assets/vue/HomePage.css"')
    expect(html).toContain('href="/assets/vue/SectionHeading.css"')
    expect(html).toContain('href="/assets/vue/fonts-zh-cn.css"')
    expect(html).toContain('href="/assets/vue/fonts-home-hero.css"')
    expect(html).toContain('rel="modulepreload" href="/assets/vue/HomePage.js"')
    expect(html).toContain('rel="modulepreload" href="/assets/vue/SectionHeading.js"')
    expect(html).not.toContain('fonts-zh-hk.css')
    expect(html).not.toContain('fonts-en.css')
    expect(html).toContain('default-src \'self\'')
  })

  it('fails rather than silently leaving an empty app root', () => {
    expect(() => injectPrerenderedHtml({
      shell: '<html><head></head><body></body></html>',
      appHtml: '<main>content</main>',
      page: 'research',
      locale: 'en',
      renderDateIso: '2026-11-01',
      modules: new Set(),
      manifest
    })).toThrow(/exactly one #app mount point/u)
  })

  it('places body Teleport markup outside the hydrated app root', () => {
    const shellWithLeadingScript = source.replace('<div id="app"></div>', '<script src="/assets/legacy-redirect.js" data-home-alias></script><div id="app"></div>')
    const html = injectPrerenderedHtml({
      shell: shellWithLeadingScript,
      appHtml: '<main id="main"><h1>Research</h1></main>',
      teleports: { body: '<!--teleport start anchor--><!--teleport anchor-->' },
      page: 'research',
      locale: 'en',
      renderDateIso: '2026-11-01',
      modules: new Set(),
      manifest
    })

    expect(html).toContain('<body data-page="home" data-locale="zh-CN" data-rendered="ssg" data-render-date="2026-11-01"><!--teleport start anchor--><!--teleport anchor--><script src="/assets/legacy-redirect.js" data-home-alias></script><div id="app"><main id="main"><h1>Research</h1></main></div>')
  })
})

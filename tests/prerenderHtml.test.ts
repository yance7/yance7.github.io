import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { injectPrerenderedHtml, retainFontFacesForMarkup } from '../scripts/prerenderHtml'
import { uiMessages } from '../src/i18n/messages'

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
  '../src/pages/WorksPage.vue': {
    file: 'assets/vue/WorksPage.js',
    css: ['assets/vue/WorksPage.css'],
    imports: ['_SectionHeading.js']
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
      manifest,
      localeFontStylesheet: 'assets/vue/fonts-route-zh-cn-abc123.css'
    })

    expect(html).toContain('<div id="app"><main id="main"><h1>你好</h1></main></div>')
    expect(html).toContain('data-rendered="ssg"')
    expect(html).toContain('data-render-date="2026-11-01"')
    expect(html).toContain('href="/assets/vue/HomePage.css"')
    expect(html).toContain('href="/assets/vue/SectionHeading.css"')
    expect(html).toContain('href="/assets/vue/fonts-route-zh-cn-abc123.css"')
    expect(html).not.toContain('href="/assets/vue/fonts-zh-cn.css"')
    expect(html).toContain('data-locale-font-stylesheet="/assets/vue/fonts-route-zh-cn-abc123.css"')
    expect(html).toMatch(/<head>[\s\S]*?<link rel="stylesheet" href="\/assets\/vue\/fonts-route-zh-cn-abc123\.css">[\s\S]*?<\/head>/u)
    expect(html).not.toMatch(/<noscript>[\s\S]*?<link rel="stylesheet" href="\/assets\/vue\/fonts-route-zh-cn-abc123\.css">[\s\S]*?<\/noscript>/u)
    expect(html).toContain('href="/assets/vue/fonts-home-hero.css"')
    expect(html).not.toContain('rel="modulepreload"')
    expect(html).toContain('href="/assets/vue/SectionHeading.css"')
    expect(html).not.toContain('fonts-zh-hk.css')
    expect(html).not.toContain('fonts-en.css')
    expect(html).toContain('default-src \'self\'')
  })

  it('selects a static hero image before resource discovery and authorizes its parser bootstrap', () => {
    const homeShell = source.replace(
      'content="default-src \'self\'"',
      'content="default-src \'self\'; script-src \'self\'; style-src \'self\'; manifest-src \'self\'"'
    )
    const image = '<img class="home-hero-slideshow__image home-hero-slideshow__image--current" src="/assets/images/home-hero/hero-01-640.webp" srcset="/assets/images/home-hero/hero-01-640.webp 640w, /assets/images/home-hero/hero-01-896.webp 896w" sizes="(max-width: 760px) calc(100vw - 40px), calc(min(1260px, 100vw) - 10vw)" alt="" loading="eager">'
    const html = injectPrerenderedHtml({
      shell: homeShell,
      appHtml: `<main>${image}</main>`,
      page: 'home',
      locale: 'zh-CN',
      renderDateIso: '2026-11-01',
      modules: new Set(),
      manifest
    })
    const script = html.match(/<script data-home-hero-image-full="[^"]+" data-home-hero-image-save-data="[^"]+">([\s\S]*?)<\/script>/u)?.[1]
    const fullImage = html.match(/data-home-hero-image-full="([^"]+)"/u)?.[1]
    const saveDataImage = html.match(/data-home-hero-image-save-data="([^"]+)"/u)?.[1]

    expect(script).toBeDefined()
    expect(html).toContain(`<noscript>${image}</noscript>`)
    expect(fullImage).toContain('hero-01-896.webp 896w')
    expect(saveDataImage).toContain('hero-01-640.webp 640w')
    expect(saveDataImage).not.toContain('hero-01-896.webp')
    expect(fullImage).toContain('&gt;')
    expect(saveDataImage).toContain('&gt;')
    expect(script).toContain('navigator.connection?.saveData===true')
    const digest = createHash('sha256').update(script!).digest('base64')
    expect(html).toContain(`script-src 'self' 'sha256-${digest}'`)
    expect(html).toContain(`manifest-src 'self'"`)
    expect(html).not.toContain(`manifest-src 'self' 'sha256-${digest}'`)
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

  it('loads route font CSS from the document head on non-home static pages', () => {
    const html = injectPrerenderedHtml({
      shell: source,
      appHtml: '<main id="main"><h1>Research</h1></main>',
      page: 'research',
      locale: 'en',
      renderDateIso: '2026-11-01',
      modules: new Set(),
      manifest,
      localeFontStylesheet: 'assets/vue/fonts-route-en-research.css',
      fontPreloads: ['/assets/vue/critical.woff2']
    })

    expect(html).toMatch(/<head>[\s\S]*?<link rel="stylesheet" href="\/assets\/vue\/fonts-route-en-research\.css">/u)
    const fontPreloadIndex = html.indexOf('<link rel="preload" href="/assets/vue/critical.woff2" as="font" type="font/woff2" crossorigin="anonymous" fetchpriority="low">')
    const routeStylesheetIndex = html.indexOf('<link rel="stylesheet" href="/assets/vue/fonts-route-en-research.css">')
    expect(fontPreloadIndex).toBeGreaterThanOrEqual(0)
    expect(fontPreloadIndex).toBeLessThan(routeStylesheetIndex)
    expect(html).not.toContain('<noscript>  <link rel="stylesheet" href="/assets/vue/fonts-route-en-research.css">')
  })

  it('keeps static page module requests below render-blocking stylesheets', () => {
    const shell = source.replace('</head>', '<script type="module" crossorigin src="/assets/vue/SectionHeading.js"></script><script type="module" crossorigin src="/assets/vue/main.js"></script></head>')
    const html = injectPrerenderedHtml({
      shell,
      appHtml: '<main id="main"><h1>你好</h1></main>',
      page: 'home',
      locale: 'zh-CN',
      renderDateIso: '2026-11-01',
      modules: new Set(['src/pages/HomePage.vue', 'src/components/SectionHeading.vue']),
      manifest
    })

    expect(html).not.toContain('rel="modulepreload"')
    expect(html).toContain('<script defer fetchpriority="low" src="/ssg-bootstrap.js" data-entry="/assets/vue/main.js"></script>')
    expect(html).not.toContain('type="module"')
    expect(html).not.toContain('src="/assets/vue/SectionHeading.js"')
  })

  it('keeps static page code out of the first-render preload set', () => {
    const shell = source.replace('</head>', '<script type="module" src="/assets/vue/main.js"></script></head>')
    const html = injectPrerenderedHtml({
      shell,
      appHtml: '<main id="main"><h1>Works</h1></main>',
      page: 'works',
      locale: 'en',
      renderDateIso: '2026-11-01',
      modules: new Set(),
      manifest
    })

    expect(html).not.toContain('rel="modulepreload"')
    expect(html).toContain('<script defer fetchpriority="low" src="/ssg-bootstrap.js" data-entry="/assets/vue/main.js"></script>')
    expect(html).toContain('href="/assets/vue/SectionHeading.css"')
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

describe('route font CSS', () => {
  it('keeps font subsets used by rendered text and removes unused language subsets', () => {
    const latin = '@font-face{font-family:Inter;src:url(latin.woff2);unicode-range:U+0000-00FF}'
    const cjk = '@font-face{font-family:Noto;src:url(cjk.woff2);unicode-range:U+4E00-9FFF}'
    const emoji = '@font-face{font-family:Noto;src:url(emoji.woff2);unicode-range:U+1F300-1F3FF}'
    const allGlyphs = '@font-face{font-family:IBM;src:url(ibm.woff2)}'

    expect(retainFontFacesForMarkup(`${latin}${cjk}${emoji}${allGlyphs}`, 'A你&#x20AC;'))
      .toBe(`${latin}${cjk}${allGlyphs}`)
  })

  it('matches wildcard unicode ranges used by variable font subsets', () => {
    const matching = '@font-face{font-family:Inter;src:url(latin.woff2);unicode-range:U+??}'
    const unused = '@font-face{font-family:Inter;src:url(greek.woff2);unicode-range:U+03??}'

    expect(retainFontFacesForMarkup(`${matching}${unused}`, 'A'))
      .toBe(matching)
  })

  it('keeps glyphs used only by interactive locale messages', () => {
    const interactive = '@font-face{font-family:Noto;src:url(interactive.woff2);unicode-range:U+7BB1}'
    const messages = JSON.stringify(uiMessages['zh-CN'])
    const source = readFileSync(resolve(process.cwd(), 'scripts/prerender-pages.ts'), 'utf8')

    expect(uiMessages['zh-CN'].lightbox.close).toContain('灯箱')
    expect(retainFontFacesForMarkup(interactive, '')).toBe('')
    expect(retainFontFacesForMarkup(interactive, messages)).toBe(interactive)
    expect(source).toContain('JSON.stringify(uiMessages[locale])')
  })
})

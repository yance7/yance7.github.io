import { describe, expect, it, vi } from 'vitest'
import { pageEntries } from '../src/data/pageRegistry'
import { getLocalizedHomeCopy, getLocalizedPageMeta } from '../src/data/locales'
import { uiMessages } from '../src/i18n/messages'
import { renderPage, renderShell, type ShellContext } from '../src/entry-server'
import type { Locale } from '../src/i18n/types'

const locales: Locale[] = ['zh-CN', 'zh-HK', 'en']
const staticPages = pageEntries.map(({ key }) => key).filter((page) => page !== 'concerts')
const renderDateIso = '2026-11-01'

describe('build-time page rendering', () => {
  it('renders all static page locales independently in parallel without browser globals', async () => {
    expect('window' in globalThis).toBe(false)
    expect('document' in globalThis).toBe(false)

    const contexts = staticPages.flatMap((page) => locales.map((locale) => ({
      page,
      locale,
      renderDateIso
    })))
    const rendered = await Promise.all(contexts.map(async (context) => ({
      ...context,
      result: await renderPage(context)
    })))

    expect(rendered).toHaveLength(15)
    for (const { page, locale, result } of rendered) {
      expect(result.modules).toBeInstanceOf(Set)
      if (page === 'home') {
        const home = getLocalizedHomeCopy(locale)
        expect(result.html).toContain(home.heroGreeting)
        expect(result.html).toContain(home.heroStatement)
      } else {
        expect(result.html).toContain(getLocalizedPageMeta(locale, page).title)
      }
      expect(result.html).toContain(uiMessages[locale].locale.selector)
      expect(result.html.match(/<h1\b/g)).toHaveLength(1)
      expect(result.html).toContain('class="site-footer')
      expect(result.html).not.toContain('page-content-skeleton')
    }
  })

  it('does not construct hero images or start image deadlines during server rendering', async () => {
    const imageConstructor = vi.fn(function ImageMock() {
      throw new Error('Hero image construction is unavailable during server rendering')
    })
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    vi.stubGlobal('Image', imageConstructor)

    try {
      const result = await renderPage({ page: 'home', locale: 'en', renderDateIso })
      await Promise.resolve()

      expect(result.html).toContain(getLocalizedHomeCopy('en').heroGreeting)
      expect(imageConstructor).not.toHaveBeenCalled()
      expect(timeoutSpy.mock.calls.some(([, delay]) => delay === 10_000)).toBe(false)
    } finally {
      timeoutSpy.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  it('does not leak locale state between sequential render requests', async () => {
    const results = []
    for (const locale of locales) {
      results.push({
        locale,
        result: await renderPage({ page: 'research', locale, renderDateIso })
      })
    }

    for (const { locale, result } of results) {
      expect(result.html).toContain(getLocalizedPageMeta(locale, 'research').title)
      expect(result.html).toContain(uiMessages[locale].locale.selector)
    }
  })

  it('renders metric values in their final state and native methodology disclosures', async () => {
    const academics = await renderPage({ page: 'academics', locale: 'zh-CN', renderDateIso })
    const research = await renderPage({ page: 'research', locale: 'zh-CN', renderDateIso })

    expect(academics.html).toContain('<b aria-hidden="true">4.0</b>')
    expect(academics.html).toContain('<b aria-hidden="true">1560</b>')
    expect(academics.html).toContain('<span class="sr-only">4.0</span>')
    expect(academics.html).not.toContain('<b aria-hidden="true">0.0</b>')
    expect(academics.html).not.toContain('<b aria-hidden="true">0</b>')
    expect(research.html).toContain('<details class="tl-method">')
    expect(research.html).toMatch(/<summary\b[^>]*class="method-toggle"/u)
    expect(research.html).not.toMatch(/<details class="tl-method" open>/u)
  })

  it('returns server-rendered body Teleport anchors for client hydration', async () => {
    const research = await renderPage({ page: 'research', locale: 'en', renderDateIso })

    expect(research.teleports?.body).toContain('teleport start anchor')
    expect(research.teleports?.body).toContain('teleport anchor')
  })
})

describe('build-time startup shell rendering', () => {
  it('renders a readable shell body for concerts and 404 in every locale without browser globals', async () => {
    expect('window' in globalThis).toBe(false)
    expect('document' in globalThis).toBe(false)

    const contexts: ShellContext[] = (['concerts', 'not-found'] as const).flatMap((page) =>
      locales.map((locale) => ({ page, locale }))
    )
    const rendered = await Promise.all(contexts.map(async (context) => ({
      ...context,
      result: await renderShell(context)
    })))

    expect(rendered).toHaveLength(6)
    for (const { locale, result } of rendered) {
      expect(result.html).toContain('class="site-shell startup-shell"')
      expect(result.html).toContain('data-page-load-state="loading"')
      expect(result.html).toContain('class="skip-link"')
      expect(result.html).toContain('class="site-nav"')
      expect(result.html).toContain('class="theme-orbit')
      expect(result.html).toContain('data-theme-copy=')
      expect(result.html).toContain(uiMessages[locale].locale.selector)
      expect(result.html).toContain('<main id="main" tabindex="-1" class="shell-fallback">')
      expect(result.html).toContain('<h1>')
      expect(result.html).not.toContain('class="site-footer')
      expect(result.html).not.toContain('page-content-skeleton')
    }
  })

  it('does not leak locale state between sequential shell renders', async () => {
    for (const locale of locales) {
      const result = await renderShell({ page: 'concerts', locale })
      expect(result.html).toContain(uiMessages[locale].locale.selector)
    }
  })
})

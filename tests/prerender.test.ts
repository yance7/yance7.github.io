import { describe, expect, it } from 'vitest'
import { pageEntries } from '../src/data/pageRegistry'
import { getLocalizedHomeCopy, getLocalizedPageMeta } from '../src/data/locales'
import { uiMessages } from '../src/i18n/messages'
import { renderPage } from '../src/entry-server'
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

    expect(academics.html).toContain('<b>4.0</b>')
    expect(academics.html).toContain('<b>1560</b>')
    expect(academics.html).not.toContain('<b>0.0</b>')
    expect(academics.html).not.toContain('<b>0</b>')
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

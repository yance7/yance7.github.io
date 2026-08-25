import { describe, expect, it } from 'vitest'
import {
  buildLocalizedPageHref,
  getLocalePrefix,
  localeRegistry,
  resolveLocaleFromPath,
  stripLocalePrefix,
  uiMessages
} from '../src/i18n'

function nestedKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return prefix ? [prefix] : []
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    nestedKeys(child, prefix ? `${prefix}.${key}` : key)
  )
}

describe('locale path resolution', () => {
  it.each([
    ['/', 'zh-CN'],
    ['/research.html', 'zh-CN'],
    ['/zh-hk/', 'zh-HK'],
    ['/zh-hk/research.html', 'zh-HK'],
    ['/en/', 'en'],
    ['/en/research.html', 'en'],
    ['/en/does-not-exist', 'en']
  ] as const)('resolves %s to %s', (pathname, expected) => {
    expect(resolveLocaleFromPath(pathname)).toBe(expected)
  })

  it('strips only an explicit locale prefix', () => {
    expect(stripLocalePrefix('/')).toBe('/')
    expect(stripLocalePrefix('/research.html')).toBe('/research.html')
    expect(stripLocalePrefix('/zh-hk/')).toBe('/')
    expect(stripLocalePrefix('/zh-hk/research.html')).toBe('/research.html')
    expect(stripLocalePrefix('/en/research.html')).toBe('/research.html')
  })
})

describe('localized page hrefs', () => {
  it('uses locale home paths without index.html', () => {
    expect(getLocalePrefix('zh-CN')).toBe('')
    expect(getLocalePrefix('zh-HK')).toBe('/zh-hk')
    expect(getLocalePrefix('en')).toBe('/en')
    expect(buildLocalizedPageHref('home', 'zh-CN')).toBe('/')
    expect(buildLocalizedPageHref('home', 'zh-HK')).toBe('/zh-hk/')
    expect(buildLocalizedPageHref('home', 'en')).toBe('/en/')
  })

  it('preserves the current page, search, and stable section hash', () => {
    expect(buildLocalizedPageHref('research', 'en', {
      search: '?from=nav',
      hash: '#sec-toolchain'
    })).toBe('/en/research.html?from=nav#sec-toolchain')
    expect(buildLocalizedPageHref('honors', 'zh-HK', { hash: '#sec-honors-archive' }))
      .toBe('/zh-hk/honors.html#sec-honors-archive')
  })
})

describe('typed UI dictionaries', () => {
  it('contain the same complete schema for every locale', () => {
    const expected = nestedKeys(uiMessages['zh-CN']).sort()
    expect(nestedKeys(uiMessages['zh-HK']).sort()).toEqual(expected)
    expect(nestedKeys(uiMessages.en).sort()).toEqual(expected)
    expect(Object.keys(localeRegistry)).toEqual(['zh-CN', 'zh-HK', 'en'])
  })
})

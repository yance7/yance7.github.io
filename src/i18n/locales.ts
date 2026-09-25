import { pageRegistry, type PageKey } from '../data/pageRegistry.ts'
import type { Locale, LocaleDefinition } from './types.ts'

export const localeRegistry = {
  'zh-CN': {
    code: 'zh-CN',
    htmlLang: 'zh-CN',
    pathPrefix: '',
    shortLabel: '简',
    nativeName: '简体中文',
    ogLocale: 'zh_CN'
  },
  'zh-HK': {
    code: 'zh-HK',
    htmlLang: 'zh-HK',
    pathPrefix: '/zh-hk',
    shortLabel: '繁',
    nativeName: '繁體中文',
    ogLocale: 'zh_HK'
  },
  en: {
    code: 'en',
    htmlLang: 'en',
    pathPrefix: '/en',
    shortLabel: 'EN',
    nativeName: 'English',
    ogLocale: 'en_US'
  }
} satisfies Record<Locale, LocaleDefinition>

export function resolveLocaleFromPath(pathname: string): Locale {
  const path = pathname.toLowerCase()
  if (/^\/en(?:\/|$)/.test(path)) return 'en'
  if (/^\/zh-hk(?:\/|$)/.test(path)) return 'zh-HK'
  return 'zh-CN'
}

export function getLocalePrefix(locale: Locale) {
  return localeRegistry[locale].pathPrefix
}

export function stripLocalePrefix(pathname: string) {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  const stripped = normalized.replace(/^\/(?:en|zh-hk)(?=\/|$)/i, '')
  return stripped || '/'
}

function withOptions(path: string, options: { search?: string; hash?: string }) {
  const search = options.search ? (options.search.startsWith('?') ? options.search : `?${options.search}`) : ''
  const hash = options.hash ? (options.hash.startsWith('#') ? options.hash : `#${options.hash}`) : ''
  return `${path}${search}${hash}`
}

export function buildLocalizedPageHref(
  page: PageKey,
  locale: Locale,
  options: { search?: string; hash?: string } = {}
) {
  return withOptions(`${getLocalePrefix(locale)}${pageRegistry[page].routePath}`, options)
}

export function buildLocalizedLegacyHref(
  page: PageKey,
  locale: Locale,
  options: { search?: string; hash?: string } = {}
) {
  return withOptions(`${getLocalePrefix(locale)}${pageRegistry[page].legacyPath}`, options)
}

export function resolvePageFromPath(pathname: string): PageKey | undefined {
  const path = stripLocalePrefix(pathname)
  return (Object.keys(pageRegistry) as PageKey[]).find((key) => (
    pageRegistry[key].routePath === path || pageRegistry[key].legacyPath === path
  ))
}

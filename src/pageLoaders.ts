import type { Component } from 'vue'
import { isPageKey, type PageKey } from './data'

type PageModule = { default: Component }
type PageLoader = () => Promise<PageModule>

const pageLoaders = {
  home: () => import('./pages/HomePage.vue'),
  academics: () => import('./pages/AcademicsPage.vue'),
  honors: () => import('./pages/HonorsPage.vue'),
  research: () => import('./pages/ResearchPage.vue'),
  works: () => import('./pages/WorksPage.vue'),
  concerts: () => import('./pages/ConcertsPage.vue')
} satisfies Record<PageKey, PageLoader>

const pendingLoads = new Map<PageKey, Promise<PageModule>>()
const pageChunkPattern = /^(?:Home|Academics|Honors|Research|Works|Concerts)Page-[^/]+\.js$/

function shouldAvoidWebKitModulePreload() {
  const userAgent = navigator.userAgent
  const isWebKit = /AppleWebKit\//.test(userAgent)
  const isMobileWebKit = /Mobile\/|iP(?:hone|ad|od)/.test(userAgent)
    || (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1)
  const isBlink = /(?:Chrome|Chromium|Edg|OPR|SamsungBrowser)\//.test(userAgent)
  return isWebKit && (!isBlink || isMobileWebKit)
}

function isPageChunk(url: string) {
  try {
    const filename = new URL(url, document.baseURI).pathname.split('/').pop() ?? ''
    return pageChunkPattern.test(filename)
  } catch {
    return false
  }
}

export function configurePageChunkPreload() {
  if (typeof navigator === 'undefined' || typeof document === 'undefined' || !shouldAvoidWebKitModulePreload()) return

  // WebKit 270357 can retain a failed modulepreload for a page chunk across reloads.
  // Use a retryable prefetch for that chunk while leaving other engines unchanged.
  const relDescriptor = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'rel')
  const hrefDescriptor = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href')
  if (!relDescriptor?.get || !relDescriptor.set || !hrefDescriptor?.get || !hrefDescriptor.set) return

  const createElement = document.createElement.bind(document)
  document.createElement = ((tagName: string, options?: ElementCreationOptions) => {
    const element = createElement(tagName, options)
    if (tagName.toLowerCase() !== 'link' || !(element instanceof HTMLLinkElement)) return element

    Object.defineProperties(element, {
      rel: {
        configurable: true,
        get(this: HTMLLinkElement) {
          return relDescriptor.get!.call(this)
        },
        set(this: HTMLLinkElement, value: string) {
          const href = hrefDescriptor.get!.call(this)
          const usePrefetch = value === 'modulepreload' && isPageChunk(href)
          relDescriptor.set!.call(this, usePrefetch ? 'prefetch' : value)
          if (usePrefetch) this.as = 'script'
        }
      },
      href: {
        configurable: true,
        get(this: HTMLLinkElement) {
          return hrefDescriptor.get!.call(this)
        },
        set(this: HTMLLinkElement, value: string) {
          hrefDescriptor.set!.call(this, value)
          if (relDescriptor.get!.call(this) === 'modulepreload' && isPageChunk(value)) {
            relDescriptor.set!.call(this, 'prefetch')
            this.as = 'script'
          }
        }
      }
    })

    return element
  }) as typeof document.createElement
}

function loadPageChunk(page: PageKey) {
  const pending = pendingLoads.get(page)
  if (pending) return pending

  const load = pageLoaders[page]().catch((error) => {
    pendingLoads.delete(page)
    throw error
  })
  pendingLoads.set(page, load)
  return load
}

export function getPageLoader(page: PageKey): PageLoader {
  return () => loadPageChunk(page)
}

export function preloadPage(value: string | undefined) {
  if (!isPageKey(value)) return
  void loadPageChunk(value).catch(() => undefined)
}

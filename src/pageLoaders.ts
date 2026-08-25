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

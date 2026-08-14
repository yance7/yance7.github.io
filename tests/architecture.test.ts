import { describe, expect, it, vi } from 'vitest'
import { htmlPageEntries, isPageKey, pageEntries, pageRegistry } from '../src/data/pageRegistry'
import { getConcertState } from '../src/data/concerts'
import { useAlbumSpotlight } from '../src/composables/useAlbumSpotlight'
import { createImagePreloader, type PreloadImage } from '../src/utils/imagePreload'
import { decodeHashTarget, retryAsync } from '../src/utils/navigation'

describe('page registry', () => {
  it('derives navigable and HTML page entries from one registry', () => {
    expect(pageEntries.map((entry) => entry.key)).toEqual([
      'home', 'academics', 'honors', 'research', 'works', 'concerts'
    ])
    expect(htmlPageEntries.map((entry) => entry.htmlName)).toEqual([
      'index', 'academics', 'honors', 'research', 'works', 'concerts', '404'
    ])
    expect(pageRegistry.concerts.sections.map((section) => section.id)).toContain('album-frequencies')
    expect(pageRegistry.research.nav.en).toBe('Research')
    expect(isPageKey('research')).toBe(true)
    expect(isPageKey('missing')).toBe(false)
  })
})

describe('concert state snapshots', () => {
  it('derives every time-sensitive value from the supplied page timestamp', () => {
    const before = getConcertState(new Date('2026-08-19T12:00:00+08:00'))
    const after = getConcertState(new Date('2026-08-20T12:00:00+08:00'))

    expect(before.upcoming.some((concert) => concert.id === 'wangsulong-2026-08-19')).toBe(true)
    expect(after.upcoming.some((concert) => concert.id === 'wangsulong-2026-08-19')).toBe(false)
    expect(before.stats.attended + before.stats.upcoming).toBe(before.stats.total)
    expect(after.stats.attended + after.stats.upcoming).toBe(after.stats.total)
  })
})

describe('album spotlight state machine', () => {
  it('commits the latest request and exposes loading/error transitions', async () => {
    const resolvers: Array<(loaded: boolean) => void> = []
    const load = vi.fn(() => new Promise<boolean>((resolve) => resolvers.push(resolve)))
    const spotlight = useAlbumSpotlight(3, load)

    const first = spotlight.select(1)
    expect(spotlight.state.value).toMatchObject({ selected: 1, displayed: 0, status: 'loading' })
    const second = spotlight.select(2)
    expect(spotlight.state.value.selected).toBe(2)

    resolvers[0]?.(true)
    await first
    expect(spotlight.state.value).toMatchObject({ selected: 2, displayed: 0, status: 'loading' })

    resolvers[1]?.(false)
    await second
    expect(spotlight.state.value).toMatchObject({ selected: 2, displayed: 2, status: 'error' })
  })
})

describe('image preloader', () => {
  it('owns pending and loaded state so callers cannot omit deduplication state', async () => {
    const images: PreloadImage[] = []
    const preloader = createImagePreloader({
      createImage: () => {
        const image: PreloadImage = { src: '', decoding: 'auto', onload: null, onerror: null }
        images.push(image)
        return image
      }
    })

    expect(preloader.preload('/poster.jpg')).toBe(true)
    expect(preloader.preload('/poster.jpg')).toBe(false)
    images[0]?.onerror?.(new Event('error'))
    await Promise.resolve()
    expect(preloader.preload('/poster.jpg')).toBe(true)
    images[1]?.onload?.(new Event('load'))
    await Promise.resolve()
    expect(preloader.isLoaded('/poster.jpg')).toBe(true)
    expect(preloader.preload('/poster.jpg')).toBe(false)
  })

  it('settles an image timeout and clears the pending request', async () => {
    vi.useFakeTimers()
    try {
      const image: PreloadImage = { src: '', decoding: 'auto', onload: null, onerror: null }
      const controller = createImagePreloader(
        { createImage: () => image },
        { timeoutMs: 20 }
      )

      expect(controller.preload('/slow-poster.jpg')).toBe(true)
      expect(controller.isPending('/slow-poster.jpg')).toBe(true)
      await vi.runAllTimersAsync()

      expect(controller.isPending('/slow-poster.jpg')).toBe(false)
      expect(controller.isLoaded('/slow-poster.jpg')).toBe(false)
      expect(image.onload).toBeNull()
      expect(image.onerror).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('navigation failure paths', () => {
  it('does not throw for malformed hash encoding', () => {
    expect(decodeHashTarget('#works')).toBe('works')
    expect(decodeHashTarget('#bad%')).toBeNull()
    expect(decodeHashTarget('#')).toBeNull()
  })

  it('retries async imports a bounded number of times', async () => {
    let attempts = 0
    const value = await retryAsync(async () => {
      attempts += 1
      if (attempts < 3) throw new Error('chunk unavailable')
      return 'loaded'
    }, { retries: 2, delayMs: 0 })

    expect(value).toBe('loaded')
    expect(attempts).toBe(3)
  })
})

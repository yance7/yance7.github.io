import { describe, expect, it } from 'vitest'
import { legacyCopyText, type LegacyCopyDocument, type LegacyCopyTextArea } from '../src/utils/clipboard'
import { clampScrollProgress } from '../src/utils/scrollProgress'
import { preloadImageOnce, type PreloadImage } from '../src/utils/imagePreload'

function createFakeDocument(result: boolean | Error) {
  const calls = { appended: 0, removed: 0, selected: 0 }
  const textarea: LegacyCopyTextArea = {
    value: '',
    style: { position: '', opacity: '' },
    select: () => { calls.selected += 1 },
    remove: () => { calls.removed += 1 }
  }
  const documentRef: LegacyCopyDocument<LegacyCopyTextArea> = {
    createTextarea: () => textarea,
    appendTextarea: () => { calls.appended += 1 },
    execCopy: () => {
      if (result instanceof Error) throw result
      return result
    }
  }
  return { calls, documentRef, textarea }
}

describe('legacy clipboard fallback', () => {
  it('returns false when the browser rejects execCommand copy', () => {
    const { calls, documentRef, textarea } = createFakeDocument(false)

    expect(legacyCopyText('citation', documentRef)).toBe(false)
    expect(textarea.value).toBe('citation')
    expect(calls).toEqual({ appended: 1, removed: 1, selected: 1 })
  })

  it('removes the temporary textarea when execCommand throws', () => {
    const { calls, documentRef } = createFakeDocument(new Error('copy unavailable'))

    expect(() => legacyCopyText('citation', documentRef)).toThrow('copy unavailable')
    expect(calls).toEqual({ appended: 1, removed: 1, selected: 1 })
  })
})

describe('scroll progress', () => {
  it('clamps negative and oversized values to the progress range', () => {
    expect(clampScrollProgress(-0.25)).toBe(0)
    expect(clampScrollProgress(0.45)).toBe(0.45)
    expect(clampScrollProgress(1.25)).toBe(1)
  })
})

describe('concert image preloading', () => {
  it('only remembers an image after it loads and allows failed images to retry', () => {
    const preloaded = new Set<string>()
    const pending = new Set<string>()
    const images: PreloadImage[] = []
    const preloader = { createImage: () => {
      const image: PreloadImage = { src: '', decoding: 'auto', onload: null, onerror: null }
      images.push(image)
      return image
    } }

    expect(preloadImageOnce('/poster.jpg', preloaded, pending, preloader)).toBe(true)
    expect(preloadImageOnce('/poster.jpg', preloaded, pending, preloader)).toBe(false)
    expect(pending.has('/poster.jpg')).toBe(true)
    expect(preloaded.has('/poster.jpg')).toBe(false)
    images[0].onerror?.(new Event('error'))
    expect(preloadImageOnce('/poster.jpg', preloaded, pending, preloader)).toBe(true)
    images[1].onload?.(new Event('load'))
    expect(pending.has('/poster.jpg')).toBe(false)
    expect(preloaded.has('/poster.jpg')).toBe(true)
    expect(preloadImageOnce('/poster.jpg', preloaded, pending, preloader)).toBe(false)
  })
})

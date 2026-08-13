export interface PreloadImage {
  src: string
  decoding?: 'async' | 'sync' | 'auto'
  onload: ((event: Event) => unknown) | null
  onerror: ((event: Event) => unknown) | null
}

export interface ImagePreloader {
  createImage: () => PreloadImage
}

export interface ImagePreloadController {
  preload: (src: string) => boolean
  isLoaded: (src: string) => boolean
  isPending: (src: string) => boolean
}

export function createImagePreloader(
  preloader: ImagePreloader = { createImage: () => new Image() }
): ImagePreloadController {
  const loaded = new Set<string>()
  const pending = new Set<string>()

  return {
    preload(src) {
      return preloadImageOnce(src, loaded, pending, preloader)
    },
    isLoaded(src) {
      return loaded.has(src)
    },
    isPending(src) {
      return pending.has(src)
    }
  }
}

export function preloadImageOnce(
  src: string,
  preloaded: Set<string>,
  pending: Set<string>,
  preloader: ImagePreloader = { createImage: () => new Image() }
) {
  if (preloaded.has(src) || pending.has(src)) return false
  pending.add(src)
  const image = preloader.createImage()
  image.decoding = 'async'
  image.onload = () => {
    pending.delete(src)
    preloaded.add(src)
  }
  image.onerror = () => pending.delete(src)
  image.src = src
  return true
}

export const sharedImagePreloader = createImagePreloader()

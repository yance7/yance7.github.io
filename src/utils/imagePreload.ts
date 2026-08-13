export interface PreloadImage {
  src: string
  decoding?: 'async' | 'sync' | 'auto'
  onload: ((event: Event) => unknown) | null
  onerror: ((event: Event) => unknown) | null
}

export interface ImagePreloader {
  createImage: () => PreloadImage
}

export function preloadImageOnce(
  src: string,
  preloaded: Set<string>,
  pending: Set<string> = new Set<string>(),
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

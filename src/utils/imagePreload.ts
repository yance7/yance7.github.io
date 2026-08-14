export interface PreloadImage {
  src: string
  srcset?: string
  sizes?: string
  decoding?: 'async' | 'sync' | 'auto'
  onload: ((event: Event) => unknown) | null
  onerror: ((event: Event) => unknown) | null
  decode?: () => Promise<void>
  removeAttribute?: (name: string) => void
}

export interface ImagePreloader {
  createImage: () => PreloadImage
}

export interface ImagePreloadController {
  preload: (src: string) => boolean
  isLoaded: (src: string) => boolean
  isPending: (src: string) => boolean
}

export interface ImageLoadOptions {
  src: string
  srcset?: string
  sizes?: string
  timeoutMs?: number
  image?: PreloadImage
  onSettled?: (loaded: boolean) => void
}

export interface ImagePreloaderOptions {
  timeoutMs?: number
}

const defaultTimeoutMs = 10000

export function loadImage(
  options: ImageLoadOptions,
  createImage: () => PreloadImage = () => new Image()
) {
  const {
    src,
    srcset,
    sizes,
    timeoutMs = defaultTimeoutMs
  } = options
  const image = options.image ?? createImage()

  return new Promise<boolean>((resolve) => {
    let settled = false
    let fallbackAttempted = false
    const timer = globalThis.setTimeout(() => finish(false), Math.max(0, timeoutMs))

    function cleanup() {
      if (timer !== undefined) globalThis.clearTimeout(timer)
      image.onload = null
      image.onerror = null
    }

    function finish(loaded: boolean) {
      if (settled) return
      settled = true
      cleanup()
      try {
        options.onSettled?.(loaded)
      } finally {
        resolve(loaded)
      }
    }

    function retryWithoutSourceSet() {
      fallbackAttempted = true
      image.removeAttribute?.('srcset')
      image.removeAttribute?.('sizes')
      image.srcset = ''
      image.sizes = ''
      image.src = src
    }

    image.decoding = 'async'
    if (srcset) image.srcset = srcset
    if (sizes) image.sizes = sizes
    image.onload = () => {
      const decode = image.decode?.()
      if (decode) void decode.catch(() => undefined)
      finish(true)
    }
    image.onerror = () => {
      if (srcset && !fallbackAttempted) {
        retryWithoutSourceSet()
        return
      }
      finish(false)
    }
    image.src = src
  })
}

export function createImagePreloader(
  preloader: ImagePreloader = { createImage: () => new Image() },
  options: ImagePreloaderOptions = {}
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
  preloader: ImagePreloader = { createImage: () => new Image() },
  options: ImagePreloaderOptions = {}
) {
  if (preloaded.has(src) || pending.has(src)) return false
  pending.add(src)
  const image = preloader.createImage()
  void loadImage({
    src,
    image,
    timeoutMs: options.timeoutMs,
    onSettled: (loaded) => {
      pending.delete(src)
      if (loaded) preloaded.add(src)
    }
  })
  return true
}

export const sharedImagePreloader = createImagePreloader()

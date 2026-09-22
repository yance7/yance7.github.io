import type { ConcertPoster } from '../data/types'

export function originalImageUrl(name: string) {
  return `/assets/concerts/${name}`
}

export function thumbnailUrl(name: string) {
  return `/assets/concerts/thumbs/${name.replace(/\.[^.]+$/, '.webp')}`
}

export function thumbnailFallbackUrl(name: string) {
  return `/assets/concerts/thumbs/${name.replace(/\.[^.]+$/, '.jpg')}`
}

type ConcertPosterRatio = 'tall' | 'portrait' | 'landscape'

export interface ConcertPosterPresentation {
  kind: ConcertPosterRatio
  aspectRatio: '9 / 16' | '3 / 4' | '16 / 9'
}

export function concertPosterPresentation(poster: Pick<ConcertPoster, 'width' | 'height'>): ConcertPosterPresentation {
  const ratio = poster.width / poster.height
  if (ratio < 0.6) return { kind: 'tall', aspectRatio: '9 / 16' }
  if (ratio <= 1) return { kind: 'portrait', aspectRatio: '3 / 4' }
  return { kind: 'landscape', aspectRatio: '16 / 9' }
}

import { describe, expect, it } from 'vitest'
import { concertPosterPresentation, thumbnailFallbackUrl } from '../src/utils/concertMedia'

describe('concert poster presentation', () => {
  it.each([
    [{ width: 59, height: 100 }, { kind: 'tall', aspectRatio: '9 / 16' }],
    [{ width: 60, height: 100 }, { kind: 'portrait', aspectRatio: '3 / 4' }],
    [{ width: 100, height: 100 }, { kind: 'portrait', aspectRatio: '3 / 4' }],
    [{ width: 101, height: 100 }, { kind: 'landscape', aspectRatio: '16 / 9' }]
  ])('maps poster width/height ratio to a stable presentation frame', (poster, expected) => {
    expect(concertPosterPresentation(poster)).toEqual(expected)
  })

  it('derives a JPEG fallback beside the WebP thumbnail', () => {
    expect(thumbnailFallbackUrl('concert-202511-kpl-finals.jpg')).toBe('/assets/concerts/thumbs/concert-202511-kpl-finals.jpg')
  })
})

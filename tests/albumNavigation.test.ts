import { describe, expect, it } from 'vitest'
import { getAlbumNavigationIndex } from '../src/utils/albumNavigation'

describe('album grid keyboard navigation', () => {
  it('moves horizontally and clamps at the first and last album', () => {
    expect(getAlbumNavigationIndex({ key: 'ArrowLeft', index: 0, total: 42, columns: 6 })).toBe(0)
    expect(getAlbumNavigationIndex({ key: 'ArrowRight', index: 0, total: 42, columns: 6 })).toBe(1)
    expect(getAlbumNavigationIndex({ key: 'ArrowRight', index: 41, total: 42, columns: 6 })).toBe(41)
  })

  it('moves vertically with the rendered column count', () => {
    expect(getAlbumNavigationIndex({ key: 'ArrowUp', index: 8, total: 42, columns: 6 })).toBe(2)
    expect(getAlbumNavigationIndex({ key: 'ArrowDown', index: 8, total: 42, columns: 6 })).toBe(14)
    expect(getAlbumNavigationIndex({ key: 'ArrowDown', index: 40, total: 42, columns: 6 })).toBe(41)
  })

  it('handles home, end, invalid geometry, and non-navigation keys', () => {
    expect(getAlbumNavigationIndex({ key: 'Home', index: 17, total: 42, columns: 4 })).toBe(0)
    expect(getAlbumNavigationIndex({ key: 'End', index: 17, total: 42, columns: 4 })).toBe(41)
    expect(getAlbumNavigationIndex({ key: 'ArrowDown', index: 0, total: 1, columns: 0 })).toBe(0)
    expect(getAlbumNavigationIndex({ key: 'ArrowDown', index: Number.NaN, total: 3, columns: Number.NaN })).toBe(1)
    expect(getAlbumNavigationIndex({ key: 'ArrowRight', index: -4, total: 0, columns: 3 })).toBeNull()
    expect(getAlbumNavigationIndex({ key: 'Enter', index: 3, total: 42, columns: 6 })).toBeNull()
    expect(getAlbumNavigationIndex({ key: ' ', index: 3, total: 42, columns: 6 })).toBeNull()
  })
})

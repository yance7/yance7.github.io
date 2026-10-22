import { describe, expect, it } from 'vitest'
import { findNearestCenteredIndex, getCenteredScrollLeft, getRailInset } from '../src/utils/horizontalRail'

describe('horizontal rail geometry', () => {
  it('centers first, middle and last cards within the reachable interval', () => {
    expect(getCenteredScrollLeft(500, 1000, 3000)).toBe(0)
    expect(getCenteredScrollLeft(1510.5, 1000, 3000)).toBe(1010.5)
    expect(getCenteredScrollLeft(3500, 1000, 3000)).toBe(3000)
    expect(getCenteredScrollLeft(50, 1000, 3000)).toBe(0)
    expect(getCenteredScrollLeft(5000, 1000, 3000)).toBe(3000)
  })

  it('chooses card centers rather than left edges and handles empty rails', () => {
    expect(findNearestCenteredIndex([], 500)).toBe(-1)
    expect(findNearestCenteredIndex([500], 500)).toBe(0)
    expect(findNearestCenteredIndex([500, 886, 1272], 950)).toBe(1)
    expect(findNearestCenteredIndex([500, 886, 1272], 1200)).toBe(2)
  })

  it('provides reachable edge centers without inventing overflow for fitting content', () => {
    expect(getRailInset(1000, 370, 6150, 16)).toBe(315)
    expect(getRailInset(1000, 370, 370, 1)).toBe(315)
    expect(getRailInset(1000, 370, 756, 2)).toBe(2)
    expect(getRailInset(390, 370, 756, 2)).toBe(10)
    expect(getRailInset(390, 0, 0, 0)).toBe(2)
    expect(getCenteredScrollLeft(185, 1000, 0)).toBe(0)
  })
})

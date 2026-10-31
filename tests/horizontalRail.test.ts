import { describe, expect, it } from 'vitest'
import {
  findNearestDestinationIndex,
  findNextRailDestinationIndex,
  getRailDestinations,
  isRailDestinationPending
} from '../src/utils/horizontalRail'

describe('horizontal rail geometry', () => {
  it('aligns the first and last cards to safe edges and centers middle cards', () => {
    const cards = [
      { offsetLeft: 4, offsetWidth: 200 },
      { offsetLeft: 224, offsetWidth: 200 },
      { offsetLeft: 444, offsetWidth: 200 }
    ]

    expect(getRailDestinations(cards, 300, 348)).toEqual([0, 174, 348])
  })

  it('clamps targets at both scroll boundaries', () => {
    const cards = [
      { offsetLeft: 1, offsetWidth: 100 },
      { offsetLeft: 800, offsetWidth: 100 },
      { offsetLeft: 1800, offsetWidth: 100 }
    ]

    expect(getRailDestinations(cards, 500, 1200)).toEqual([0, 600, 1200])
  })

  it('uses stable first and last representatives for duplicate endpoint targets', () => {
    const destinations = [0, 0, 90, 180, 300, 300, 300]

    expect(findNearestDestinationIndex([], 0)).toBe(-1)
    expect(findNearestDestinationIndex(destinations, 0)).toBe(0)
    expect(findNearestDestinationIndex(destinations, 300)).toBe(6)
    expect(findNearestDestinationIndex(destinations, 45)).toBe(0)
    expect(findNearestDestinationIndex(destinations, 135)).toBe(2)
  })

  it('skips duplicate destinations and advances from a pending target', () => {
    const destinations = [0, 0, 90, 180, 300, 300, 300]

    expect(findNextRailDestinationIndex(destinations, 0, 1)).toBe(2)
    expect(findNextRailDestinationIndex(destinations, 0, 1, 2)).toBe(3)
    expect(findNextRailDestinationIndex(destinations, 180, 1)).toBe(6)
    expect(findNextRailDestinationIndex(destinations, 300, 1)).toBe(-1)
  })

  it('moves backward to the nearest distinct destination without cycling', () => {
    const destinations = [0, 0, 90, 180, 300, 300, 300]

    expect(findNextRailDestinationIndex(destinations, 300, -1)).toBe(3)
    expect(findNextRailDestinationIndex(destinations, 180, -1)).toBe(2)
    expect(findNextRailDestinationIndex(destinations, 90, -1)).toBe(0)
    expect(findNextRailDestinationIndex(destinations, 0, -1)).toBe(-1)
    expect(findNextRailDestinationIndex(destinations, 300, -1, 5)).toBe(3)
  })

  it('treats subpixel scroll rounding as having reached the nearest destination', () => {
    const destinations = [0, 90, 180]

    expect(findNextRailDestinationIndex(destinations, 90.5, -1)).toBe(0)
    expect(findNextRailDestinationIndex(destinations, 89.5, 1)).toBe(2)
  })

  it('skips destinations within the directional endpoint tolerance', () => {
    expect(findNextRailDestinationIndex([0, 0.5, 90], 0, 1)).toBe(2)
    expect(findNextRailDestinationIndex([0, 89.5, 90], 90, -1)).toBe(0)
  })

  it('retires reached destinations and movement that interrupts the commanded path', () => {
    expect(isRailDestinationPending(2, 364, 0)).toBe(true)
    expect(isRailDestinationPending(5460, 364, 0)).toBe(false)
    expect(isRailDestinationPending(182, 0, 364)).toBe(true)
    expect(isRailDestinationPending(182, 364, 0)).toBe(true)
    expect(isRailDestinationPending(-10, 0, 364)).toBe(false)
    expect(isRailDestinationPending(400, 364, 0)).toBe(false)
    expect(isRailDestinationPending(364.5, 0, 364)).toBe(false)
  })
})

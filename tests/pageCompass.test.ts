import { describe, expect, it } from 'vitest'
import {
  chooseActiveSection,
  formatCompassIndex,
  getScrollProgress,
  transitionMobileCompassState
} from '../src/utils/pageCompass'

describe('page compass geometry and state helpers', () => {
  it('calculates bounded progress for missing, negative, and oversized scroll ranges', () => {
    expect(getScrollProgress(0, 800, 800)).toBe(0)
    expect(getScrollProgress(-40, 1600, 800)).toBe(0)
    expect(getScrollProgress(400, 1600, 800)).toBe(0.5)
    expect(getScrollProgress(1800, 1600, 800)).toBe(1)
  })

  it('formats compass indices with stable two-digit values', () => {
    expect(formatCompassIndex(0, 3)).toBe('01 / 03')
    expect(formatCompassIndex(2, 3)).toBe('03 / 03')
  })

  it('transitions the mobile compass through quiet, reading, and visible states', () => {
    expect(transitionMobileCompassState({ state: 'quiet', scrollTop: 320, previousScrollTop: 0 })).toBe('reading')
    expect(transitionMobileCompassState({ state: 'reading', scrollTop: 320, previousScrollTop: 320 })).toBe('reading')
    expect(transitionMobileCompassState({ state: 'reading', scrollTop: 280, previousScrollTop: 320 })).toBe('visible')
    expect(transitionMobileCompassState({ state: 'visible', scrollTop: 0, previousScrollTop: 280 })).toBe('quiet')
  })

  it('chooses the intersecting chapter nearest the reading anchor', () => {
    expect(chooseActiveSection([
      { id: 'first', index: 0, top: 180, isIntersecting: true },
      { id: 'second', index: 1, top: 210, isIntersecting: true }
    ], 200, 'first')).toBe('second')
    expect(chooseActiveSection([], 200, 'first')).toBe('first')
  })
})

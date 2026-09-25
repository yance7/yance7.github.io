import { describe, expect, it } from 'vitest'
import {
  HOME_HERO_INTRO_TIMINGS,
  getHomeHeroIntroState,
  shouldAnimateHomeHeroIntro,
  splitGraphemes
} from '../src/utils/homeHeroIntro'

describe('HomeHero intro utilities', () => {
  it('splits visible text into graphemes, including joined emoji and flags', () => {
    expect(splitGraphemes('e\u0301👩‍🔬🇭🇰')).toEqual(['e\u0301', '👩‍🔬', '🇭🇰'])
  })

  it('keeps a grapheme-aware fallback when Intl.Segmenter is unavailable', () => {
    expect(splitGraphemes('e\u0301👩‍🔬🇭🇰', () => null)).toEqual(['e\u0301', '👩‍🔬', '🇭🇰'])
  })

  it('animates each normal document load unless motion or data preferences opt out', () => {
    expect(shouldAnimateHomeHeroIntro({ reducedMotion: false, saveData: false })).toBe(true)
    expect(shouldAnimateHomeHeroIntro({ reducedMotion: true, saveData: false })).toBe(false)
    expect(shouldAnimateHomeHeroIntro({ reducedMotion: false, saveData: true })).toBe(false)
  })

  it('keeps the complete intro within the specified 3.6 second limit', () => {
    const totalMs = HOME_HERO_INTRO_TIMINGS.firstLineMs
      + HOME_HERO_INTRO_TIMINGS.linePauseMs
      + HOME_HERO_INTRO_TIMINGS.secondLineMs
      + HOME_HERO_INTRO_TIMINGS.actionsMs

    expect(HOME_HERO_INTRO_TIMINGS.firstLineMs).toBe(720)
    expect(HOME_HERO_INTRO_TIMINGS.linePauseMs).toBeGreaterThanOrEqual(140)
    expect(HOME_HERO_INTRO_TIMINGS.linePauseMs).toBeLessThanOrEqual(180)
    expect(HOME_HERO_INTRO_TIMINGS.secondLineMs).toBe(1500)
    expect(HOME_HERO_INTRO_TIMINGS.actionsMs).toBe(320)
    expect(totalMs).toBeLessThanOrEqual(3600)
  })

  it('maps elapsed time from the original start to the correct intro phase', () => {
    const typingMs = HOME_HERO_INTRO_TIMINGS.firstLineMs
      + HOME_HERO_INTRO_TIMINGS.linePauseMs
      + HOME_HERO_INTRO_TIMINGS.secondLineMs
    const completeMs = typingMs + HOME_HERO_INTRO_TIMINGS.actionsMs

    expect(getHomeHeroIntroState(typingMs - 1)).toBe('typing')
    expect(getHomeHeroIntroState(typingMs)).toBe('revealing-actions')
    expect(getHomeHeroIntroState(completeMs - 1)).toBe('revealing-actions')
    expect(getHomeHeroIntroState(completeMs)).toBe('complete')
    expect(getHomeHeroIntroState(completeMs + 1200)).toBe('complete')
  })
})

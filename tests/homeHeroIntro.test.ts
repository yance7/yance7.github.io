import { describe, expect, it } from 'vitest'
import {
  TYPEWRITER_TIMINGS,
  buildHomeHeroIntroTimeline,
  buildTypewriterLine,
  getHomeHeroIntroState,
  getTypewriterReveal,
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

  it('types normal characters inside the 50 to 90 millisecond window', () => {
    expect(TYPEWRITER_TIMINGS.charMs).toBeGreaterThanOrEqual(50)
    expect(TYPEWRITER_TIMINGS.charMs).toBeLessThanOrEqual(90)

    const line = buildTypewriterLine('abc')
    expect(line.starts).toEqual([0, TYPEWRITER_TIMINGS.charMs, TYPEWRITER_TIMINGS.charMs * 2])
    expect(line.totalMs).toBe(TYPEWRITER_TIMINGS.charMs * 3)
  })

  it('holds a short pause after punctuation and a longer pause after sentence marks', () => {
    const comma = buildTypewriterLine('a，b')
    expect(comma.starts[2]! - comma.starts[1]!).toBe(TYPEWRITER_TIMINGS.charMs + TYPEWRITER_TIMINGS.punctuationPauseMs)

    const period = buildTypewriterLine('a。b')
    expect(period.starts[2]! - period.starts[1]!).toBe(TYPEWRITER_TIMINGS.charMs + TYPEWRITER_TIMINGS.sentencePauseMs)
  })

  it('keeps the line pause between 120 and 180 milliseconds', () => {
    expect(TYPEWRITER_TIMINGS.linePauseMs).toBeGreaterThanOrEqual(120)
    expect(TYPEWRITER_TIMINGS.linePauseMs).toBeLessThanOrEqual(180)
  })

  it('maps elapsed time from the text timeline to the correct intro phase', () => {
    const timeline = buildHomeHeroIntroTimeline('你好，我是 Yance', '欢迎来到我的世界')
    expect(timeline.typingMs).toBe(
      timeline.greeting.totalMs + TYPEWRITER_TIMINGS.linePauseMs + timeline.statement.totalMs
    )
    expect(timeline.completeMs).toBe(timeline.typingMs + TYPEWRITER_TIMINGS.actionsMs)

    expect(getHomeHeroIntroState(timeline.typingMs - 1, timeline)).toBe('typing')
    expect(getHomeHeroIntroState(timeline.typingMs, timeline)).toBe('revealing-actions')
    expect(getHomeHeroIntroState(timeline.completeMs - 1, timeline)).toBe('revealing-actions')
    expect(getHomeHeroIntroState(timeline.completeMs, timeline)).toBe('complete')
    expect(getHomeHeroIntroState(timeline.completeMs + 1200, timeline)).toBe('complete')
  })

  it('reveals graphemes progressively and settles at the line total', () => {
    const line = buildTypewriterLine('abc')
    expect(getTypewriterReveal(line, -1)).toBe(0)
    expect(getTypewriterReveal(line, 0)).toBe(1)
    expect(getTypewriterReveal(line, TYPEWRITER_TIMINGS.charMs)).toBe(2)
    expect(getTypewriterReveal(line, line.totalMs)).toBe(3)
    expect(getTypewriterReveal(line, line.totalMs + 500)).toBe(3)
  })
})

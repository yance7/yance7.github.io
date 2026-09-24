export const HOME_HERO_INTRO_STORAGE_KEY = 'yance-home-hero-intro-v1'

export const HOME_HERO_INTRO_TIMINGS = {
  firstLineMs: 720,
  linePauseMs: 160,
  secondLineMs: 1500,
  actionsMs: 320
} as const

interface GraphemeSegmenter {
  segment(value: string): Iterable<{ segment: string }>
}

type GraphemeSegmenterFactory = () => GraphemeSegmenter | null

export interface HomeHeroIntroEnvironment {
  hasPlayed: boolean
  reducedMotion: boolean
  saveData: boolean
}

function createIntlSegmenter(): GraphemeSegmenter | null {
  const Segmenter = (Intl as unknown as {
    Segmenter?: new (locale?: string | string[], options?: { granularity: 'grapheme' }) => GraphemeSegmenter
  }).Segmenter

  return Segmenter ? new Segmenter(undefined, { granularity: 'grapheme' }) : null
}

function splitGraphemesFallback(value: string): string[] {
  const graphemes: string[] = []
  let current = ''
  let regionalIndicatorCount = 0

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0
    const isRegionalIndicator = codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff
    const isExtend = /\p{Mark}/u.test(character)
      || (codePoint >= 0xfe00 && codePoint <= 0xfe0f)
      || (codePoint >= 0xe0100 && codePoint <= 0xe01ef)
      || (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff)
      || (codePoint >= 0xe0020 && codePoint <= 0xe007f)
    const joinsPrevious = current.endsWith('\u200d')
      || character === '\u200d'
      || isExtend
      || (character === '\n' && current.endsWith('\r'))
      || (isRegionalIndicator && regionalIndicatorCount === 1)

    if (!current || joinsPrevious) {
      current += character
    } else {
      graphemes.push(current)
      current = character
    }

    regionalIndicatorCount = isRegionalIndicator
      ? regionalIndicatorCount + 1
      : 0
    if (regionalIndicatorCount === 2) regionalIndicatorCount = 0
  }

  if (current) graphemes.push(current)
  return graphemes
}

export function splitGraphemes(
  value: string,
  createSegmenter: GraphemeSegmenterFactory = createIntlSegmenter
): string[] {
  const segmenter = createSegmenter()
  return segmenter
    ? Array.from(segmenter.segment(value), ({ segment }) => segment)
    : splitGraphemesFallback(value)
}

export function shouldAnimateHomeHeroIntro(environment: HomeHeroIntroEnvironment): boolean {
  return !environment.hasPlayed && !environment.reducedMotion && !environment.saveData
}

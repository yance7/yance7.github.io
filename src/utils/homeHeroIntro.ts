export const TYPEWRITER_TIMINGS = {
  charMs: 70,
  punctuationPauseMs: 200,
  sentencePauseMs: 300,
  linePauseMs: 160,
  actionsMs: 320
} as const

export type HomeHeroIntroState = 'typing' | 'revealing-actions' | 'complete'

const punctuationChars = new Set(['，', ',', '、', ';', '；', ':', '：'])
const sentenceChars = new Set(['。', '.', '！', '!', '？', '?', '…', '—'])

export interface TypewriterLine {
  graphemes: string[]
  starts: number[]
  totalMs: number
}

export interface HomeHeroIntroTimeline {
  greeting: TypewriterLine
  statement: TypewriterLine
  typingMs: number
  completeMs: number
}

export function buildTypewriterLine(text: string): TypewriterLine {
  const graphemes = splitGraphemes(text)
  const starts: number[] = []
  let elapsed = 0

  for (const grapheme of graphemes) {
    starts.push(elapsed)
    elapsed += TYPEWRITER_TIMINGS.charMs
    if (sentenceChars.has(grapheme)) elapsed += TYPEWRITER_TIMINGS.sentencePauseMs
    else if (punctuationChars.has(grapheme)) elapsed += TYPEWRITER_TIMINGS.punctuationPauseMs
  }

  return { graphemes, starts, totalMs: elapsed }
}

export function buildHomeHeroIntroTimeline(greeting: string, statement: string): HomeHeroIntroTimeline {
  const greetingLine = buildTypewriterLine(greeting)
  const statementLine = buildTypewriterLine(statement)
  const typingMs = greetingLine.totalMs + TYPEWRITER_TIMINGS.linePauseMs + statementLine.totalMs

  return {
    greeting: greetingLine,
    statement: statementLine,
    typingMs,
    completeMs: typingMs + TYPEWRITER_TIMINGS.actionsMs
  }
}

export function getHomeHeroIntroState(elapsedMs: number, timeline: HomeHeroIntroTimeline): HomeHeroIntroState {
  if (elapsedMs < timeline.typingMs) return 'typing'
  if (elapsedMs < timeline.completeMs) return 'revealing-actions'
  return 'complete'
}

export function getTypewriterReveal(line: TypewriterLine, elapsedMs: number): number {
  if (elapsedMs >= line.totalMs) return line.graphemes.length
  if (elapsedMs < 0) return 0

  let revealed = 0
  for (let index = 0; index < line.starts.length; index += 1) {
    if (line.starts[index]! <= elapsedMs) revealed = index + 1
    else break
  }
  return revealed
}

interface GraphemeSegmenter {
  segment(value: string): Iterable<{ segment: string }>
}

type GraphemeSegmenterFactory = () => GraphemeSegmenter | null

export interface HomeHeroIntroEnvironment {
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
  return !environment.reducedMotion && !environment.saveData
}

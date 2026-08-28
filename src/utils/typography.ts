import type { Locale } from '../i18n/types'

const closingPunctuation = new Set('，。！？；：、…）》」』”’),.;:!?]}'.split(''))
const englishClosingPunctuation = new Set('.,;:!?%…)]}»”’'.split(''))

export type LyricToken =
  | { type: 'char' | 'word'; text: string; animationStart: number }
  | { type: 'space'; text: ' ' }

export function splitLyricChars(value: string) {
  const chunks: string[] = []
  for (const char of value) {
    if (closingPunctuation.has(char) && chunks.length > 0) {
      chunks[chunks.length - 1] += char
    } else {
      chunks.push(char)
    }
  }
  return chunks
}

function isEnglishClosingPunctuation(value: string) {
  return [...value].length > 0 && [...value].every((char) => englishClosingPunctuation.has(char))
}

function splitEnglishLyricTokens(value: string): LyricToken[] {
  const tokens: LyricToken[] = []
  let animationStart = 0

  for (const segment of value.match(/\s+|[^\s]+/gu) ?? []) {
    if (/^\s+$/u.test(segment)) {
      Array.from(segment).forEach(() => tokens.push({ type: 'space', text: ' ' }))
      continue
    }

    const previous = tokens[tokens.length - 1]
    const precedingWord = previous?.type === 'word'
      ? previous
      : previous?.type === 'space' && tokens[tokens.length - 2]?.type === 'word'
        ? tokens[tokens.length - 2]
        : undefined

    if (precedingWord && isEnglishClosingPunctuation(segment)) {
      if (previous?.type === 'space') tokens.pop()
      precedingWord.text += segment
      animationStart += [...segment].length
      continue
    }

    tokens.push({ type: 'word', text: segment, animationStart })
    animationStart += [...segment].length
  }

  return tokens
}

export function splitLyricTokens(value: string, locale: Locale): LyricToken[] {
  if (locale === 'en') return splitEnglishLyricTokens(value)

  return splitLyricChars(value).map((text, animationStart) => ({
    type: 'char',
    text,
    animationStart
  }))
}

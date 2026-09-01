import { describe, expect, it } from 'vitest'
import { splitLyricChars, splitLyricTokens } from '../src/utils/typography'

describe('lyric typography', () => {
  it('keeps closing punctuation with the preceding character', () => {
    expect(splitLyricChars('我不完美的梦，你陪着我想')).toEqual(['我', '不', '完', '美', '的', '梦，', '你', '陪', '着', '我', '想'])
  })

  it('leaves titles without closing punctuation unchanged', () => {
    expect(splitLyricChars('一步一步往上爬')).toEqual(['一', '步', '一', '步', '往', '上', '爬'])
  })

  it('groups English words and gives spaces a measurable token', () => {
    expect(splitLyricTokens('From here, tomorrow finds its way', 'en')).toEqual([
      { type: 'word', text: 'From', animationStart: 0 },
      { type: 'space', text: ' ' },
      { type: 'word', text: 'here,', animationStart: 4 },
      { type: 'space', text: ' ' },
      { type: 'word', text: 'tomorrow', animationStart: 9 },
      { type: 'space', text: ' ' },
      { type: 'word', text: 'finds', animationStart: 17 },
      { type: 'space', text: ' ' },
      { type: 'word', text: 'its', animationStart: 22 },
      { type: 'space', text: ' ' },
      { type: 'word', text: 'way', animationStart: 25 }
    ])
  })

  it('keeps English closing punctuation attached to the preceding word', () => {
    const tokens = splitLyricTokens('My dream is imperfect; still, you dream it with me', 'en')

    expect(tokens.filter((token) => token.type === 'word').map((token) => token.text)).toEqual([
      'My', 'dream', 'is', 'imperfect;', 'still,', 'you', 'dream', 'it', 'with', 'me'
    ])
    expect(tokens.filter((token) => token.type === 'space')).toHaveLength(9)
    expect(tokens).not.toContainEqual({ type: 'word', text: 'imperfect' })
    expect(tokens).not.toContainEqual({ type: 'word', text: 'still' })
  })

  it('keeps a trailing English punctuation mark in the same word group', () => {
    expect(splitLyricTokens('Numbers are honest,', 'en')).toEqual([
      { type: 'word', text: 'Numbers', animationStart: 0 },
      { type: 'space', text: ' ' },
      { type: 'word', text: 'are', animationStart: 7 },
      { type: 'space', text: ' ' },
      { type: 'word', text: 'honest,', animationStart: 10 }
    ])
  })

  it('preserves character-oriented Chinese tokens', () => {
    expect(splitLyricTokens('我不完美的梦，你陪着我想', 'zh-CN')).toEqual(
      splitLyricChars('我不完美的梦，你陪着我想').map((text, animationStart) => ({
        type: 'char',
        text,
        animationStart
      }))
    )
  })
})

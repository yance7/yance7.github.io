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
    expect(splitLyricTokens('Academic record', 'en')).toEqual([
      { type: 'word', text: 'Academic', animationStart: 0 },
      { type: 'space', text: ' ' },
      { type: 'word', text: 'record', animationStart: 8 }
    ])
  })

  it('keeps English closing punctuation attached to the preceding word', () => {
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

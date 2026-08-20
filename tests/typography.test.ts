import { describe, expect, it } from 'vitest'
import { splitLyricChars } from '../src/utils/typography'

describe('lyric typography', () => {
  it('keeps closing punctuation with the preceding character', () => {
    expect(splitLyricChars('我不完美的梦，你陪着我想')).toEqual(['我', '不', '完', '美', '的', '梦，', '你', '陪', '着', '我', '想'])
  })

  it('leaves titles without closing punctuation unchanged', () => {
    expect(splitLyricChars('一步一步往上爬')).toEqual(['一', '步', '一', '步', '往', '上', '爬'])
  })
})

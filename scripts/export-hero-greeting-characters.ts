import { getLocalizedHomeCopy } from '../src/data/locales/index.ts'

const samples = (['zh-CN', 'zh-HK', 'en'] as const).map(locale => {
  const { heroGreeting, heroStatement } = getLocalizedHomeCopy(locale)
  return { locale, greeting: heroGreeting, statement: heroStatement }
})
const basicLatin = Array.from({ length: 95 }, (_, index) => String.fromCodePoint(32 + index)).join('')
const characters = [...new Set(basicLatin + samples.map(({ greeting, statement }) => `${greeting} ${statement}`).join(''))]
  .sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!)

process.stdout.write(JSON.stringify({ samples, characters: characters.join('') }) + '\n')

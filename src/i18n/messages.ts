import { enMessages } from './ui/en'
import { zhCNMessages } from './ui/zh-CN'
import { zhHKMessages } from './ui/zh-HK'
import type { Locale, UiMessages } from './types'

export const uiMessages = {
  'zh-CN': zhCNMessages,
  'zh-HK': zhHKMessages,
  en: enMessages
} satisfies Record<Locale, UiMessages>

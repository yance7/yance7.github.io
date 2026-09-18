import { enMessages } from './ui/en.ts'
import { zhCNMessages } from './ui/zh-CN.ts'
import { zhHKMessages } from './ui/zh-HK.ts'
import type { Locale, UiMessages } from './types.ts'

export const uiMessages = {
  'zh-CN': zhCNMessages,
  'zh-HK': zhHKMessages,
  en: enMessages
} satisfies Record<Locale, UiMessages>

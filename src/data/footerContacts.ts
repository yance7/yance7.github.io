export type FooterContactKey = 'email' | 'github'

export interface FooterContact {
  key: FooterContactKey
  href: string
  value: string
  external: boolean
}

export const footerContacts: readonly FooterContact[] = [
  {
    key: 'email',
    href: 'mailto:yance777@outlook.com',
    value: 'yance777@outlook.com',
    external: false
  },
  {
    key: 'github',
    href: 'https://github.com/yance7',
    value: '@yance7',
    external: true
  }
]

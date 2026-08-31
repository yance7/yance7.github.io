export type FooterContactKey = 'email' | 'github' | 'instagram' | 'x'

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
  },
  {
    key: 'instagram',
    href: 'https://www.instagram.com/andreasyan.826/',
    value: '@andreasyan.826',
    external: true
  },
  {
    key: 'x',
    href: 'https://x.com/CeYan77777',
    value: '@CeYan77777',
    external: true
  }
]

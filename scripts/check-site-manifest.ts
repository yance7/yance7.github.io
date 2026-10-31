import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { THEME_COLORS } from '../src/themeColors'

const manifestPath = resolve('public/assets/site.webmanifest')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
  theme_color?: string
  background_color?: string
  icons?: Array<{ src?: string }>
}

if (manifest.theme_color !== THEME_COLORS.light) {
  throw new Error(`site.webmanifest theme_color must match THEME_COLORS.light (${THEME_COLORS.light})`)
}
if (manifest.background_color !== THEME_COLORS.light) {
  throw new Error(`site.webmanifest background_color must match THEME_COLORS.light (${THEME_COLORS.light})`)
}

const icons = manifest.icons?.map(({ src }) => src) ?? []
const expectedIcons = [
  '/assets/images/brand/yance-icon-192.png',
  '/assets/images/brand/yance-icon-512.png'
]
if (JSON.stringify(icons) !== JSON.stringify(expectedIcons)) {
  throw new Error('site.webmanifest icon paths no longer match the P1-migrated assets')
}

console.log('site-manifest: fixed theme colors and migrated icon paths verified')

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { THEME_COLORS } from '../src/themeColors'

const manifestPath = resolve(process.cwd(), 'public/assets/site.webmanifest')

describe('site manifest theme colors', () => {
  it('keeps both fixed manifest colors aligned with the shared light theme', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      theme_color: string
      background_color: string
    }

    expect(manifest.theme_color).toBe(THEME_COLORS.light)
    expect(manifest.background_color).toBe(THEME_COLORS.light)
  })

  it('keeps the P1-migrated installed icon paths', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      icons: Array<{ src: string }>
    }

    expect(manifest.icons.map(({ src }) => src)).toEqual([
      '/assets/images/brand/yance-icon-192.png',
      '/assets/images/brand/yance-icon-512.png'
    ])
  })
})

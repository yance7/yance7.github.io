import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('brand mark release contracts', () => {
  it('keeps the selected source and generated runtime assets in the brand folders', () => {
    expect(existsSync(resolve(root, 'design-assets/yance-brand-master.png'))).toBe(true)

    for (const asset of [
      'favicon-16.png',
      'favicon-32.png',
      'yance-icon-180.png',
      'yance-icon-192.png',
      'yance-icon-512.png',
      'yance-mark-96.webp',
      'yance-mark-128.webp',
      'yance-mark-fallback.png'
    ]) {
      expect(existsSync(resolve(root, `public/assets/brand/${asset}`))).toBe(true)
    }
  })

  it('routes both shell identity surfaces through the shared full-mark component', () => {
    const component = readFileSync(resolve(root, 'src/components/BrandMark.vue'), 'utf8')
    const header = readFileSync(resolve(root, 'src/components/SiteHeader.vue'), 'utf8')
    const footer = readFileSync(resolve(root, 'src/components/SiteFooter.vue'), 'utf8')
    const generator = readFileSync(resolve(root, 'scripts/generate-brand-assets.py'), 'utf8')

    expect(component).toContain("variant?: 'header' | 'footer'")
    expect(component).toContain('/assets/brand/yance-mark-96.webp')
    expect(component).toContain(':loading="isHeader ? \'eager\' : \'lazy\'"')
    expect(component).toContain(':fetchpriority="isHeader ? \'high\' : \'low\'"')
    expect(header).toContain('<BrandMark variant="header" />')
    expect(footer).toContain('<BrandMark variant="footer" />')
    expect(footer).toContain('<strong>Yance.</strong>')
    expect(generator).toContain("SOURCE = ROOT / 'design-assets' / 'yance-brand-master.png'")
    expect(generator).toContain("parser.add_argument('--check'")
    expect(generator).toContain('committed files match the selected master source')
    expect(generator).toContain('make_simplified_icon')
    expect(generator).toContain("ICON_SIZES = (16, 32, 180, 192, 512)")
  })

  it('publishes the simplified icon through every document shell and manifest purpose', () => {
    const manifest = readFileSync(resolve(root, 'public/assets/site.webmanifest'), 'utf8')

    for (const page of ['index', 'academics', 'honors', 'research', 'works', 'concerts', '404']) {
      const html = readFileSync(resolve(root, `html-src/${page}.html`), 'utf8')
      expect(html).toContain('/assets/brand/favicon-16.png')
      expect(html).toContain('/assets/brand/favicon-32.png')
      expect(html).toContain('/assets/brand/yance-icon-180.png')
      expect(html).toContain('/assets/site.webmanifest')
    }

    expect(manifest).toContain('"src": "/assets/brand/yance-icon-192.png"')
    expect(manifest).toContain('"src": "/assets/brand/yance-icon-512.png"')
    expect(manifest).toContain('"purpose": "any maskable"')
  })
})

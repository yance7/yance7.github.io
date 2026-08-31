import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('brand mark release contracts', () => {
  it('keeps the canonical RGBA source and generated runtime assets in the brand folders', () => {
    const source = readFileSync(resolve(root, 'design-assets/yance-brand-master.png'))

    expect(existsSync(resolve(root, 'design-assets/yance-brand-master.png'))).toBe(true)
    expect(source.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(source.readUInt32BE(16)).toBe(1254)
    expect(source.readUInt32BE(20)).toBe(1254)
    expect(source[24]).toBe(8)
    expect(source[25]).toBe(6)

    for (const asset of [
      'favicon-16.png',
      'favicon-32.png',
      'yance-icon-180.png',
      'yance-icon-192.png',
      'yance-icon-512.png',
      'yance-mark-48.webp',
      'yance-mark-64.webp',
      'yance-mark-96.webp',
      'yance-mark-128.webp',
      'yance-mark-256.webp',
      'yance-mark-fallback.png'
    ]) {
      expect(existsSync(resolve(root, `public/assets/brand/${asset}`))).toBe(true)
    }
  })

  it('routes both shell identity surfaces through one source-derived raster mark', () => {
    const component = readFileSync(resolve(root, 'src/components/BrandMark.vue'), 'utf8')
    const componentStyles = readFileSync(resolve(root, 'src/styles/components.css'), 'utf8')
    const header = readFileSync(resolve(root, 'src/components/SiteHeader.vue'), 'utf8')
    const footer = readFileSync(resolve(root, 'src/components/SiteFooter.vue'), 'utf8')
    const generator = readFileSync(resolve(root, 'scripts/generate-brand-assets.py'), 'utf8')

    expect(component).toContain("variant?: 'header' | 'footer' | 'full'")
    expect(component).toContain("tone?: 'brand' | 'mono'")
    expect(component).toContain('<picture>')
    expect(component).toContain('class="brand-mark-image"')
    expect(component).toContain('/assets/brand/yance-mark-96.webp')
    expect(component).toContain('/assets/brand/yance-mark-128.webp')
    expect(component).toContain('/assets/brand/yance-mark-fallback.png')
    expect(component).toContain('width="128"')
    expect(component).toContain('height="128"')
    expect(component).not.toContain('<svg')
    expect(component).not.toContain('brand-mark-svg')
    expect(component).not.toContain('data-brand-part')
    expect(componentStyles).toContain('.brand-mark-mono')
    expect(componentStyles).toContain('filter: var(--brand-mark-filter);')
    expect(componentStyles).toContain('grayscale(1)')
    expect(componentStyles).toContain('.brand-mark-header')
    expect(componentStyles).toContain('.brand-mark-footer')
    expect(header).toContain('<BrandMark variant="header" />')
    expect(footer).toContain('<BrandMark variant="footer" />')
    expect(header).not.toContain('/assets/brand/yance-mark-96.webp')
    expect(footer).toContain('<div class="foot-meta">')
    expect(footer).not.toContain('<strong>Yance.</strong>')
    expect(generator).toContain("SOURCE = ROOT / 'design-assets' / 'yance-brand-master.png'")
    expect(generator).toContain("parser.add_argument('--check'")
    expect(generator).toContain('committed files match the selected master source')
    expect(generator).toContain("ICON_SIZES = (16, 32, 180, 192, 512)")
    expect(generator).toContain('master = square_canvas(trim_alpha(source.copy()))')
    expect(generator).toContain('for size in ICON_SIZES:')
    expect(generator).toContain('save_png(resize(master, size),')
    for (const forbidden of ['make_simplified_icon', 'draw_icon_polygon', 'ImageDraw', 'ICON_BACKGROUND', 'ICON_GOLD', 'ICON_TEAL', 'ICON_NAVY']) {
      expect(generator).not.toContain(forbidden)
    }
    expect(generator).toContain('actual_names != expected_names')
    expect(generator).toContain('expected_rgba.tobytes() != actual_rgba.tobytes()')
  })

  it('keeps independent light and dark brand tokens and a real mono treatment', () => {
    const component = readFileSync(resolve(root, 'src/components/BrandMark.vue'), 'utf8')
    const theme = readFileSync(resolve(root, 'src/theme.css'), 'utf8')

    for (const token of ['--brand-navy', '--brand-teal', '--brand-gold', '--brand-glow', '--brand-edge']) {
      expect((theme.match(new RegExp(token, 'g')) ?? []).length).toBeGreaterThanOrEqual(2)
    }
    expect(theme).toContain("[data-theme='light']")
    expect(theme).toContain("[data-theme='dark']")
    expect(component).toContain('brand-mark-mono')
    expect(component).toContain('tone')
  })

  it('publishes the canonical icon through every document shell and manifest purpose', () => {
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

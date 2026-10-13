import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('MiMo cursor profile', () => {
  it('uses a 32px ring, 6px dot and 80px text/button hover ring', () => {
    const css = readFileSync('src/styles/components.css', 'utf8')
    expect(css).toMatch(/\.sitewide-cursor-ring\s*\{[^}]*width:\s*32px/)
    expect(css).toMatch(/\.sitewide-cursor-dot\s*\{[^}]*width:\s*6px/)
    expect(css).toMatch(/data-context='text'[\s\S]*?width:\s*80px/)
    expect(css).toContain('0.5s cubic-bezier(.23, 1, .32, 1)')
  })

  it('writes both positions directly and has no ring interpolation loop', () => {
    const source = readFileSync('src/components/SitewideCursor.vue', 'utf8')
    expect(source).toContain('dot.style.left')
    expect(source).toContain('ring.style.left')
    expect(source).not.toContain('animateRing')
  })
})

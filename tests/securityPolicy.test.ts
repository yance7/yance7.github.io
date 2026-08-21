import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('security and privacy release policy', () => {
  it('documents the current CSP and no-tracker decision', () => {
    const policy = readFileSync(resolve(root, 'docs/security-privacy-decisions.md'), 'utf8')
    expect(policy).toContain('style-src \'self\' \'unsafe-inline\'')
    expect(policy).toContain('__THEME_BOOTSTRAP_HASH__')
    expect(policy).toMatch(/不接入|无第三方/)
  })

  it('keeps every HTML entry constrained to local scripts and the theme hash', () => {
    const entries = readdirSync(resolve(root, 'html-src')).filter((file) => file.endsWith('.html'))
    expect(entries.length).toBeGreaterThan(0)

    for (const entry of entries) {
      const html = readFileSync(resolve(root, 'html-src', entry), 'utf8')
      expect(html, entry).toContain("script-src 'self' '__THEME_BOOTSTRAP_HASH__'")
      expect(html, entry).toContain("object-src 'none'")
      expect(html, entry).toMatch(/localStorage\.getItem\('yance-theme'\)/)
      expect(html, entry).not.toMatch(/<script\b[^>]*\bsrc\s*=\s*["']https?:\/\//i)
      expect(html, entry).not.toMatch(/analytics|tracker|gtag|plausible|umami/i)
    }
  })
})

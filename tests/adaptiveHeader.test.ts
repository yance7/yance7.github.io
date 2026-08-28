import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('adaptive header source contracts', () => {
  it('keeps one header DOM with a separate sentinel and visual surface', () => {
    const header = readFileSync(resolve(root, 'src/components/SiteHeader.vue'), 'utf8')

    expect(header.match(/<header\b/g)).toHaveLength(1)
    expect(header).toContain('useAdaptiveHeader')
    expect(header).toContain('ref="sentinelRef" class="site-nav-sentinel"')
    expect(header).toContain('class="site-nav"')
    expect(header).toContain(':data-header-state="headerState"')
    expect(header).toContain('class="site-nav-surface"')
    expect(header).toContain('class="nav-rail"')
  })

  it('uses an IntersectionObserver-only state composable with cleanup', () => {
    const composable = readFileSync(resolve(root, 'src/composables/useAdaptiveHeader.ts'), 'utf8')

    expect(composable).toContain('export type HeaderState = \'resting\' | \'floating\'')
    expect(composable).toContain('IntersectionObserver')
    expect(composable).toContain('observer?.disconnect()')
    expect(composable).not.toContain("addEventListener('scroll'")
    expect(composable).not.toContain('usePageCompass')
    expect(composable).not.toContain('useTheme')
  })

  it('keeps navigation visuals tokenized and transition properties explicit', () => {
    const theme = readFileSync(resolve(root, 'src/theme.css'), 'utf8')
    const shell = readFileSync(resolve(root, 'src/styles/shell.css'), 'utf8')

    for (const token of [
      '--nav-resting-bg',
      '--nav-floating-bg',
      '--nav-floating-border',
      '--nav-floating-shadow',
      '--nav-floating-blur',
      '--nav-floating-inline',
      '--nav-floating-top',
      '--nav-floating-radius'
    ]) {
      expect(theme).toContain(`${token}:`)
    }

    expect(shell).toContain('.site-nav-surface')
    expect(shell).toContain('pointer-events: none')
    expect(shell).toContain('pointer-events: auto')
    expect(shell).toContain(".site-nav[data-header-state='floating']")
    expect(shell).not.toMatch(/transition:\s*all/)
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

describe('archive design tokens', () => {
  const theme = read('src/theme.css')
  const base = read('src/styles/base.css')
  const components = read('src/styles/components.css')
  const home = read('src/styles/home.css')
  const academics = read('src/styles/academics.css')
  const honors = read('src/styles/honors.css')
  const research = read('src/styles/research.css')
  const concerts = read('src/styles/concerts.css')
  const shell = read('src/styles/shell.css')
  const works = read('src/styles/works.css')
  const responsive = read('src/styles/responsive.css')
  const pageStyles = [home, academics, honors, research, concerts, works].join('\n')

  it('defines the archive typography and layout scale', () => {
    expect(theme).toContain('--type-body-size: 1rem')
    expect(theme).toContain('--type-body-leading: 1.78')
    expect(theme).toContain('--type-secondary-size: .8125rem')
    expect(theme).toContain('--type-meta-size: .75rem')
    expect(theme).toContain('--font-prose: "Inter Variable", "Noto Sans SC Variable", sans-serif')
    expect(theme).toContain('--font-editorial: "Inter Variable", "Noto Serif SC Variable", serif')
    expect(theme).toContain('--font-technical: "IBM Plex Mono", "Noto Sans SC Variable", monospace')
    expect(theme).toContain('--tracking-latin-meta: .14em')
    expect(theme).toContain('--tracking-latin-wide: .18em')
    expect(theme).toContain('--tracking-zh-meta: .06em')
    expect(theme).toContain('--tracking-editorial: -.01em')
    expect(theme).toContain('--w-editorial: 700px')
    expect(theme).toContain('--w-data: 840px')
    expect(theme).toContain('--space-1: 4px')
    expect(theme).toContain('--space-2: 8px')
    expect(theme).toContain('--space-3: 12px')
    expect(theme).toContain('--space-4: 16px')
    expect(theme).toContain('--space-5: 24px')
    expect(theme).toContain('--space-6: 32px')
    expect(theme).toContain('--space-7: 48px')
    expect(theme).toContain('--space-8: 64px')
    expect(theme).toContain('--space-9: 96px')
    expect(theme).toContain('--space-10: 128px')
    expect(theme).toContain('--radius-small: 6px')
    expect(theme).toContain('--radius-card: 14px')
    expect(theme).toContain('--radius-large: 20px')
    expect(theme).toContain('--radius-pill: 999px')
  })

  it('keeps the public aliases and motion tokens on the semantic layer', () => {
    expect(theme).toContain('--sans: var(--font-prose)')
    expect(theme).toContain('--display: var(--font-editorial)')
    expect(theme).toContain('--mono: var(--font-technical)')
    expect(theme).toContain('--text-xs: var(--type-meta-size)')
    expect(theme).toContain('--text-sm: var(--type-secondary-size)')
    expect(theme).toContain('--w-read: var(--w-editorial)')
    expect(theme).toContain('--dur-micro: .12s')
    expect(theme).toContain('--dur-fast: .2s')
    expect(theme).toContain('--dur-base: .28s')
    expect(theme).toContain('--dur-slow: .52s')
    expect(theme).toContain('--dur-page: .56s')
  })

  it('applies the semantic typography and width contract in the touched stylesheets', () => {
    expect(base).toContain('font-family: var(--font-prose)')
    expect(base).toContain('font-size: var(--type-body-size)')
    expect(base).toContain('line-height: var(--type-body-leading)')
    expect(components).toContain('font-family: var(--font-editorial)')
    expect(components).toContain('font-family: var(--font-technical)')
    expect(pageStyles).toContain('max-width: var(--w-editorial)')
    expect(research).toContain('.toolchain-panel')
    expect(research).toContain('.timeline-track')
    expect(research).toContain('width: 100%')
    expect(research).toContain('max-width: none')
    expect(shell).toContain('font-family: var(--font-editorial)')
    expect(shell).toContain('font-family: var(--font-technical)')
    expect(shell).toContain('max-width: var(--w-editorial)')
    expect(components).toContain('font-family: var(--font-editorial)')
    expect(components).toContain('font-family: var(--font-technical)')
    expect(works).toContain('font-family: var(--font-editorial)')
    expect(works).toContain('font-family: var(--font-technical)')
    expect(works).toContain('max-width: var(--w-editorial)')
    expect(works).not.toContain('.showcase-list:has(> .showcase:only-child)')
  })

  it('preserves reduced-motion handling in the public stylesheet contract', () => {
    expect(theme).toContain('@media (prefers-reduced-motion: reduce)')
    expect(responsive).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('migrates the reviewed font-role declarations to semantic tokens', () => {
    expect(academics).toContain('font-family: var(--font-editorial); font-size: 1.3rem; color: var(--gold);')
    expect(pageStyles).not.toContain('font-family: var(--display); font-size: 1.3rem; color: var(--gold);')
    expect(shell).toContain('font-family: var(--font-technical); font-size: 1.2rem; line-height: 1;')
    expect(shell).not.toContain('font-family: var(--mono); font-size: 1.2rem; line-height: 1;')
  })

  it('migrates the reviewed surface radius declarations to semantic tokens', () => {
    expect(components).toContain('padding: 5px 8px; border-radius: var(--control-radius);')
    expect(components).not.toContain('padding: 4px 10px; border-radius: var(--radius-pill);')
    expect(components).toContain('border-radius: var(--radius-card); overflow: hidden;')
    expect(components).not.toContain('border-radius: var(--radius-lg); overflow: hidden;')
    expect(concerts).toContain('padding: 9px 12px; border-radius: var(--radius-small);')
    expect(components).not.toContain('padding: 9px 12px; border-radius: var(--radius-sm);')
    expect(shell).toContain('padding: 5px 12px 5px 6px; border-radius: var(--radius-pill);')
    expect(shell).not.toContain('padding: 5px 12px 5px 6px; border-radius: var(--radius-full);')
    expect(shell).toContain('padding: var(--space-3) var(--space-4); border: 1px solid var(--control-border); border-radius: var(--radius-pill);')
    expect(shell).not.toContain('padding: 11px 18px; border: 1px solid var(--control-border); border-radius: var(--radius-full);')
    expect(responsive).toContain('grid-template-areas: "index icon";')
    expect(responsive).toContain('min-height: 48px;')
  })

  it('keeps important responsive labels at or above the public meta size', () => {
    expect(responsive).not.toContain('font-size: .64rem')
    expect(responsive).not.toContain('font-size: .61rem')
    expect(responsive).not.toContain('font-size: .6rem')
    expect(responsive).not.toContain('font-size: .59rem')
  })

  it('uses semantic tracking tokens for repeated metadata roles', () => {
    expect(pageStyles).not.toMatch(/letter-spacing:\s*\.14em/)
    expect(pageStyles).not.toMatch(/letter-spacing:\s*\.18em/)
    expect(pageStyles).not.toMatch(/letter-spacing:\s*\.06em/)
  })

  it('keeps viewport-unit fallback declarations explicit and non-duplicated', () => {
    const compassBlock = shell.match(/\.page-compass\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
    expect(compassBlock.match(/\btop:/g)?.length).toBe(1)
    expect(compassBlock.match(/\bmax-height:/g)?.length).toBe(1)
    expect(shell).toContain('@supports (height: 100dvh)')
    expect(shell).toContain('top: 50dvh;')
    expect(shell).toContain('max-height: calc(100dvh - 32px);')
  })

  it('does not use oversized tracking for ordinary metadata labels', () => {
    const styles = [components, home, academics, honors, research, concerts, shell, works, responsive].join('\n')
    for (const value of ['.2em', '.20em', '.22em', '.24em', '.26em']) {
      expect(styles).not.toContain(`letter-spacing: ${value}`)
    }
  })
})

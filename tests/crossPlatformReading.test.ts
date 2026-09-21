import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

function expectFallbackBeforeEnhanced(source: string, fallback: string, enhanced: string) {
  const fallbackIndex = source.indexOf(fallback)
  const enhancedIndex = source.indexOf(enhanced)

  expect(fallbackIndex).toBeGreaterThanOrEqual(0)
  expect(enhancedIndex).toBeGreaterThan(fallbackIndex)
}

describe('cross-platform reading fallbacks', () => {
  const shell = read('src/styles/shell.css')
  const home = read('src/styles/home.css')
  const components = read('src/styles/components.css')
  const responsive = read('src/styles/responsive.css')
  const concerts = read('src/styles/concerts.css')

  it('keeps legacy viewport fallbacks before dynamic viewport units', () => {
    expectFallbackBeforeEnhanced(
      shell,
      'min-height: clamp(640px, calc(100vh - 88px), 920px);',
      'min-height: clamp(640px, calc(100svh - 88px), 920px);'
    )
    expectFallbackBeforeEnhanced(
      home,
      'min-height: calc(100vh - 68px);',
      'min-height: calc(100svh - 68px);'
    )
    expectFallbackBeforeEnhanced(
      components,
      '--lb-stage-max: calc(100vh - var(--lb-meta-reserve) - 88px);',
      '--lb-stage-max: calc(100dvh - var(--lb-meta-reserve) - 88px);'
    )
    expectFallbackBeforeEnhanced(
      components,
      'max-height: min(100%, 82vh);',
      'max-height: min(100%, 82vh, calc(100dvh - var(--lb-meta-reserve) - 72px), var(--lb-stage-max));'
    )
    expectFallbackBeforeEnhanced(
      responsive,
      '--lb-stage-max: calc(100vh - var(--lb-meta-reserve) - 32px);',
      '--lb-stage-max: calc(100dvh - var(--lb-meta-reserve) - 32px);'
    )
    expectFallbackBeforeEnhanced(
      responsive,
      'max-height: min(100%, 76vh);',
      'max-height: min(100%, 76vh, calc(100dvh - var(--lb-meta-reserve) - 72px), var(--lb-stage-max));'
    )
  })

  it('keeps translucent surfaces readable without backdrop-filter', () => {
    const backdropFallback = '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))'
    const componentFallback = components.slice(components.indexOf(backdropFallback))
    const concertFallback = concerts.slice(concerts.indexOf(backdropFallback))

    expect(componentFallback).toContain('.lb-meta-dock')
    expect(componentFallback).toContain('background: var(--surface-strong)')
    expect(componentFallback).toContain('backdrop-filter: none')
    expect(concertFallback).toContain('.poster-hint')
    expect(concertFallback).toContain('background: var(--media-overlay-bg-strong)')
    expect(concertFallback).toContain('backdrop-filter: none')
  })

  it('disables decorative blend effects when the blend mode is unavailable', () => {
    const blendFallback = '@supports not (mix-blend-mode: soft-light)'
    const fallback = concerts.slice(concerts.indexOf(blendFallback))

    expect(fallback).toContain('.concert-poster::after')
    expect(fallback).toContain('background: none')
    expect(fallback).toContain('opacity: 0')
  })

  it('keeps mobile lyric entrances within a short critical-content budget', () => {
    const mobileStyles = responsive.slice(responsive.indexOf('@media (max-width: 640px)'))

    expect(mobileStyles).toContain('.hero-title.hero-lyric .lyric-char')
    expect(mobileStyles).toContain('animation-duration: .42s')
    expect(mobileStyles).toContain('animation-delay: calc(50ms + var(--ci) * 20ms)')
  })
})

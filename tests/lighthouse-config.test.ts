import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

type LighthouseConfig = {
  ci: {
    collect: {
      url: string[]
      numberOfRuns: number
      settings: Record<string, unknown>
    }
    assert: {
      assertions: Record<string, [string, Record<string, number>]>
    }
  }
}

function readConfig(file: string) {
  return JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8')) as LighthouseConfig
}

function getThreshold(assertions: LighthouseConfig['ci']['assert']['assertions'], key: string) {
  const assertion = assertions[key]
  if (!assertion) throw new Error(`Missing Lighthouse assertion: ${key}`)
  return assertion[1]
}

describe('Lighthouse quality matrix', () => {
  it('covers the required desktop routes and first-stage thresholds', () => {
    const config = readConfig('.lighthouserc.json')
    const assertions = config.ci.assert.assertions

    expect(config.ci.collect.url).toEqual([
      'http://127.0.0.1:4173/index.html',
      'http://127.0.0.1:4173/academics.html',
      'http://127.0.0.1:4173/research.html',
      'http://127.0.0.1:4173/works.html',
      'http://127.0.0.1:4173/concerts.html'
    ])
    expect(config.ci.collect.numberOfRuns).toBe(3)
    expect(getThreshold(assertions, 'categories:performance').minScore).toBe(.8)
    expect(getThreshold(assertions, 'categories:accessibility').minScore).toBe(.98)
    expect(getThreshold(assertions, 'categories:best-practices').minScore).toBe(.95)
    expect(getThreshold(assertions, 'categories:seo').minScore).toBe(.95)
    expect(getThreshold(assertions, 'largest-contentful-paint').maxNumericValue).toBe(2500)
    expect(getThreshold(assertions, 'total-blocking-time').maxNumericValue).toBe(300)
    expect(getThreshold(assertions, 'cumulative-layout-shift').maxNumericValue).toBe(.1)
    expect(assertions).not.toHaveProperty('interaction-to-next-paint')
  })

  it('covers the required mobile routes and mobile emulation', () => {
    const config = readConfig('.lighthouserc.mobile.json')
    const assertions = config.ci.assert.assertions

    expect(config.ci.collect.url).toEqual([
      'http://127.0.0.1:4173/index.html',
      'http://127.0.0.1:4173/research.html',
      'http://127.0.0.1:4173/concerts.html'
    ])
    expect(config.ci.collect.numberOfRuns).toBe(3)
    expect(config.ci.collect.settings.formFactor).toBe('mobile')
    expect(config.ci.collect.settings).not.toHaveProperty('preset')
    expect(config.ci.collect.settings.screenEmulation).toMatchObject({
      mobile: true,
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      disabled: false
    })
    expect(getThreshold(assertions, 'categories:performance').minScore).toBe(.75)
    expect(getThreshold(assertions, 'categories:accessibility').minScore).toBe(.98)
    expect(assertions).not.toHaveProperty('interaction-to-next-paint')
  })

  it('defines a separate User Flow interaction budget', () => {
    const runner = readFileSync(resolve(process.cwd(), 'scripts/lighthouse-interactions.mjs'), 'utf8')

    for (const interaction of [
      'theme-toggle',
      'mobile-menu',
      'page-compass',
      'album-selection',
      'carousel-next',
      'lightbox-open',
      'lightbox-next',
      'lightbox-close'
    ]) {
      expect(runner).toContain(interaction)
    }
    expect(runner).toContain('interaction-to-next-paint')
    expect(runner).toContain('200')
    expect(runner).toContain('index.html')
    expect(runner).toContain('research.html')
    expect(runner).toContain('concerts.html')
    expect(runner).toContain('process.env.PLAYWRIGHT_PORT')
  })
})

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
    expect(getThreshold(assertions, 'categories:performance').minScore).toBe(.9)
    expect(getThreshold(assertions, 'categories:accessibility').minScore).toBe(.98)
    expect(getThreshold(assertions, 'categories:best-practices').minScore).toBe(.95)
    expect(getThreshold(assertions, 'categories:seo').minScore).toBe(.95)
    expect(getThreshold(assertions, 'largest-contentful-paint').maxNumericValue).toBe(2500)
    expect(getThreshold(assertions, 'total-blocking-time').maxNumericValue).toBe(300)
    expect(getThreshold(assertions, 'cumulative-layout-shift').maxNumericValue).toBe(.1)
    expect(getThreshold(assertions, 'interaction-to-next-paint').maxNumericValue).toBe(200)
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
    expect(config.ci.collect.settings.preset).toBe('mobile')
    expect(getThreshold(assertions, 'categories:performance').minScore).toBe(.85)
    expect(getThreshold(assertions, 'categories:accessibility').minScore).toBe(.98)
    expect(getThreshold(assertions, 'interaction-to-next-paint').maxNumericValue).toBe(200)
  })
})

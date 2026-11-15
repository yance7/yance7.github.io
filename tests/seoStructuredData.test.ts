import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const html = readFileSync(resolve(process.cwd(), 'html-src/index.html'), 'utf8')
const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]!) as Record<string, unknown>)

describe('structured data', () => {
  it('publishes Person and WebSite nodes from the root home page', () => {
    const person = jsonLd.find((entry) => entry['@type'] === 'Person')
    const website = jsonLd.find((entry) => entry['@type'] === 'WebSite')

    expect(person).toBeTruthy()
    expect(website).toBeTruthy()
    expect(website!.name).toContain('Yance')
    expect(website!.url).toBe('https://yance.me/')
    expect(person!.sameAs).toEqual(['https://github.com/yance7'])
  })

  it('keeps site-scoped URLs on the domain rather than a locale subpath', () => {
    for (const entry of jsonLd) {
      if (entry['@type'] !== 'WebSite' && entry['@type'] !== 'Person') continue
      const serialized = JSON.stringify(entry)
      expect(serialized).not.toContain('/en/')
      expect(serialized).not.toContain('/zh-hk/')
    }
  })

  it('does not invent ratings, awards, or search actions', () => {
    expect(html).not.toMatch(/"aggregateRating"|"award"|"SearchAction"/)
  })
})
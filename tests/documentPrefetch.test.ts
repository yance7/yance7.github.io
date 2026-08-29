import { describe, expect, it } from 'vitest'
import { createDocumentPrefetcher } from '../src/utils/documentPrefetch'

function createDocumentStub() {
  const links: Array<{ rel: string; href: string }> = []
  return {
    links,
    document: {
      head: { append: (link: { rel: string; href: string }) => links.push(link) },
      createElement: () => ({ rel: '', href: '' })
    } as unknown as Pick<Document, 'createElement' | 'head'>
  }
}

describe('document prefetch registration', () => {
  it('registers one same-origin destination and deduplicates repeated intent', () => {
    const stub = createDocumentStub()
    const prefetch = createDocumentPrefetcher(stub.document, 'https://site.test/en/research.html?tab=tools#timeline')

    expect(prefetch('/zh-hk/research.html?tab=tools#timeline')).toBe(true)
    expect(prefetch('https://site.test/zh-hk/research.html?tab=tools#timeline')).toBe(false)
    expect(stub.links).toEqual([{
      rel: 'prefetch',
      href: 'https://site.test/zh-hk/research.html?tab=tools#timeline'
    }])
  })

  it('skips the current document and cross-origin destinations', () => {
    const stub = createDocumentStub()
    const prefetch = createDocumentPrefetcher(stub.document, 'https://site.test/en/research.html?tab=tools#timeline')

    expect(prefetch('/en/research.html?tab=tools#other')).toBe(false)
    expect(prefetch('https://other.test/zh-hk/research.html')).toBe(false)
    expect(stub.links).toHaveLength(0)
  })
})

export type PrefetchDocument = (href: string) => boolean

export function createDocumentPrefetcher(
  documentRef: Pick<Document, 'createElement' | 'head'>,
  currentHref: string
): PrefetchDocument {
  let current: URL
  try {
    current = new URL(currentHref)
  } catch {
    return () => false
  }

  const registered = new Set<string>()

  return (href) => {
    let target: URL
    try {
      target = new URL(href, current)
    } catch {
      return false
    }
    if (target.origin !== current.origin) return false
    if (target.pathname === current.pathname && target.search === current.search) return false

    const normalizedHref = target.href
    if (registered.has(normalizedHref)) return false

    const link = documentRef.createElement('link') as HTMLLinkElement
    link.rel = 'prefetch'
    link.href = normalizedHref
    documentRef.head.append(link)
    registered.add(normalizedHref)
    return true
  }
}

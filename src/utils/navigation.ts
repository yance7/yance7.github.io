export function decodeHashTarget(hash: string): string | null {
  const encoded = hash.startsWith('#') ? hash.slice(1) : hash
  if (!encoded) return null
  try {
    return decodeURIComponent(encoded)
  } catch {
    return null
  }
}

export async function retryAsync<T>(
  operation: () => Promise<T>,
  options: { retries?: number; delayMs?: number } = {}
) {
  const retries = Math.max(0, options.retries ?? 2)
  const delayMs = Math.max(0, options.delayMs ?? 120)
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt === retries) break
      if (delayMs) await new Promise((resolve) => globalThis.setTimeout(resolve, delayMs))
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

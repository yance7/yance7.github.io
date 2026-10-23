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
  options: { retries?: number; delayMs?: number; signal?: AbortSignal } = {}
) {
  const retries = Math.max(0, options.retries ?? 2)
  const delayMs = Math.max(0, options.delayMs ?? 120)
  let lastError: unknown
  const abortReason = () => options.signal?.reason ?? new Error('Operation aborted')
  const throwIfAborted = () => { if (options.signal?.aborted) throw abortReason() }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    throwIfAborted()
    try {
      return await operation()
    } catch (error) {
      throwIfAborted()
      lastError = error
      if (attempt === retries) break
      if (delayMs) await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          globalThis.clearTimeout(timer)
          options.signal?.removeEventListener('abort', onAbort)
        }
        const onAbort = () => { cleanup(); reject(abortReason()) }
        const timer = globalThis.setTimeout(() => { cleanup(); resolve() }, delayMs)
        options.signal?.addEventListener('abort', onAbort, { once: true })
        if (options.signal?.aborted) onAbort()
      })
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

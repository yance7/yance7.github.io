import { retryAsync } from './navigation'

export async function loadPageWithDeadline<T>(
  loader: () => Promise<T>,
  options: { deadlineMs?: number; retries?: number; delayMs?: number; signal?: AbortSignal } = {}
) {
  const controller = new AbortController()
  const abortFromPage = () => controller.abort(options.signal?.reason ?? new Error('Page load aborted'))
  let onAbort = () => {}
  const cancelled = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(controller.signal.reason)
    controller.signal.addEventListener('abort', onAbort, { once: true })
  })
  options.signal?.addEventListener('abort', abortFromPage, { once: true })
  if (options.signal?.aborted) abortFromPage()
  const deadline = globalThis.setTimeout(() => controller.abort(new Error('Page load timed out')), Math.max(0, options.deadlineMs ?? 15000))
  try {
    return await Promise.race([
      retryAsync(loader, { retries: options.retries ?? 2, delayMs: options.delayMs ?? 160, signal: controller.signal }),
      cancelled
    ])
  } finally {
    globalThis.clearTimeout(deadline)
    options.signal?.removeEventListener('abort', abortFromPage)
    controller.signal.removeEventListener('abort', onAbort)
  }
}

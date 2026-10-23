import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadPageWithDeadline } from '../src/utils/pageLoad'

afterEach(() => vi.useRealTimers())

describe('page chunk loading deadline', () => {
  it('returns a successful module without retaining a deadline timer', async () => {
    vi.useFakeTimers()
    const module = { default: { name: 'Page' } }
    expect(await loadPageWithDeadline(async () => module)).toBe(module)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('retains two bounded retries for transient chunk failures', async () => {
    vi.useFakeTimers()
    const loader = vi.fn().mockRejectedValueOnce(new Error('temporary')).mockRejectedValueOnce(new Error('temporary')).mockResolvedValue('ready')
    const loading = loadPageWithDeadline(loader)
    await vi.advanceTimersByTimeAsync(320)
    expect(await loading).toBe('ready')
    expect(loader).toHaveBeenCalledTimes(3)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ends a permanently pending import at the overall deadline', async () => {
    vi.useFakeTimers()
    const loading = loadPageWithDeadline(() => new Promise(() => {}))
    const failure = expect(loading).rejects.toThrow(/timed out/i)
    await vi.advanceTimersByTimeAsync(15000)
    await failure
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not start new imports after an expired import rejects late', async () => {
    vi.useFakeTimers()
    let rejectImport: (error: Error) => void = () => {}
    const loader = vi.fn(() => new Promise((_resolve, reject) => { rejectImport = reject }))
    const loading = loadPageWithDeadline(loader)
    const failure = expect(loading).rejects.toThrow(/timed out/i)
    await vi.advanceTimersByTimeAsync(15000)
    await failure
    rejectImport(new Error('late network rejection'))
    await vi.runAllTimersAsync()
    expect(loader).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cleans pending retry and deadline timers when the page is disposed', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const loader = vi.fn().mockRejectedValue(new Error('network'))
    const loading = loadPageWithDeadline(loader, { signal: controller.signal })
    const failure = expect(loading).rejects.toThrow(/abort/i)
    await vi.advanceTimersByTimeAsync(80)
    controller.abort()
    await failure
    await vi.runAllTimersAsync()
    expect(loader).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})

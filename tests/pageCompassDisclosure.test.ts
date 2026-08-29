import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePageCompassDisclosure } from '../src/composables/usePageCompassDisclosure'

function pointer(pointerType: string) {
  return { pointerType } as PointerEvent
}

describe('page compass disclosure state', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens a closed compass after the hover intent delay', () => {
    vi.useFakeTimers()
    const disclosure = usePageCompassDisclosure()

    disclosure.handlePointerEnter(pointer('mouse'))
    expect(disclosure.mode.value).toBe('closed')

    vi.advanceTimersByTime(disclosure.openIntentMs - 1)
    expect(disclosure.mode.value).toBe('closed')

    vi.advanceTimersByTime(1)
    expect(disclosure.mode.value).toBe('transient')
  })

  it('cancels an intent open when the pointer leaves early', () => {
    vi.useFakeTimers()
    const disclosure = usePageCompassDisclosure()

    disclosure.handlePointerEnter(pointer('mouse'))
    disclosure.handlePointerLeave()
    vi.advanceTimersByTime(disclosure.openIntentMs)

    expect(disclosure.mode.value).toBe('closed')
  })

  it('closes a transient compass after the pointer grace period', () => {
    vi.useFakeTimers()
    const disclosure = usePageCompassDisclosure()

    disclosure.handlePointerEnter(pointer('mouse'))
    vi.advanceTimersByTime(disclosure.openIntentMs)
    disclosure.handlePointerLeave()

    vi.advanceTimersByTime(disclosure.closeGraceMs - 1)
    expect(disclosure.mode.value).toBe('transient')

    vi.advanceTimersByTime(1)
    expect(disclosure.mode.value).toBe('closed')
  })

  it('cancels a grace close when the pointer returns', () => {
    vi.useFakeTimers()
    const disclosure = usePageCompassDisclosure()

    disclosure.handlePointerEnter(pointer('mouse'))
    vi.advanceTimersByTime(disclosure.openIntentMs)
    disclosure.handlePointerLeave()
    vi.advanceTimersByTime(disclosure.closeGraceMs - 1)
    disclosure.handlePointerEnter(pointer('mouse'))
    vi.advanceTimersByTime(disclosure.closeGraceMs + disclosure.openIntentMs)

    expect(disclosure.mode.value).toBe('transient')
  })

  it('opens immediately for focus and keeps click pinning immediate', () => {
    vi.useFakeTimers()
    const disclosure = usePageCompassDisclosure()

    disclosure.handleFocusIn()
    expect(disclosure.mode.value).toBe('transient')

    disclosure.handleTriggerClick()
    expect(disclosure.mode.value).toBe('pinned')
    disclosure.handlePointerLeave()
    vi.advanceTimersByTime(disclosure.closeGraceMs)
    expect(disclosure.mode.value).toBe('pinned')

    disclosure.handleTriggerClick()
    expect(disclosure.mode.value).toBe('closed')
  })

  it('does not expand during pointer activation before the click can pin it', () => {
    vi.useFakeTimers()
    const disclosure = usePageCompassDisclosure()

    disclosure.handlePointerEnter(pointer('mouse'))
    disclosure.handleTriggerPointerDown()
    disclosure.handleFocusIn()

    expect(disclosure.mode.value).toBe('closed')

    disclosure.handleTriggerClick()
    expect(disclosure.mode.value).toBe('pinned')
  })

  it('does not create a hover disclosure for touch pointers', () => {
    vi.useFakeTimers()
    const disclosure = usePageCompassDisclosure()

    disclosure.handlePointerEnter(pointer('touch'))
    vi.advanceTimersByTime(disclosure.openIntentMs + disclosure.closeGraceMs)

    expect(disclosure.mode.value).toBe('closed')
  })

  it('keeps suppressed mode closed to pointer and focus re-entry', () => {
    vi.useFakeTimers()
    const disclosure = usePageCompassDisclosure()

    disclosure.suppressCompass()
    disclosure.handlePointerEnter(pointer('mouse'))
    disclosure.handleFocusIn()
    vi.advanceTimersByTime(disclosure.openIntentMs + disclosure.closeGraceMs)

    expect(disclosure.mode.value).toBe('suppressed')

    disclosure.handleFocusOut(false, true)
    expect(disclosure.mode.value).toBe('closed')
  })

  it('clears pending timers when disposed', () => {
    vi.useFakeTimers()
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const disclosure = usePageCompassDisclosure()

    disclosure.handlePointerEnter(pointer('mouse'))
    disclosure.dispose()
    vi.advanceTimersByTime(disclosure.openIntentMs + disclosure.closeGraceMs)

    expect(clearTimeoutSpy).toHaveBeenCalled()
    expect(disclosure.mode.value).toBe('closed')
    clearTimeoutSpy.mockRestore()
  })
})

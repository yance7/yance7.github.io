import { nextTick, onMounted, onUnmounted, unref, watch, type MaybeRef } from 'vue'
import { useBodyScrollLock } from './useBodyScrollLock'

export function useModalDialog(
  open: MaybeRef<boolean>,
  options: {
    dialogRef: { value: HTMLElement | null }
    initialFocus?: { value: HTMLElement | null }
    inertSelectors?: readonly string[]
    deferInert?: boolean
    onClose: () => void
  }
) {
  let lastFocus: HTMLElement | null = null
  let inertTimer: ReturnType<typeof setTimeout> | undefined
  const { dialogRef, initialFocus, inertSelectors = [], onClose } = options
  const deferInert = options.deferInert ?? false

  useBodyScrollLock(open)

  function getFocusable() {
    return [...dialogRef.value?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? []]
  }

  function onKeydown(event: KeyboardEvent) {
    if (!unref(open)) return
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = getFocusable()
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement)
    if (currentIndex >= 0) {
      event.preventDefault()
      const nextIndex = (currentIndex + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length
      focusable[nextIndex]?.focus()
    } else if (event.shiftKey) {
      event.preventDefault()
      last.focus()
    } else {
      event.preventDefault()
      first.focus()
    }
  }

  function setInert(value: boolean) {
    inertSelectors.forEach((selector) => document.querySelector(selector)?.toggleAttribute('inert', value))
  }

  function scheduleInert(value: boolean) {
    if (inertTimer !== undefined) clearTimeout(inertTimer)
    inertTimer = undefined
    if (!value || !deferInert) {
      setInert(value)
      return
    }
    inertTimer = setTimeout(() => {
      inertTimer = undefined
      if (unref(open)) setInert(true)
    }, 0)
  }

  watch(() => unref(open), async (value) => {
    scheduleInert(value)
    if (!value) {
      lastFocus?.focus()
      lastFocus = null
      return
    }
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    initialFocus?.value?.focus()
  }, { immediate: true })

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })

  onUnmounted(() => {
    if (inertTimer !== undefined) clearTimeout(inertTimer)
    window.removeEventListener('keydown', onKeydown)
    setInert(false)
    lastFocus?.focus()
    lastFocus = null
  })
}

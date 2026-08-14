import { nextTick, onMounted, onUnmounted, unref, watch, type MaybeRef } from 'vue'
import { useBodyScrollLock } from './useBodyScrollLock'

export function useModalDialog(
  open: MaybeRef<boolean>,
  options: {
    dialogRef: { value: HTMLElement | null }
    initialFocus?: { value: HTMLElement | null }
    inertSelectors?: readonly string[]
    onClose: () => void
  }
) {
  let lastFocus: HTMLElement | null = null
  const { dialogRef, initialFocus, inertSelectors = [], onClose } = options

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

  watch(() => unref(open), async (value) => {
    inertSelectors.forEach((selector) => document.querySelector(selector)?.toggleAttribute('inert', value))
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
    window.removeEventListener('keydown', onKeydown)
    inertSelectors.forEach((selector) => document.querySelector(selector)?.removeAttribute('inert'))
    lastFocus?.focus()
    lastFocus = null
  })
}

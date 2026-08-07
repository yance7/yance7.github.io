import { onUnmounted, unref, watch } from 'vue'

let lockCount = 0
let previousOverflow = ''

function setLocked(locked) {
  if (typeof document === 'undefined') return

  if (locked) {
    if (lockCount === 0) previousOverflow = document.body.style.overflow
    lockCount += 1
    document.body.style.overflow = 'hidden'
    return
  }

  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) document.body.style.overflow = previousOverflow
}

export function useBodyScrollLock(active) {
  let locked = false

  watch(() => unref(active), (value) => {
    if (value === locked) return
    locked = value
    setLocked(locked)
  }, { immediate: true })

  onUnmounted(() => {
    if (locked) setLocked(false)
  })
}

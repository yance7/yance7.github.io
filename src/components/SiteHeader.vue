<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { navItems } from '../data'
import ThemeOrbit from './ThemeOrbit.vue'
import { useBodyScrollLock } from '../composables/useBodyScrollLock'

defineProps<{ page?: string }>()
const menuOpen = ref(false)
const menuTrigger = ref<HTMLButtonElement | null>(null)
const menuClose = ref<HTMLButtonElement | null>(null)
const menuOverlay = ref<HTMLElement | null>(null)

function closeMenu(restoreFocus = false) {
  menuOpen.value = false
  if (restoreFocus) requestAnimationFrame(() => menuTrigger.value?.focus())
}

function getMenuFocusable(): HTMLElement[] {
  if (!menuOverlay.value) return []
  return [...menuOverlay.value.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')]
}

function onKeydown(event: KeyboardEvent) {
  if (!menuOpen.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu(true)
    return
  }
  if (event.key !== 'Tab') return

  const focusable = getMenuFocusable()
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const currentIndex = focusable.indexOf(document.activeElement as HTMLElement)
  if (currentIndex >= 0) {
    event.preventDefault()
    const nextIndex = (currentIndex + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length
    focusable[nextIndex].focus()
  } else if (event.shiftKey) {
    event.preventDefault()
    last.focus()
  } else {
    event.preventDefault()
    first.focus()
  }
}

useBodyScrollLock(menuOpen)

watch(menuOpen, async (open) => {
  document.querySelector('#main')?.toggleAttribute('inert', open)
  document.querySelector('.site-footer')?.toggleAttribute('inert', open)
  if (open) {
    await nextTick()
    menuClose.value?.focus()
  }
})

onUnmounted(() => {
  document.querySelector('#main')?.removeAttribute('inert')
  document.querySelector('.site-footer')?.removeAttribute('inert')
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header class="site-nav" :class="{ 'menu-open': menuOpen }">
    <a class="wordmark" href="index.html">Yance<span>.</span></a>

    <button
      ref="menuTrigger"
      class="menu-trigger"
      type="button"
      :aria-expanded="menuOpen"
      aria-controls="mobile-navigation"
      :aria-label="menuOpen ? '关闭导航' : '打开导航'"
      @click="menuOpen = !menuOpen"
    >
      <i></i><i></i><i></i>
    </button>

    <nav class="nav-rail" :class="{ open: menuOpen }" aria-label="主导航">
      <a
        v-for="(item, i) in navItems"
        :key="item.key"
        :href="item.href"
        :class="{ active: page === item.key }"
        :aria-current="page === item.key ? 'page' : undefined"
        :style="{ '--di': i }"
        @click="closeMenu()"
      >
        <small class="nav-num">0{{ i + 1 }}</small>
        <span class="nav-text">
          <span class="nav-label">{{ item.label }}</span>
          <small class="nav-en">{{ item.en }}</small>
        </span>
        <small class="nav-desc">{{ item.desc }}</small>
      </a>
    </nav>

    <ThemeOrbit />

    <div class="nav-status"><b></b><span>ONLINE / 2026</span></div>
  </header>

  <Teleport to="body">
    <div ref="menuOverlay" v-if="menuOpen" class="mobile-menu-overlay" role="dialog" aria-modal="true" aria-label="移动端导航" @click.self="closeMenu(true)">
      <button ref="menuClose" class="mobile-menu-close" type="button" aria-label="关闭导航" @click="closeMenu(true)">×</button>
      <nav id="mobile-navigation" class="mobile-menu" aria-label="移动端导航">
        <a
          v-for="(item, i) in navItems"
          :key="item.key"
          :href="item.href"
          :class="{ active: page === item.key }"
          :aria-current="page === item.key ? 'page' : undefined"
          :style="{ '--di': i }"
          @click="closeMenu(true)"
        >
          <small class="mm-num">0{{ i + 1 }}</small>
          <span class="mm-label">{{ item.label }}</span>
          <small class="mm-en">{{ item.en }}</small>
          <span class="mm-desc">{{ item.desc }}</span>
        </a>
      </nav>
    </div>
  </Teleport>
</template>

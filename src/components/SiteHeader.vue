<script setup lang="ts">
import { computed, ref } from 'vue'
import { getLocalizedNavItems } from '../data/locales'
import { buildLocalizedPageHref, useLocale } from '../i18n'
import ThemeOrbit from './ThemeOrbit.vue'
import LocaleSwitcher from './LocaleSwitcher.vue'
import BrandMark from './BrandMark.vue'
import { useModalDialog } from '../composables/useModalDialog'
import { useAdaptiveHeader } from '../composables/useAdaptiveHeader'

defineProps<{ page?: string }>()
const { locale, messages } = useLocale()
const navItems = computed(() => getLocalizedNavItems(locale.value))
const menuVisible = ref(false)
const menuActive = ref(false)
const menuTrigger = ref<HTMLButtonElement | null>(null)
const menuClose = ref<HTMLButtonElement | null>(null)
const menuOverlay = ref<HTMLElement | null>(null)
const { headerState, sentinelRef } = useAdaptiveHeader()

function closeMenu() {
  menuVisible.value = false
}

function toggleMenu() {
  if (menuVisible.value) {
    closeMenu()
    return
  }
  menuTrigger.value?.focus({ preventScroll: true })
  menuActive.value = true
  menuVisible.value = true
}

function finishMenuLeave() {
  menuActive.value = false
}

useModalDialog(menuActive, {
  dialogRef: menuOverlay,
  initialFocus: menuClose,
  inertSelectors: ['.site-shell'],
  onClose: closeMenu,
})
</script>

<template>
  <div ref="sentinelRef" class="site-nav-sentinel" aria-hidden="true"></div>

  <header class="site-nav" :class="{ 'menu-open': menuVisible }" :data-header-state="headerState">
    <div class="site-nav-surface">
      <div class="site-nav-brand">
        <a class="wordmark brand-link" :href="buildLocalizedPageHref('home', locale)" :aria-label="`${messages.accessibility.home}: Yance.`">
          <BrandMark variant="header" />
        </a>
      </div>

      <nav class="nav-rail" :class="{ open: menuVisible }" :aria-label="messages.navigation.main">
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
          <span class="nav-text"><span class="nav-label">{{ item.label }}</span></span>
          <small class="nav-desc">{{ item.desc }}</small>
        </a>
      </nav>

      <div class="site-nav-controls">
        <LocaleSwitcher />
        <ThemeOrbit />

        <button
          ref="menuTrigger"
          class="menu-trigger"
          type="button"
          :aria-expanded="menuVisible"
          aria-controls="mobile-navigation"
          :aria-label="menuVisible ? messages.navigation.closeMenu : messages.navigation.openMenu"
          @click="toggleMenu"
        >
          <i></i><i></i><i></i>
        </button>
      </div>
    </div>
  </header>

  <Teleport to="body">
    <Transition name="mobile-menu" @after-leave="finishMenuLeave">
      <div ref="menuOverlay" v-if="menuVisible" class="mobile-menu-overlay" role="dialog" aria-modal="true" :aria-label="messages.navigation.mobile" @click.self="closeMenu">
        <button ref="menuClose" class="mobile-menu-close" type="button" :aria-label="messages.navigation.closeMenu" @click="closeMenu">×</button>
        <nav id="mobile-navigation" class="mobile-menu" :aria-label="messages.navigation.mobile">
          <a
            v-for="(item, i) in navItems"
            :key="item.key"
            :href="item.href"
            :class="{ active: page === item.key }"
            :aria-current="page === item.key ? 'page' : undefined"
            :style="{ '--di': i }"
            @click="closeMenu"
          >
            <small class="mm-num">0{{ i + 1 }}</small>
            <span class="mm-label">{{ item.label }}</span>
            <span class="mm-desc">{{ item.desc }}</span>
          </a>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>

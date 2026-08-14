<script setup lang="ts">
import { ref } from 'vue'
import { navItems } from '../data'
import ThemeOrbit from './ThemeOrbit.vue'
import { useModalDialog } from '../composables/useModalDialog'

defineProps<{ page?: string }>()
const menuVisible = ref(false)
const menuActive = ref(false)
const menuClose = ref<HTMLButtonElement | null>(null)
const menuOverlay = ref<HTMLElement | null>(null)

function closeMenu() {
  menuVisible.value = false
}

function toggleMenu() {
  if (menuVisible.value) {
    closeMenu()
    return
  }
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
  <header class="site-nav" :class="{ 'menu-open': menuVisible }">
    <a class="wordmark" href="index.html" aria-label="返回首页">Yance<span>.</span></a>

    <button
      class="menu-trigger"
      type="button"
      :aria-expanded="menuVisible"
      aria-controls="mobile-navigation"
      :aria-label="menuVisible ? '关闭导航' : '打开导航'"
      @click="toggleMenu"
    >
      <i></i><i></i><i></i>
    </button>

    <nav class="nav-rail" :class="{ open: menuVisible }" aria-label="主导航">
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
    <Transition name="mobile-menu" @after-leave="finishMenuLeave">
      <div ref="menuOverlay" v-if="menuVisible" class="mobile-menu-overlay" role="dialog" aria-modal="true" aria-label="移动端导航" @click.self="closeMenu">
        <button ref="menuClose" class="mobile-menu-close" type="button" aria-label="关闭导航" @click="closeMenu">×</button>
        <nav id="mobile-navigation" class="mobile-menu" aria-label="移动端导航">
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
            <small class="mm-en">{{ item.en }}</small>
            <span class="mm-desc">{{ item.desc }}</span>
          </a>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { navItems } from '../data/content'
import ThemeOrbit from './ThemeOrbit.vue'

const props = defineProps({ page: String })
const menuOpen = ref(false)

watch(menuOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <header class="site-nav" :class="{ 'menu-open': menuOpen }">
    <a class="wordmark" href="index.html">Yance<span>.</span></a>

    <button
      class="menu-trigger"
      type="button"
      :aria-expanded="menuOpen"
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
        @click="menuOpen = false"
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

  <!-- 移动端全屏菜单遮罩 -->
  <Teleport to="body">
    <div v-if="menuOpen" class="mobile-menu-overlay" @click.self="menuOpen = false">
      <nav class="mobile-menu" aria-label="移动端导航">
        <a
          v-for="(item, i) in navItems"
          :key="item.key"
          :href="item.href"
          :class="{ active: page === item.key }"
          :style="{ '--di': i }"
          @click="menuOpen = false"
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

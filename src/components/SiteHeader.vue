<script setup>
import { ref } from 'vue'
import { navItems } from '../data/content'
import ThemeOrbit from './ThemeOrbit.vue'

defineProps({ page: String })

const menuOpen = ref(false)
</script>

<template>
  <header class="site-nav">
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
        @click="menuOpen = false"
      >
        <small class="nav-num">0{{ i + 1 }}</small>
        <span>{{ item.label }}</span>
        <small class="nav-en">{{ item.en }}</small>
      </a>
    </nav>

    <ThemeOrbit />

    <div class="nav-status"><b></b><span>ONLINE / 2026</span></div>
  </header>
</template>

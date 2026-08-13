<script setup lang="ts">
const geo = 'BEIJING / CN'

const props = defineProps<{
  kicker: string
  copy: string
}>()

</script>

<template>
  <section class="home-hero">
    <div class="home-hero-grid" aria-hidden="true"></div>

    <div class="home-stage">
      <div class="home-stage-meta" v-reveal>
        <div class="home-stage-kicker">
          <span class="home-stage-mark">01 / 06</span>
          <span>{{ props.kicker }}</span>
        </div>
        <span class="home-stage-identity">RESEARCHER / BUILDER / MUSIC LISTENER</span>
      </div>

      <div class="home-stage-body">
        <div class="home-stage-main">
          <div class="home-stage-heading" v-reveal="{ delay: 100 }">
            <span class="home-stage-heading-line"></span>
            <span>PERSONAL ARCHIVE / {{ geo }}</span>
          </div>

          <h1 class="home-stage-title" v-reveal="{ delay: 140 }">
            研究、构建，<br><em>与现场相遇</em>
          </h1>

          <div class="home-stage-copy-block" v-reveal="{ delay: 180 }">
            <p class="home-stage-copy">{{ props.copy }}</p>
            <div class="home-stage-actions">
              <a class="hero-action primary" href="#selected-work">
                <span>查看精选作品</span>
                <span aria-hidden="true">↗</span>
              </a>
              <a class="hero-action secondary" href="#home-worlds">
                <span>浏览五个小世界</span>
                <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <a class="home-stage-scroll" href="#home-worlds" v-reveal="{ delay: 420 }">
        <span class="home-stage-scroll-line" aria-hidden="true"></span>
        <span>SCROLL TO EXPLORE</span>
        <span class="home-stage-scroll-arrow" aria-hidden="true">↓</span>
      </a>
    </div>
  </section>
</template>

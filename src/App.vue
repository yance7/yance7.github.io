<script setup>
import { computed, ref } from 'vue'
import { navItems, stats, projects, research, honors, concerts } from './data/content'

const page = document.body.dataset.page || 'home'
const menuOpen = ref(false)
const lightbox = ref(null)
const carouselIndexes = ref({})
const currentNav = computed(() => navItems.find(item => item.key === page))

const pageMeta = {
  home: ['YANCE / 个人档案', '还记得你说家是唯一的城堡', '研究、作品与被音乐点亮的夜晚，构成一个仍在生长的个人档案。'],
  academics: ['ACADEMICS / 学业', '我一路向北', '绩点、标化与 AP 成绩，是努力留下的可读痕迹。'],
  honors: ['HONORS / 荣誉', '一步一步往上爬', '奖项是坐标，不是终点；真正重要的是仍然保持向上的惯性。'],
  research: ['RESEARCH / 研究', '我不完美的梦，你陪着我想', '从智慧农业到可解释 AI，把论文里的模型推向浏览器里能点开的产品。'],
  works: ['WORKS / 作品', '承认不勇敢，你能不能别离开', '两个已经上线的小世界，记录想法如何离开纸面，开始被真实使用。'],
  concerts: ['CONCERTS / 演唱会', '缘分让我们相遇乱世以外', '十四场现场，十七张海报，记录那些被灯光和合唱重新定义的夜晚。']
}

function openLightbox(images, index = 0) { lightbox.value = { images, index } }
function closeLightbox() { lightbox.value = null }
function moveLightbox(step) {
  if (!lightbox.value) return
  const total = lightbox.value.images.length
  lightbox.value.index = (lightbox.value.index + step + total) % total
}
function imagePath(name) { return `assets/concerts/${name}` }
function currentImage(item, index) { return imagePath(item.images[carouselIndexes.value[item.date] || index || 0]) }
function moveCarousel(item, step) {
  const current = carouselIndexes.value[item.date] || 0
  const next = (current + step + item.images.length) % item.images.length
  carouselIndexes.value = { ...carouselIndexes.value, [item.date]: next }
}
</script>

<template>
  <div class="site-shell" @keydown.esc="closeLightbox">
    <div class="ambient ambient-one"></div><div class="ambient ambient-two"></div><div class="grain"></div>
    <header class="site-nav">
      <a class="wordmark" href="index.html">Yance<span>.</span></a>
      <button class="menu-trigger" type="button" aria-label="打开导航" @click="menuOpen = !menuOpen"><i></i><i></i></button>
      <nav class="nav-rail" :class="{ open: menuOpen }">
        <a v-for="item in navItems" :key="item.key" :href="item.href" :class="{ active: page === item.key }" @click="menuOpen = false">
          <span>{{ item.label }}</span><small>{{ item.en }}</small>
        </a>
      </nav>
      <div class="nav-status"><b></b> ONLINE / 2026</div>
    </header>

    <main>
      <section class="page-hero" :class="{ 'home-hero': page === 'home' }">
        <div class="hero-index">00{{ currentNav ? navItems.indexOf(currentNav) + 1 : 1 }} <span>/ 06</span></div>
        <p class="kicker">{{ pageMeta[page]?.[0] || '404 / NOT FOUND' }}</p>
        <h1 v-if="page === 'home'" class="hero-name">Yance<span>.</span></h1>
        <h1 v-else class="hero-title">{{ pageMeta[page]?.[1] || '这一页走丢了' }}</h1>
        <p class="hero-copy">{{ pageMeta[page]?.[2] || '返回首页，重新选择一个方向。' }}</p>
        <p class="lyric-note" v-if="page !== 'home'">LYRIC / PERSONAL ARCHIVE</p>
        <div class="hero-line"><span></span></div>
      </section>

      <section v-if="page === 'home'" class="content home-content">
        <div class="section-intro"><span>01 / EXPLORE</span><h2>五个<span>小世界</span></h2><p>缘分让我们相遇乱世以外。把探索、荣誉、研究、作品与音乐分别收进五间屋子。</p></div>
        <div class="portal-grid">
          <a v-for="item in navItems.slice(1)" :key="item.key" :href="item.href" class="portal" :class="`portal-${item.key}`"><span class="portal-no">0{{ navItems.indexOf(item) + 1 }}</span><strong>{{ item.label }}</strong><em>{{ item.en }}</em><i>↗</i></a>
        </div>
        <div class="stats-row"><div v-for="stat in stats" :key="stat.label" class="stat-block"><b>{{ stat.value }}</b><span>{{ stat.label }}</span><small>{{ stat.note }}</small></div></div>
      </section>

      <section v-else-if="page === 'academics'" class="content"><div class="section-intro"><span>01 / SCOREBOARD</span><h2>数字不会说谎<span>，但努力会。</span></h2></div><div class="stats-row large"><div v-for="stat in stats" :key="stat.label" class="stat-block"><b>{{ stat.value }}</b><span>{{ stat.label }}</span><small>{{ stat.note }}</small></div></div><div class="data-panel"><div class="panel-label">AP SCORE / 2024—2026</div><div v-for="(name, index) in ['微积分 BC','物理 1','计算机科学 A','生物学','化学','统计学','环境科学','心理学','宏观经济学']" :key="name" class="data-row"><span>0{{ index + 1 }}</span><strong>{{ name }}</strong><b>5</b></div></div></section>

      <section v-else-if="page === 'honors'" class="content"><div class="section-intro"><span>02 / MILESTONES</span><h2>每一枚奖章，都是<span>向上的证据。</span></h2></div><div class="honor-stack"><article v-for="tier in honors" :key="tier.level" class="honor-tier" :class="tier.color"><div class="tier-symbol">{{ tier.level }}</div><div><span class="eyebrow">{{ tier.en }}</span><h3>{{ tier.title }}</h3></div><div class="tier-items"><p v-for="item in tier.items" :key="item">{{ item }} <i>↗</i></p></div></article></div></section>

      <section v-else-if="page === 'research'" class="content"><div class="section-intro"><span>03 / LAB NOTES</span><h2>把论文<span>写成产品。</span></h2></div><div class="research-list"><article v-for="(item, index) in research" :key="item.title" class="research-row"><span class="row-no">0{{ index + 1 }}</span><div><small>{{ item.date }} · {{ item.tag }}</small><h3>{{ item.title }}</h3><p>{{ item.text }}</p><a v-if="item.link" :href="item.link" target="_blank" rel="noopener">OPEN PROJECT ↗</a></div><span class="row-arrow">↗</span></article></div></section>

      <section v-else-if="page === 'works'" class="content"><div class="section-intro"><span>04 / RELEASED WORLDS</span><h2>让想法<span>可以被打开。</span></h2></div><div class="project-grid"><a v-for="project in projects" :key="project.title" :href="project.href" target="_blank" rel="noopener" class="project-card" :class="project.tone"><div class="project-orbit">{{ project.icon === 'eye' ? '◉' : '♫' }}</div><span>{{ project.domain }}</span><h3>{{ project.title }} <small>{{ project.en }}</small></h3><p>{{ project.description }}</p><b>ENTER PROJECT ↗</b></a></div></section>

      <section v-else-if="page === 'concerts'" class="content concerts-content"><div class="section-intro"><span>05 / LIVE ARCHIVE</span><h2>现场是<span>另一种记忆。</span></h2><p>点击海报进入全屏档案。每张图都保留原始比例，轮播记录同一场演出的不同视觉。</p></div><div class="concert-list"><article v-for="item in concerts" :key="item.date" class="concert-row"><div class="concert-date">{{ item.date }}<span></span></div><div class="concert-poster" :class="{ land: item.land }"><img :src="currentImage(item, 0)" :alt="`${item.artist} ${item.tour} 海报`" loading="lazy" decoding="async" @click="openLightbox(item.images.map(imagePath), carouselIndexes[item.date] || 0)"><div v-if="item.images.length > 1" class="carousel-controls"><button type="button" aria-label="上一张" @click.stop="moveCarousel(item, -1)">←</button><span>{{ (carouselIndexes[item.date] || 0) + 1 }} / {{ item.images.length }}</span><button type="button" aria-label="下一张" @click.stop="moveCarousel(item, 1)">→</button></div></div><div class="concert-info"><span>{{ item.venue }}</span><h3>{{ item.artist }}</h3><p>{{ item.tour }}</p></div></article></div></section>
    </main>

    <footer class="site-footer"><span>© 2026 YANCE.</span><span>RESEARCHER / BUILDER / MUSIC LISTENER</span><a href="mailto:yance777@outlook.com">CONTACT ↗</a></footer>
    <div v-if="lightbox" class="lightbox" @click.self="closeLightbox"><button type="button" aria-label="关闭灯箱" @click="closeLightbox">×</button><button v-if="lightbox.images.length > 1" type="button" aria-label="上一张" @click="moveLightbox(-1)">←</button><img :src="lightbox.images[lightbox.index]" alt="演唱会海报大图"><button v-if="lightbox.images.length > 1" type="button" aria-label="下一张" @click="moveLightbox(1)">→</button></div>
  </div>
</template>

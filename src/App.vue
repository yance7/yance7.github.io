<script setup>
import { computed, ref, onMounted } from 'vue'
import { navItems, stats, projects, research, honors, concerts, apScores } from './data/content'
import SiteHeader from './components/SiteHeader.vue'
import ArchiveHero from './components/ArchiveHero.vue'
import SectionHeading from './components/SectionHeading.vue'
import SiteFooter from './components/SiteFooter.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import { useTheme } from './composables/useTheme'

const page = document.body.dataset.page || 'home'
const { theme, initTheme } = useTheme()

const carouselIndexes = ref({})
const lightbox = ref(null)

onMounted(initTheme)

const currentNav = computed(() => navItems.find((item) => item.key === page))
const pageNo = computed(() => (currentNav.value ? navItems.indexOf(currentNav.value) + 1 : 0))
const archiveNo = computed(() => String(pageNo.value).padStart(2, '0'))
const isHome = page === 'home'
const isError = !currentNav.value

const pageMeta = {
  home: ['PERSONAL ARCHIVE / 2026', '还记得你说家是唯一的城堡', '研究、作品与被音乐点亮的夜晚，构成一个仍在生长的个人档案。'],
  academics: ['ACADEMICS / 学业', '我一路向北', '绩点、标化与 AP 成绩，是努力留下的可读痕迹。'],
  honors: ['HONORS / 荣誉', '一步一步往上爬', '奖项是坐标，不是终点；真正重要的是仍然保持向上的惯性。'],
  research: ['RESEARCH / 研究', '我不完美的梦，你陪着我想', '从智慧农业到可解释 AI，把论文里的模型推向浏览器里能点开的产品。'],
  works: ['WORKS / 作品', '承认不勇敢，你能不能别离开', '两个已经上线的小世界，记录想法如何离开纸面，开始被真实使用。'],
  concerts: ['CONCERTS / 演唱会', '缘分让我们相遇乱世以外', '十四场现场，十七张海报，记录那些被灯光和合唱重新定义的夜晚。']
}

const kicker = computed(() => (isError ? '404 / NOT FOUND' : pageMeta[page][0]))
const heroTitle = computed(() => (isError ? '这一页走丢了' : pageMeta[page][1]))
const heroCopy = computed(() => (isError ? '返回首页，重新选择一个方向。' : pageMeta[page][2]))

const currentResearch = research[0]

function tagClass(tag) {
  if (tag.includes('WEB TOOL')) return 'aqua'
  if (tag.includes('PUBLISHED')) return 'gold'
  if (tag.includes('DEEP')) return 'violet'
  return 'dim'
}

function portalIcon(key) {
  return { academics: '✦', honors: '❖', research: '◉', works: '♬', concerts: '♪' }[key] || '↗'
}

function imagePath(name) { return `assets/concerts/${name}` }
function currentImage(item, index) {
  return imagePath(item.images[carouselIndexes.value[item.date] || index || 0])
}
function moveCarousel(item, step) {
  const current = carouselIndexes.value[item.date] || 0
  const next = (current + step + item.images.length) % item.images.length
  carouselIndexes.value = { ...carouselIndexes.value, [item.date]: next }
}
function openLightbox(item, index = 0) {
  lightbox.value = {
    images: item.images.map(imagePath),
    index,
    meta: { artist: item.artist, tour: item.tour }
  }
}
function closeLightbox() { lightbox.value = null }
function moveLightbox(step) {
  if (!lightbox.value) return
  const total = lightbox.value.images.length
  lightbox.value.index = (lightbox.value.index + step + total) % total
}
</script>

<template>
  <div class="site-shell" :class="`theme-${theme}`">
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>
    <div class="grain"></div>

    <SiteHeader :page="page" />

    <main>
      <ArchiveHero
        :page="page"
        :no="archiveNo"
        :total="6"
        :error="isError"
        :is-home="isHome"
        :kicker="kicker"
        :title="heroTitle"
        :copy="heroCopy"
      />

      <!-- 首页 -->
      <section v-if="isHome" class="content home-content">
        <SectionHeading
          no="01"
          label="EXPLORE"
          title="五个"
          accent="小世界"
          copy="缘分让我们相遇乱世以外。把探索、荣誉、研究、作品与音乐分别收进五间屋子。"
        />

        <a
          v-if="currentResearch"
          class="current-research"
          :href="currentResearch.link || '#'"
          :target="currentResearch.link ? '_blank' : undefined"
          :rel="currentResearch.link ? 'noopener' : undefined"
          v-reveal
        >
          <span class="cr-label">CURRENT<br>RESEARCH</span>
          <span class="cr-body">
            <strong>{{ currentResearch.title }}</strong>
            <small>{{ currentResearch.date }} · {{ currentResearch.tag }}</small>
          </span>
          <span class="cr-tag">{{ currentResearch.tag }}</span>
          <span class="cr-arrow" aria-hidden="true">↗</span>
        </a>

        <div class="portal-grid">
          <a
            v-for="item in navItems.slice(1)"
            :key="item.key"
            class="portal"
            :class="`portal-${item.key}`"
            :href="item.href"
            v-reveal
          >
            <span class="portal-no">0{{ navItems.indexOf(item) + 1 }}</span>
            <span class="portal-icon" aria-hidden="true">{{ portalIcon(item.key) }}</span>
            <strong>{{ item.label }}</strong>
            <em>{{ item.en }}</em>
            <span class="portal-arrow" aria-hidden="true">↗</span>
          </a>
        </div>

        <div class="stat-strip">
          <div v-for="stat in stats" :key="stat.label" class="stat-cell" v-reveal>
            <b>{{ stat.value }}</b>
            <span>{{ stat.label }}</span>
            <small>{{ stat.note }}</small>
          </div>
        </div>
      </section>

      <!-- 学业 -->
      <section v-else-if="page === 'academics'" class="content">
        <SectionHeading no="01" label="SCOREBOARD" title="数字不会说谎，" accent="但努力会。" />

        <div class="stat-strip large">
          <div v-for="stat in stats" :key="stat.label" class="stat-cell" v-reveal>
            <b>{{ stat.value }}</b>
            <span>{{ stat.label }}</span>
            <small>{{ stat.note }}</small>
          </div>
        </div>

        <div class="ap-panel" v-reveal>
          <div class="panel-label">AP SCORE / 2024—2026 · 9 门全部 5 分</div>
          <div v-for="(row, i) in apScores" :key="row.name" class="ap-row" v-reveal>
            <span class="ap-no">0{{ i + 1 }}</span>
            <div class="ap-main">
              <strong>{{ row.name }}</strong>
              <small>{{ row.en }} · {{ row.year }}</small>
            </div>
            <span class="ap-badge">5</span>
          </div>
        </div>
      </section>

      <!-- 荣誉 -->
      <section v-else-if="page === 'honors'" class="content">
        <SectionHeading no="02" label="MILESTONES" title="每一枚奖章，都是" accent="向上的证据。" />

        <div class="honor-ledger">
          <article v-for="tier in honors" :key="tier.level" class="honor-tier" :class="tier.color" v-reveal>
            <div class="tier-rail" aria-hidden="true"></div>
            <div class="tier-head">
              <span class="tier-numeral">{{ tier.level }}</span>
              <div class="tier-id">
                <span class="eyebrow">{{ tier.en }}</span>
                <h3>{{ tier.title }}</h3>
              </div>
            </div>
            <ul class="tier-list">
              <li v-for="item in tier.items" :key="item">
                <span>{{ item }}</span><i aria-hidden="true">↗</i>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <!-- 研究 -->
      <section v-else-if="page === 'research'" class="content">
        <SectionHeading no="03" label="LAB NOTES" title="把论文" accent="写成产品。" />

        <div class="research-timeline">
          <article v-for="item in research" :key="item.title" class="tl-item" v-reveal>
            <div class="tl-side">
              <span class="tl-date">{{ item.date }}</span>
              <span class="tl-node" aria-hidden="true"><i></i></span>
            </div>
            <div class="tl-body">
              <span class="tl-tag" :class="tagClass(item.tag)">{{ item.tag }}</span>
              <h3>{{ item.title }}</h3>
              <p>{{ item.text }}</p>
              <div class="tl-foot">
                <span class="tl-org">{{ item.org }}</span>
                <a v-if="item.link" :href="item.link" target="_blank" rel="noopener">OPEN PROJECT ↗</a>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- 作品 -->
      <section v-else-if="page === 'works'" class="content">
        <SectionHeading no="04" label="RELEASED WORLDS" title="让想法" accent="可以被打开。" />

        <div class="showcase-grid">
          <a
            v-for="(project, i) in projects"
            :key="project.title"
            class="showcase"
            :class="project.tone"
            :href="project.href"
            target="_blank"
            rel="noopener"
            v-reveal
          >
            <span class="sc-icon" aria-hidden="true">{{ project.icon === 'eye' ? '◉' : '♫' }}</span>
            <div class="sc-top">
              <span class="sc-domain">{{ project.domain }}</span>
              <span class="sc-arrow" aria-hidden="true">↗</span>
            </div>
            <div class="sc-bottom">
              <span class="sc-overline">PROJECT 0{{ i + 1 }}</span>
              <h3>{{ project.title }} <small>{{ project.en }}</small></h3>
              <p>{{ project.description }}</p>
              <span class="sc-cta">ENTER PROJECT ↗</span>
            </div>
          </a>
        </div>
      </section>

      <!-- 演唱会 -->
      <section v-else-if="page === 'concerts'" class="content concerts-content">
        <SectionHeading
          no="05"
          label="LIVE ARCHIVE"
          title="现场是"
          accent="另一种记忆。"
          copy="点击海报进入全屏档案。每张图都保留原始比例，轮播记录同一场演出的不同视觉。"
        />

        <div class="concert-list">
          <article v-for="item in concerts" :key="item.date" class="concert-row" v-reveal>
            <div class="concert-date">{{ item.date }}<span></span></div>
            <div class="concert-poster" :class="{ land: item.land }">
              <img
                :src="currentImage(item, 0)"
                :alt="`${item.artist} ${item.tour} 海报`"
                loading="lazy"
                decoding="async"
                @click="openLightbox(item, carouselIndexes[item.date] || 0)"
              >
              <div v-if="item.images.length > 1" class="carousel-controls">
                <button type="button" aria-label="上一张" @click.stop="moveCarousel(item, -1)">←</button>
                <span>{{ (carouselIndexes[item.date] || 0) + 1 }} / {{ item.images.length }}</span>
                <button type="button" aria-label="下一张" @click.stop="moveCarousel(item, 1)">→</button>
              </div>
            </div>
            <div class="concert-info">
              <span>{{ item.venue }}</span>
              <h3>{{ item.artist }}</h3>
              <p>{{ item.tour }}</p>
            </div>
          </article>
        </div>
      </section>

      <!-- 404 -->
      <section v-else class="content error-content">
        <SectionHeading no="!" label="SIGNAL LOST" title="这一页，" accent="走丢了。" copy="你访问的页面不存在，或者已经被移走。回到主页，重新选一间屋子走进去。" />
        <div class="error-actions">
          <a class="btn-primary" href="index.html">回到首页 <span aria-hidden="true">→</span></a>
          <a class="btn-ghost" href="research.html">去看看研究 <span aria-hidden="true">→</span></a>
        </div>
      </section>
    </main>

    <SiteFooter />

    <ImageLightbox
      v-if="lightbox"
      :images="lightbox.images"
      :index="lightbox.index"
      :meta="lightbox.meta"
      @close="closeLightbox"
      @prev="moveLightbox(-1)"
      @next="moveLightbox(1)"
    />
  </div>
</template>

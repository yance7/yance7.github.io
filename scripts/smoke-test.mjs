import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dist = join(root, 'dist')
const pages = ['index', 'academics', 'honors', 'research', 'works', 'concerts', '404']
const { concerts, concertGroups, getConcertState } = await import(new URL('../src/data/index.ts', import.meta.url))

function read(path) {
  return readFileSync(join(dist, path), 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(existsSync(dist), 'dist/ 不存在，请先运行 npm run build')
for (const page of pages) {
  const html = read(`${page}.html`)
  assert(html.includes('<div id="app"></div>'), `${page}.html 缺少 Vue 挂载点`)
  assert(/assets\/vue\/main-[^"']+\.js/.test(html), `${page}.html 缺少 hash 入口资源`)
  assert(!html.includes('../src/main.js'), `${page}.html 仍引用源码入口`)
}

for (const asset of [
  'assets/og-card.png',
  'assets/og-home.png',
  'assets/og-academics.png',
  'assets/og-honors.png',
  'assets/og-research.png',
  'assets/og-works.png',
  'assets/og-concerts.png',
  'assets/favicon.svg',
  'assets/site.webmanifest',
  'assets/case/fresheye-og-cover.png',
  'CNAME',
  'robots.txt',
  'sitemap.xml'
]) {
  assert(existsSync(join(dist, asset)), `缺少静态资源：${asset}`)
}

const index = read('index.html')
assert(index.includes('assets/og-home.png'), '首页未使用专属 OG image')
assert(!index.includes('og-card.svg'), 'OG image 仍引用 SVG')
for (const [page, slug] of Object.entries({ index: 'home', academics: 'academics', honors: 'honors', research: 'research', works: 'works', concerts: 'concerts' })) {
  assert(read(`${page}.html`).includes(`assets/og-${slug}.png`), `${page}.html 未使用专属 OG image`)
}

for (const asset of [
  'assets/case/fresheye-sample-fresh.webp',
  'assets/case/fresheye-sample-highly-fresh.webp',
  'assets/case/fresheye-sample-not-fresh.webp'
]) {
  assert(existsSync(join(dist, asset)), `FreshEye sample missing: ${asset}`)
}

for (const image of new Set(concerts.flatMap((concert) => concert.images))) {
  const thumbnail = image.replace(/\.[^.]+$/, '.webp')
  assert(existsSync(join(dist, 'assets/concerts/thumbs', thumbnail)), `Concert thumbnail missing: ${thumbnail}`)
}

const fixedNow = new Date('2026-08-07T12:00:00+08:00')
const state = getConcertState(fixedNow)
const upcoming = state.upcoming
assert(concerts.every((concert) => concert.id && /^\d{4}-\d{2}-\d{2}$/.test(concert.date)), 'Concert 数据未使用对象与 ISO 日期')
assert(upcoming.length === 2, `Concert upcoming 预期 2 场，实际 ${upcoming.length} 场`)
assert(concertGroups['2026']?.length === 8, 'Concert 年份分组未正确解析 ISO 日期')
assert(state.moods['2026'] === '6 场已赴约，2 场待相见。', 'Concert 2026 文案与状态统计不一致')

const showcase = readFileSync(join(root, 'src/components/ProjectShowcase.vue'), 'utf8')
const previewSource = readFileSync(join(root, 'src/components/FreshEyePreview.vue'), 'utf8')
const styles = readFileSync(join(root, 'src/styles.css'), 'utf8')
const concertsSource = readFileSync(join(root, 'src/pages/ConcertsPage.vue'), 'utf8')
const mainSource = readFileSync(join(root, 'src/main.js'), 'utf8')
assert(showcase.includes('class="sc-evidence"'), 'FreshEye evidence block missing')
assert(showcase.includes(':id="`project-${project.id}`"'), 'Project showcase anchor missing')
assert(previewSource.includes('sc-shot-tabs'), 'FreshEye product screenshot switcher missing')
assert(previewSource.includes('@keydown="onShotKeydown'), 'FreshEye tabs missing keyboard navigation')
assert(previewSource.includes(':aria-controls='), 'FreshEye tabs missing aria-controls')
assert(!showcase.includes('sc-shot-tabs'), 'FreshEye preview remains coupled to ProjectShowcase')
assert(concertsSource.includes('class="next-up"'), 'Concert NEXT UP block missing')
assert(concertsSource.includes('<picture>'), 'Concert picture source missing')
assert(!mainSource.includes('legacy-sw-cleanup'), 'Legacy Service Worker cleanup code remains')
assert(!/font-size:\s*(?:[0-9]|10)px/.test(`${styles}\n${previewSource}`), 'Tiny font token found')
assert(!styles.includes('.lyric-eq') && !styles.includes('.coords-bar'), 'Hero decoration styles remain')
assert(!showcase.includes('class="sc-frame" aria-hidden="true"'), 'Case Study 图片仍被 aria-hidden 父节点隐藏')
assert(styles.includes('z-index: 3;'), 'Concert carousel controls 缺少层级保护')
console.log(`smoke: ${pages.length} pages and static assets verified`)

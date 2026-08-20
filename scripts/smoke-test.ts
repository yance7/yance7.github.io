import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { htmlPageEntries, pageEntries } from '../src/data/pageRegistry'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dist = join(root, 'dist')
const pages = htmlPageEntries.map(({ htmlName }) => htmlName)

function read(path: string) {
  return readFileSync(join(dist, path), 'utf8')
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

assert(existsSync(dist), 'dist/ 不存在，请先运行 npm run build')
for (const page of pages) {
  const html = read(`${page}.html`)
  assert(/Content-Security-Policy/.test(html), `${page}.html 缺少 CSP`)
  assert(/script-src 'self' 'sha256-[^']+'/.test(html), `${page}.html CSP 缺少 theme bootstrap hash`)
  assert(html.includes('<div id="app"></div>'), `${page}.html 缺少 Vue 挂载点`)
  assert(/assets\/vue\/main-[^"']+\.js/.test(html), `${page}.html 缺少 hash 入口资源`)
  assert(!html.includes('../src/'), `${page}.html 仍引用源码资源`)
  assert(!html.includes('fonts.googleapis.com'), `${page}.html 仍阻塞加载 Google Fonts`)
  assert(!html.includes('fonts.gstatic.com'), `${page}.html 仍依赖 Google Fonts 字体文件`)
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
  'assets/concerts',
  'assets/concerts/thumbs',
  'CNAME',
  'robots.txt',
  'sitemap.xml'
]) {
  assert(existsSync(join(dist, asset)), `缺少静态资源：${asset}`)
}

const index = read('index.html')
assert(!index.includes('og-card.svg'), 'OG image 仍引用 SVG')
for (const { htmlName, ogImage, ogImageAlt } of pageEntries) {
  const html = read(`${htmlName}.html`)
  assert(html.includes(ogImage), `${htmlName}.html 未使用专属 OG image`)
  assert(html.includes(`og:image:alt" content="${ogImageAlt}"`), `${htmlName}.html 未使用页面专属 OG image alt`)
}

const concertOriginals = readdirSync(join(dist, 'assets/concerts')).filter((file) => /\.(?:jpe?g|png|webp)$/i.test(file))
const concertThumbs = readdirSync(join(dist, 'assets/concerts/thumbs')).filter((file) => /\.(?:webp|avif)$/i.test(file))
assert(concertOriginals.length > 0, 'Concert 原图产物为空')
assert(concertThumbs.length > 0, 'Concert 缩略图产物为空')
assert(read('CNAME').trim() === 'www.yance777.com', 'CNAME 产物不正确')
console.log(`smoke: ${pages.length} pages and static assets verified`)

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { THEME_COLORS } from './src/themeColors.ts'
import { htmlPageEntries, isPageKey, pageRegistry } from './src/data/pageRegistry.ts'

const rootDir = dirname(fileURLToPath(import.meta.url))
const htmlRoot = resolve(rootDir, 'html-src')
const pageNames = htmlPageEntries.map(({ htmlName }) => htmlName)
const THEME_BOOTSTRAP_HASH = 'sha256-y7EL9Xc/k62MXHBAGMMmFCVHtvaQtVrg2x2vQiYUZls='

const htmlInputs = Object.fromEntries(
  pageNames.map((name) => [name, resolve(rootDir, 'html-src', `${name}.html`)])
)

function themeTokenPlugin() {
  return {
    name: 'theme-token-bootstrap',
    transformIndexHtml(html: string) {
      return html
        .replaceAll('__THEME_COLOR_LIGHT__', THEME_COLORS.light)
        .replaceAll('__THEME_COLOR_DARK__', THEME_COLORS.dark)
        .replaceAll('__THEME_BOOTSTRAP_HASH__', THEME_BOOTSTRAP_HASH)
    }
  }
}

function pageMetadataPlugin() {
  return {
    name: 'page-metadata-bootstrap',
    transformIndexHtml(html: string) {
      const pageValue = html.match(/<body[^>]*data-page="([^"]+)"/)?.[1]
      if (!isPageKey(pageValue)) return html
      const metadata = pageRegistry[pageValue]
      return html
        .replaceAll('__OG_IMAGE__', `https://www.yance777.com/${metadata.ogImage}`)
        .replaceAll('__OG_IMAGE_ALT__', metadata.ogImageAlt)
    }
  }
}

export default defineConfig({
  root: htmlRoot,
  plugins: [themeTokenPlugin(), pageMetadataPlugin(), vue()],
  build: {
    outDir: resolve(rootDir, 'dist'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: htmlInputs,
      output: {
        entryFileNames: 'assets/vue/[name]-[hash].js',
        chunkFileNames: 'assets/vue/[name]-[hash].js',
        assetFileNames: 'assets/vue/[name]-[hash][extname]'
      }
    }
  },
  publicDir: resolve(rootDir, 'public'),
  server: {
    fs: { allow: [rootDir] }
  }
})

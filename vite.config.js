import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const rootDir = dirname(fileURLToPath(import.meta.url))
const htmlRoot = resolve(rootDir, 'html-src')
const pageNames = ['index', 'academics', 'honors', 'research', 'works', 'concerts', '404']

function copyStaticAssets() {
  return {
    name: 'copy-static-assets',
    closeBundle() {
      const outputDir = resolve(rootDir, 'dist')
      const outputAssets = join(outputDir, 'assets')
      mkdirSync(outputAssets, { recursive: true })

      for (const file of ['og-card.svg', 'favicon.svg', 'site.webmanifest']) {
        copyFileSync(resolve(rootDir, 'assets', file), join(outputAssets, file))
      }
      for (const directory of ['concerts', 'case']) {
        cpSync(resolve(rootDir, 'assets', directory), join(outputAssets, directory), { recursive: true })
      }
      for (const file of ['CNAME', 'robots.txt', 'sitemap.xml']) {
        if (existsSync(resolve(rootDir, file))) copyFileSync(resolve(rootDir, file), join(outputDir, file))
      }
    }
  }
}

const htmlInputs = Object.fromEntries(
  pageNames.map((name) => [name, resolve(rootDir, 'html-src', `${name}.html`)])
)

export default defineConfig({
  root: htmlRoot,
  plugins: [vue(), copyStaticAssets()],
  build: {
    outDir: resolve(rootDir, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: htmlInputs,
      output: {
        entryFileNames: 'assets/vue/[name]-[hash].js',
        chunkFileNames: 'assets/vue/[name]-[hash].js',
        assetFileNames: 'assets/vue/[name]-[hash][extname]'
      }
    }
  },
  publicDir: false,
  server: {
    fs: { allow: [rootDir] }
  }
})

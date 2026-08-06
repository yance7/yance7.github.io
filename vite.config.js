import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const rootDir = dirname(fileURLToPath(import.meta.url))

/**
 * 构建前从 html-src/ 恢复源码 HTML 入口。
 * 由于 build.outDir 为项目根目录，上一次构建会把 HTML 改写成产物引用
 * （/assets/vue/main.js），若不恢复，下一次构建会以旧产物为入口，导致更新丢失。
 */
function restoreHtmlSources() {
  return {
    name: 'restore-html-sources',
    buildStart() {
      const srcDir = resolve(rootDir, 'html-src')
      if (!existsSync(srcDir)) return
      for (const file of readdirSync(srcDir)) {
        if (file.endsWith('.html')) {
          copyFileSync(join(srcDir, file), join(rootDir, file))
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), restoreHtmlSources()],
  build: {
    outDir: '.',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        index: 'index.html',
        academics: 'academics.html',
        honors: 'honors.html',
        research: 'research.html',
        works: 'works.html',
        concerts: 'concerts.html',
        notFound: '404.html'
      },
      output: {
        entryFileNames: 'assets/vue/[name]-[hash].js',
        chunkFileNames: 'assets/vue/[name]-[hash].js',
        assetFileNames: (info) => {
          const name = info.names[0] || ''
          if (/\.(jpg|jpeg|png|svg|webmanifest)$/.test(name)) {
            return 'assets/vue/[name][extname]'
          }
          return 'assets/vue/[name]-[hash][extname]'
        }
      }
    }
  },
  publicDir: false
})

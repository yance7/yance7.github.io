import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const rootDir = dirname(fileURLToPath(import.meta.url))
const htmlRoot = resolve(rootDir, 'html-src')
const pageNames = ['index', 'academics', 'honors', 'research', 'works', 'concerts', '404']

const htmlInputs = Object.fromEntries(
  pageNames.map((name) => [name, resolve(rootDir, 'html-src', `${name}.html`)])
)

export default defineConfig({
  root: htmlRoot,
  plugins: [vue()],
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
  publicDir: resolve(rootDir, 'public'),
  server: {
    fs: { allow: [rootDir] }
  }
})

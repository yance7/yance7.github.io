import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { basename, dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, '.ssg-build')

if (dirname(outDir) !== root || basename(outDir) !== '.ssg-build' || relative(root, outDir) !== '.ssg-build') {
  throw new Error(`Refusing unexpected SSG build output directory: ${outDir}`)
}

export default defineConfig({
  root,
  plugins: [vue()],
  publicDir: resolve(root, 'public'),
  build: {
    ssr: resolve(root, 'src/entry-server.ts'),
    outDir,
    emptyOutDir: false,
    copyPublicDir: false,
    rollupOptions: {
      output: {
        format: 'es',
        entryFileNames: 'entry-server.js',
        chunkFileNames: 'chunks/[name]-[hash].js'
      }
    }
  }
})

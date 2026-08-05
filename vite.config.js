import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
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
        entryFileNames: 'assets/vue/[name].js',
        chunkFileNames: 'assets/vue/[name].js',
        assetFileNames: 'assets/vue/[name][extname]'
      }
    }
  },
  publicDir: false
})

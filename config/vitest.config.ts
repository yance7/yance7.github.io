import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [vue({ template: { transformAssetUrls: { includeAbsolute: false } } })],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
})

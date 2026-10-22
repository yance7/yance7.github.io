import { build } from 'vite'
import vue from '@vitejs/plugin-vue'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export default async function buildMediaFixture() {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const outputRoot = resolve(repositoryRoot, process.env.PLAYWRIGHT_OUTPUT_DIR ?? 'test-results/local')
  process.env.MEDIA_FIXTURE_ROOT = resolve(outputRoot, 'media-fixture')
  await build({
    configFile: false,
    root: resolve(repositoryRoot, 'tests/fixtures/media'),
    publicDir: false,
    base: '/media-fixture/',
    logLevel: 'error',
    plugins: [vue()],
    build: { outDir: process.env.MEDIA_FIXTURE_ROOT, emptyOutDir: true }
  })
}

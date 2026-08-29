import { defineConfig, normalizePath, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { THEME_COLORS } from './src/themeColors.ts'
import { htmlPageEntries, isPageKey } from './src/data/pageRegistry.ts'
import { getLocalizedSeo } from './src/data/seo.ts'

const rootDir = dirname(fileURLToPath(import.meta.url))
const htmlRoot = resolve(rootDir, 'html-src')
const pageNames = htmlPageEntries.map(({ htmlName }) => htmlName)
const THEME_BOOTSTRAP_HASH = 'sha256-qitwqlI10vu96/QuP/2uODumC43vvFpscxk/zXDGK2o='

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
      const seo = getLocalizedSeo('zh-CN', pageValue)
      const alternateLinks = seo.alternates
        .map((alternate) => `  <link rel="alternate" hreflang="${alternate.hreflang}" href="${alternate.href}">`)
        .join('\n')
      return html
        .replaceAll('__PAGE_TITLE__', seo.title)
        .replaceAll('__META_DESCRIPTION__', seo.description)
        .replaceAll('__OG_TITLE__', seo.ogTitle)
        .replaceAll('__OG_DESCRIPTION__', seo.ogDescription)
        .replaceAll('__OG_LOCALE__', seo.ogLocale)
        .replaceAll('__OG_IMAGE__', seo.ogImage)
        .replaceAll('__OG_IMAGE_ALT__', seo.ogImageAlt)
        .replaceAll('__CANONICAL_URL__', seo.canonical)
        .replaceAll('__JSONLD_URL__', seo.canonical)
        .replaceAll('__JSONLD_LANGUAGE__', seo.jsonLdLanguage)
        .replace('</head>', `${alternateLinks}\n</head>`)
    }
  }
}

function localeDevRewritePlugin(): Plugin {
  const localePrefixes = ['/en', '/zh-hk']
  const knownPages = new Set([...pageNames.map((name) => `${name}.html`), '404.html'])

  function rewriteUrl(rawUrl: string, localizedRoot = false) {
    const [rawPathname, query = ''] = rawUrl.split('?')
    const pathname = rawPathname ?? '/'
    const prefix = localePrefixes.find((candidate) => pathname === `${candidate}/` || pathname.startsWith(`${candidate}/`))
    if (!prefix) return null
    const suffix = pathname.slice(prefix.length).replace(/^\//, '')
    const page = suffix && knownPages.has(suffix) ? suffix : suffix ? '404.html' : 'index.html'
    const target = localizedRoot ? `${prefix}/${page}` : `/${page}`
    return `${target}${query ? `?${query}` : ''}`
  }

  return {
    name: 'locale-dev-rewrite',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        const rewritten = rewriteUrl(request.url ?? '/')
        if (rewritten) request.url = rewritten
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, _response, next) => {
        const rewritten = rewriteUrl(request.url ?? '/', true)
        if (rewritten) request.url = rewritten
        next()
      })
    }
  }
}

function devSourceScriptPlugin(): Plugin {
  const sourceMainUrl = `/@fs/${normalizePath(resolve(rootDir, 'src/main.ts'))}`
  return {
    name: 'dev-source-script',
    apply: 'serve',
    enforce: 'post',
    transformIndexHtml(html: string) {
      return html
        .replaceAll('../src/main.ts', sourceMainUrl)
        .replaceAll('src="/src/main.ts"', `src="${sourceMainUrl}"`)
    }
  }
}

export default defineConfig({
  root: htmlRoot,
  plugins: [themeTokenPlugin(), pageMetadataPlugin(), localeDevRewritePlugin(), devSourceScriptPlugin(), vue()],
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

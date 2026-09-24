import { defineConfig, normalizePath, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { THEME_COLORS } from './src/themeColors.ts'
import { htmlPageEntries, isPageKey, pageEntries } from './src/data/pageRegistry.ts'
import { getLocalizedSeo } from './src/data/seo.ts'

const rootDir = dirname(fileURLToPath(import.meta.url))
const htmlRoot = resolve(rootDir, 'html-src')
const THEME_BOOTSTRAP_HASH = 'sha256-qitwqlI10vu96/QuP/2uODumC43vvFpscxk/zXDGK2o='
const localePrefixes = ['/en', '/zh-hk']

const htmlInputs = Object.fromEntries(
  htmlPageEntries.map(({ htmlName }) => [
    htmlName,
    resolve(rootDir, 'html-src', `${htmlName}.html`)
  ])
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
        .replaceAll('__OG_URL__', seo.canonical)
        .replaceAll('__CANONICAL_URL__', seo.canonical)
        .replaceAll('__JSONLD_URL__', seo.canonical)
        .replaceAll('__JSONLD_LANGUAGE__', seo.jsonLdLanguage)
        .replace('</head>', `${alternateLinks}\n</head>`)
    }
  }
}

function localeDevRewritePlugin(): Plugin {
  function splitUrl(rawUrl: string) {
    const parsed = new URL(rawUrl, 'http://vite.local')
    const pathname = parsed.pathname
    const prefix = localePrefixes.find((candidate) => (
      pathname.toLowerCase() === candidate || pathname.toLowerCase().startsWith(`${candidate}/`)
    )) ?? ''
    const localPath = prefix ? pathname.slice(prefix.length) || '/' : pathname
    return { pathname, prefix, localPath, search: parsed.search }
  }

  function isStaticAsset(pathname: string) {
    return pathname.startsWith('/assets/') || /\.(?:css|js|mjs|png|jpe?g|webp|avif|svg|ico|woff2?|xml|txt|webmanifest)$/i.test(pathname)
  }

  function developmentRewrite(rawUrl: string) {
    const { localPath, search } = splitUrl(rawUrl)
    if (
      localPath.startsWith('/@') ||
      localPath.startsWith('/node_modules/.vite/') ||
      /\.(?:ts|tsx|vue)$/i.test(localPath)
    ) return null
    if (isStaticAsset(localPath)) return null
    if (localPath === '/404.html') return `/404.html${search}`
    const entry = pageEntries.find(({ routePath, legacyPath }) => (
      localPath === routePath || localPath === legacyPath
    ))
    if (entry) return `/${entry.htmlName}.html${search}`
    return `/404.html${search}`
  }

  function previewRewrite(rawUrl: string) {
    const { prefix, localPath, search } = splitUrl(rawUrl)
    if (isStaticAsset(localPath) || localPath === '/404.html') return null
    const knownPage = pageEntries.some(({ routePath, legacyPath }) => (
      localPath === routePath || localPath === legacyPath
    ))
    if (knownPage) return null
    return `${prefix}/404.html${search}`
  }

  return {
    name: 'locale-dev-rewrite',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        const rewritten = developmentRewrite(request.url ?? '/')
        if (rewritten) request.url = rewritten
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, _response, next) => {
        const rewritten = previewRewrite(request.url ?? '/')
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

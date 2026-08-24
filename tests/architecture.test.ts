import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { htmlPageEntries, isPageKey, pageEntries, pageRegistry } from '../src/data/pageRegistry'
import { getConcertState } from '../src/data/concerts'
import { useAlbumSpotlight } from '../src/composables/useAlbumSpotlight'
import { createImagePreloader, type PreloadImage } from '../src/utils/imagePreload'
import { decodeHashTarget, retryAsync } from '../src/utils/navigation'
import type { YanceButtonSize, YanceButtonVariant } from '../src/components/yanceButtonTypes'

describe('page registry', () => {
  it('derives navigable and HTML page entries from one registry', () => {
    expect(pageEntries.map((entry) => entry.key)).toEqual([
      'home', 'academics', 'honors', 'research', 'works', 'concerts'
    ])
    expect(htmlPageEntries.map((entry) => entry.htmlName)).toEqual([
      'index', 'academics', 'honors', 'research', 'works', 'concerts', '404'
    ])
    expect(pageRegistry.concerts.sections.map((section) => section.id)).toContain('album-frequencies')
    expect(pageRegistry.research.nav.en).toBe('Research')
    expect(pageRegistry.academics.sections.map((section) => section.shortLabel)).toEqual(['EDU', 'SCORES', 'AP'])
    expect(pageRegistry.honors.sections.map((section) => section.shortLabel)).toEqual(['MILE', 'ARCH'])
    expect(pageRegistry.research.sections.map((section) => section.shortLabel)).toEqual(['R&D', 'METHOD'])
    const shortLabels = pageEntries.reduce<string[]>((labels, entry) => {
      entry.sections.forEach((section) => labels.push(section.shortLabel ?? ''))
      return labels
    }, [])
    expect(shortLabels.every((label) => label.length <= 6)).toBe(true)
    expect(isPageKey('research')).toBe(true)
    expect(isPageKey('missing')).toBe(false)
  })
})

describe('critical rendering contracts', () => {
  it('starts the current page chunk before mounting the Vue shell', () => {
    const main = readFileSync(resolve(process.cwd(), 'src/main.ts'), 'utf8')
    const loaders = readFileSync(resolve(process.cwd(), 'src/pageLoaders.ts'), 'utf8')

    expect(loaders).toContain('export function preloadPage(')
    expect(main).toContain('preloadPage(document.body.dataset.page)')
    expect(main.indexOf('preloadPage(document.body.dataset.page)'))
      .toBeLessThan(main.indexOf("app.mount('#app')"))
  })

  it('loads the bundled font stylesheet after the initial app mount', () => {
    const main = readFileSync(resolve(process.cwd(), 'src/main.ts'), 'utf8')

    expect(main).not.toContain("import './fonts.css'")
    expect(main).toContain("document.documentElement.dataset.fontsReady = 'loading'")
    expect(main).toContain("await document.fonts.ready")
    expect(main).toContain("document.documentElement.dataset.fontsReady = 'ready'")
    expect(main).toContain("app.mount('#app')\nscheduleFonts()")
    expect(main).not.toContain('requestAnimationFrame')
  })

  it('defers bundled font loading until the initial page work is idle', () => {
    const main = readFileSync(resolve(process.cwd(), 'src/main.ts'), 'utf8')

    expect(main).toContain('const fontIdleTimeout = 1200')
    expect(main).toContain('requestIdleCallback')
    expect(main).toContain('timeout: fontIdleTimeout')
    expect(main).toContain('setTimeout(loadFonts, fontIdleTimeout)')
  })

  it('preloads the first concert album cover before the async page chunk mounts', () => {
    const concertsHtml = readFileSync(resolve(process.cwd(), 'html-src/concerts.html'), 'utf8')

    expect(concertsHtml).toContain('<link\n    rel="preload"\n    as="image"')
    expect(concertsHtml).toContain('/assets/albums/thumbs/jay-fantasy-640.webp')
    expect(concertsHtml).toContain('imagesrcset="/assets/albums/thumbs/jay-fantasy-640.webp 640w, /assets/albums/thumbs/jay-fantasy-1200.webp 1200w"')
    expect(concertsHtml).toContain('imagesizes="(min-width: 1180px) 36vw, (min-width: 768px) 42vw, 82vw"')
    expect(concertsHtml).toContain('fetchpriority="high"')
  })

  it('keeps archive hero copy on its deterministic entrance animation', () => {
    const hero = readFileSync(resolve(process.cwd(), 'src/components/ArchiveHero.vue'), 'utf8')

    expect(hero).toContain('<p class="hero-copy">{{ copy }}</p>')
    expect(hero).not.toContain('<p class="hero-copy" v-reveal')
  })

  it('exposes a settled state for metric count-up surfaces', () => {
    const metric = readFileSync(resolve(process.cwd(), 'src/components/MetricStrip.vue'), 'utf8')

    expect(metric).toContain('data-metrics-ready')
    expect(metric).toContain('metricsReady.value = true')
    expect(metric).toContain('const observedIndexes = new Set<number>()')
    expect(metric).toContain('initialObservationComplete')
    expect(metric).toContain('if (!entry.isIntersecting) return')
  })
})

describe('shared button public contract', () => {
  it('keeps the documented variants and sizes available to callers', () => {
    const buttonTypes = readFileSync(resolve(process.cwd(), 'src/components/yanceButtonTypes.ts'), 'utf8')
    const primitives = readFileSync(resolve(process.cwd(), 'src/styles/primitives.css'), 'utf8')
    const variants = ['primary', 'secondary', 'quiet'] satisfies YanceButtonVariant[]
    const sizes = ['sm', 'md', 'lg', 'icon'] satisfies YanceButtonSize[]

    expect(buttonTypes).not.toContain("'ghost'")
    expect(buttonTypes).not.toContain("'archive'")
    expect(primitives).not.toContain('.y-button--ghost')
    expect(primitives).not.toContain('.y-button--archive')
    expect(variants).toHaveLength(3)
    expect(sizes).toHaveLength(4)
  })
})

describe('motion hierarchy', () => {
  it('does not retain legacy two-pixel control lifts', () => {
    const stylePaths = [
      'src/styles/concerts.css',
      'src/styles/home.css',
      'src/styles/shell.css'
    ]

    for (const stylePath of stylePaths) {
      const styles = readFileSync(resolve(process.cwd(), stylePath), 'utf8')
      expect(styles).not.toContain('translateY(-2px)')
    }
  })
})

describe('concert state snapshots', () => {
  it('derives every time-sensitive value from the supplied page timestamp', () => {
    const before = getConcertState(new Date('2026-08-19T12:00:00+08:00'))
    const after = getConcertState(new Date('2026-08-20T12:00:00+08:00'))

    expect(before.upcoming.some((concert) => concert.id === 'wangsulong-2026-08-19')).toBe(true)
    expect(after.upcoming.some((concert) => concert.id === 'wangsulong-2026-08-19')).toBe(false)
    expect(before.stats.attended + before.stats.upcoming).toBe(before.stats.total)
    expect(after.stats.attended + after.stats.upcoming).toBe(after.stats.total)
  })
})

describe('album spotlight state machine', () => {
  it('commits the latest request and exposes loading/error transitions', async () => {
    const resolvers: Array<(loaded: boolean) => void> = []
    const load = vi.fn(() => new Promise<boolean>((resolve) => resolvers.push(resolve)))
    const spotlight = useAlbumSpotlight(3, load)

    const first = spotlight.select(1)
    expect(spotlight.state.value).toMatchObject({ selected: 1, displayed: 0, status: 'loading' })
    const second = spotlight.select(2)
    expect(spotlight.state.value.selected).toBe(2)

    resolvers[0]?.(true)
    await first
    expect(spotlight.state.value).toMatchObject({ selected: 2, displayed: 0, status: 'loading' })

    resolvers[1]?.(false)
    await second
    expect(spotlight.state.value).toMatchObject({ selected: 2, displayed: 2, status: 'error' })
  })
})

describe('image preloader', () => {
  it('owns pending and loaded state so callers cannot omit deduplication state', async () => {
    const images: PreloadImage[] = []
    const preloader = createImagePreloader({
      createImage: () => {
        const image: PreloadImage = { src: '', decoding: 'auto', onload: null, onerror: null }
        images.push(image)
        return image
      }
    })

    expect(preloader.preload('/poster.jpg')).toBe(true)
    expect(preloader.preload('/poster.jpg')).toBe(false)
    images[0]?.onerror?.(new Event('error'))
    await Promise.resolve()
    expect(preloader.preload('/poster.jpg')).toBe(true)
    images[1]?.onload?.(new Event('load'))
    await Promise.resolve()
    expect(preloader.isLoaded('/poster.jpg')).toBe(true)
    expect(preloader.preload('/poster.jpg')).toBe(false)
  })

  it('settles an image timeout and clears the pending request', async () => {
    vi.useFakeTimers()
    try {
      const image: PreloadImage = { src: '', decoding: 'auto', onload: null, onerror: null }
      const controller = createImagePreloader(
        { createImage: () => image },
        { timeoutMs: 20 }
      )

      expect(controller.preload('/slow-poster.jpg')).toBe(true)
      expect(controller.isPending('/slow-poster.jpg')).toBe(true)
      await vi.advanceTimersByTimeAsync(19)
      expect(controller.isPending('/slow-poster.jpg')).toBe(true)

      await vi.advanceTimersByTimeAsync(1)

      expect(controller.isPending('/slow-poster.jpg')).toBe(false)
      expect(controller.isLoaded('/slow-poster.jpg')).toBe(false)
      expect(image.onload).toBeNull()
      expect(image.onerror).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('navigation failure paths', () => {
  it('does not throw for malformed hash encoding', () => {
    expect(decodeHashTarget('#works')).toBe('works')
    expect(decodeHashTarget('#bad%')).toBeNull()
    expect(decodeHashTarget('#')).toBeNull()
  })

  it('retries async imports a bounded number of times', async () => {
    let attempts = 0
    const value = await retryAsync(async () => {
      attempts += 1
      if (attempts < 3) throw new Error('chunk unavailable')
      return 'loaded'
    }, { retries: 2, delayMs: 0 })

    expect(value).toBe('loaded')
    expect(attempts).toBe(3)
  })
})

describe('page stylesheet boundaries', () => {
  it('keeps the global entry limited to shared and responsive styles', () => {
    const globalStyles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')

    expect(globalStyles).toContain("@import './styles/components.css';")
    expect(globalStyles).toContain("@import './styles/responsive.css';")
    expect(globalStyles).not.toMatch(/content\.css|media\.css|works\.css/)
  })

  it('loads each page stylesheet from its async page component', () => {
    const pageStyles = {
      HomePage: readFileSync(resolve(process.cwd(), 'src/pages/HomePage.vue'), 'utf8'),
      AcademicsPage: readFileSync(resolve(process.cwd(), 'src/pages/AcademicsPage.vue'), 'utf8'),
      HonorsPage: readFileSync(resolve(process.cwd(), 'src/pages/HonorsPage.vue'), 'utf8'),
      ResearchPage: readFileSync(resolve(process.cwd(), 'src/pages/ResearchPage.vue'), 'utf8'),
      WorksPage: readFileSync(resolve(process.cwd(), 'src/pages/WorksPage.vue'), 'utf8'),
      ConcertsPage: readFileSync(resolve(process.cwd(), 'src/pages/ConcertsPage.vue'), 'utf8')
    }

    expect(pageStyles.HomePage).toContain("import '../styles/home.css'")
    expect(pageStyles.AcademicsPage).toContain("import '../styles/academics.css'")
    expect(pageStyles.HonorsPage).toContain("import '../styles/honors.css'")
    expect(pageStyles.ResearchPage).toContain("import '../styles/research.css'")
    expect(pageStyles.WorksPage).toContain("import '../styles/works.css'")
    expect(pageStyles.ConcertsPage).toContain("import '../styles/concerts.css'")

    for (const source of Object.values(pageStyles)) {
      expect(source).not.toContain("import '../styles.css'")
    }
  })

  it('keeps page-specific responsive selectors out of the global stylesheet', () => {
    const responsiveStyles = readFileSync(resolve(process.cwd(), 'src/styles/responsive.css'), 'utf8')

    for (const selector of [
      '.home-',
      '.world-',
      '.focus-',
      '.honor-',
      '.activity-',
      '.tl-',
      '.method-',
      '.toolchain-',
      '.sc-',
      '.concert-',
      '.next-up'
    ]) {
      expect(responsiveStyles).not.toContain(selector)
    }
  })

  it('contracts the built manifest and the dedicated visual project', () => {
    const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8')
    const smoke = readFileSync(resolve(process.cwd(), 'scripts/smoke-test.ts'), 'utf8')
    const playwrightConfig = readFileSync(resolve(process.cwd(), 'playwright.config.ts'), 'utf8')
    const visualSpec = readFileSync(resolve(process.cwd(), 'tests/e2e/visual-matrix.spec.ts'), 'utf8')

    expect(viteConfig).toMatch(/manifest:\s*true/)
    expect(smoke).toContain('manifest.json')
    for (const page of ['HomePage.vue', 'ResearchPage.vue', 'ConcertsPage.vue']) {
      expect(smoke).toContain(page)
    }
    expect(playwrightConfig).toContain("name: 'chromium-visual'")
    expect(playwrightConfig).toContain('visual-matrix\\.spec\\.ts')
    expect(playwrightConfig).toContain("snapshotPathTemplate: '{testDir}/visual-snapshots/{projectName}/{platform}/{testFilePath}/{arg}{ext}'")
    expect(visualSpec).toContain('toHaveScreenshot')
    expect(visualSpec).toContain('if (viewport.width <= 760)')
    expect(visualSpec).toContain('clip: {')
    expect(visualSpec).toContain('page.screenshot')
  })
})

describe('release workflow contracts', () => {
  it('prepares the Pages artifact with the official configure action', () => {
    const pagesWorkflow = readFileSync(resolve(process.cwd(), '.github/workflows/pages.yml'), 'utf8')

    expect(pagesWorkflow).toContain('actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b')
    expect(pagesWorkflow).toContain('actions/upload-pages-artifact@7b1f4a764d45c48632c6b24a0339c27f5614fb0b')
    expect(pagesWorkflow).toContain('actions/deploy-pages@')
    expect(pagesWorkflow.indexOf('actions/configure-pages@')).toBeLessThan(pagesWorkflow.indexOf('actions/upload-pages-artifact@'))
  })

  it('runs deterministic checks on pull requests without deploying Pages', () => {
    const ciPath = resolve(process.cwd(), '.github/workflows/ci.yml')
    const qualityWorkflow = readFileSync(resolve(process.cwd(), '.github/workflows/quality.yml'), 'utf8')

    expect(existsSync(ciPath)).toBe(true)
    const ciWorkflow = readFileSync(ciPath, 'utf8')
    expect(ciWorkflow).toContain('pull_request:')
    expect(ciWorkflow).toContain('npm ci')
    expect(ciWorkflow).toContain('npm run test:e2e -- --project=chromium --workers=1 --grep')
    expect(ciWorkflow).not.toContain('deploy-pages')
    expect(qualityWorkflow).toContain('pull_request:')
    expect(qualityWorkflow).toContain('branches: [main]')
    expect(qualityWorkflow.match(/if: \$\{\{ !cancelled\(\) \}\}/g)).toHaveLength(2)
    expect(qualityWorkflow).toContain('include-hidden-files: true')
  })

  it('does not instruct active UI refinement work to push directly to main', () => {
    const plan = readFileSync(resolve(process.cwd(), 'docs/superpowers/plans/2026-08-23-ui-component-refinement.md'), 'utf8')

    expect(plan).not.toContain('直接提交并推送 `main`')
    expect(plan).not.toContain('不创建 feature branch 或 PR')
  })
})

describe('shared UI correction contracts', () => {
  it('keeps disabled links and shared semantic tokens explicit', () => {
    const button = readFileSync(resolve(process.cwd(), 'src/components/YanceButton.vue'), 'utf8')
    const status = readFileSync(resolve(process.cwd(), 'src/components/StatusBadge.vue'), 'utf8')
    const primitives = readFileSync(resolve(process.cwd(), 'src/styles/primitives.css'), 'utf8')
    const theme = readFileSync(resolve(process.cwd(), 'src/theme.css'), 'utf8')
    const compass = readFileSync(resolve(process.cwd(), 'src/components/PageCompass.vue'), 'utf8')
    const shell = readFileSync(resolve(process.cwd(), 'src/styles/shell.css'), 'utf8')

    expect(button).toContain('const effectiveHref = computed(')
    expect(button).toContain(':href="effectiveHref"')
    expect(button).toContain(':rel="effectiveRel"')
    expect(primitives).toContain(".y-button:not(:disabled):not([aria-disabled='true']):hover")
    expect(primitives).toContain('.y-button,\n  .y-archive-link')
    expect(theme).toContain('--aqua-text:')
    expect(theme).toContain('--tooltip-muted:')
    expect(theme).toContain('--motion-control-lift:')
    expect(status).toContain(':data-status="status"')
    expect(compass).not.toContain('aria-live="polite"')
    expect(shell).toContain('@media (min-width: 761px)')
    expect(shell).toContain('.page-compass-link:focus-visible .page-compass-tooltip')
    expect(shell).toContain('.page-compass-top-tooltip small { color: var(--tooltip-muted);')
    expect(shell).toContain('@media (hover: hover) and (pointer: fine) and (min-width: 761px)')
  })
})

describe('lightbox depth contracts', () => {
  it('keeps metadata treatment single-layered and reserves stage space', () => {
    const lightbox = readFileSync(resolve(process.cwd(), 'src/components/ImageLightbox.vue'), 'utf8')
    const styles = readFileSync(resolve(process.cwd(), 'src/styles/components.css'), 'utf8')

    expect(lightbox).not.toContain('lb-meta-blur')
    expect(styles).not.toContain('lb-meta-blur')
    expect(styles.match(/(?:^|\n)\s+backdrop-filter:\s*blur\(/g)).toHaveLength(1)
    expect(styles).toContain('--lb-meta-reserve: 132px')
    expect(styles).toContain('var(--lb-meta-reserve)')
  })
})

describe('motion hierarchy contracts', () => {
  it('commits theme state synchronously without deferring the theme change', () => {
    const theme = readFileSync(resolve(process.cwd(), 'src/composables/useTheme.ts'), 'utf8')
    const themeStyles = readFileSync(resolve(process.cwd(), 'src/theme.css'), 'utf8')
    const shellStyles = readFileSync(resolve(process.cwd(), 'src/styles/shell.css'), 'utf8')

    const applyThemeStart = theme.indexOf('function applyTheme(')
    const setThemeIndex = theme.indexOf('\n  setTheme(value)', applyThemeStart)
    const applyThemeEnd = theme.indexOf('\n}\n\nfunction toggleTheme', applyThemeStart)

    expect(setThemeIndex).toBeGreaterThan(applyThemeStart)
    expect(setThemeIndex).toBeLessThan(applyThemeEnd)
    expect(theme.slice(applyThemeStart, applyThemeEnd)).not.toContain('getBoundingClientRect')
    expect(theme.slice(applyThemeStart, applyThemeEnd)).not.toContain('setTimeout')
    expect(theme.slice(applyThemeStart, applyThemeEnd)).not.toContain('requestAnimationFrame')
    expect(theme).not.toContain('function commitThemeChange(')
    expect(theme).not.toContain('window.setTimeout(() => commitThemeChange')
    expect(theme).toContain('setTheme(value)')
    expect(themeStyles).not.toContain('transition-property: background, background-color, border-color, color, box-shadow, fill;')
    expect(themeStyles).not.toContain('.theme-ripple')
    expect(themeStyles).not.toContain('mix-blend-mode: multiply;')
    expect(themeStyles).not.toContain("[data-theme='light'] .grain")
    expect(themeStyles).not.toContain("[data-theme='dark'] .grain")
    expect(shellStyles).toContain('.grain {')
    expect(shellStyles).toContain('radial-gradient(rgba(0, 0, 0, .2) .45px, transparent .55px)')
    expect(shellStyles).not.toContain('feTurbulence')
  })

  it('lets IntersectionObserver own reveal geometry after initial viewport setup', () => {
    const reveal = readFileSync(resolve(process.cwd(), 'src/directives/reveal.ts'), 'utf8')

    expect(reveal).not.toContain('const tracked = new Set<HTMLElement>()')
    expect(reveal).not.toContain('tracked.forEach(')
    expect(reveal).not.toContain('tracked.add(element)')
    expect(reveal).not.toContain('tracked.delete(element)')
    expect(reveal).toContain('currentObserver.unobserve(element)')
    expect(reveal).toContain('isInInitialViewport(element.getBoundingClientRect(), window.innerHeight)')
    expect(reveal).toContain('function revealRemainingAtDocumentEnd()')
    expect(reveal).toContain('document.documentElement.scrollHeight')
    expect(reveal).toContain("document.querySelectorAll<HTMLElement>('.reveal:not(.revealed)')")
    expect(reveal).toContain("window.addEventListener('scroll', handleScroll, { passive: true })")
    expect(reveal).toContain('let reachedDocumentEnd = false')
    expect(reveal).toContain('new ResizeObserver(')
  })

  it('keeps project actions free of nested magnetic bindings', () => {
    const project = readFileSync(resolve(process.cwd(), 'src/components/ProjectShowcase.vue'), 'utf8')
    expect(project).not.toContain('v-magnetic')
  })

  it('uses one observer with policy-safe metric initialization', () => {
    const metric = readFileSync(resolve(process.cwd(), 'src/components/MetricStrip.vue'), 'utf8')
    expect(metric.match(/new IntersectionObserver/g)).toHaveLength(1)
    expect(metric).toContain('data-metric-index')
    expect(metric).toContain('const duration = 650')
    expect(metric).toContain('prefers-reduced-motion')
    expect(metric).toContain('initialDisplay')
    expect(metric).toContain('v-reveal')
    expect(metric).not.toContain('class="metric-card"\n      :ref=')
  })

  it('clears a stale timeline current state when no item is readable', () => {
    const timeline = readFileSync(resolve(process.cwd(), 'src/components/TimelineTrack.vue'), 'utf8')
    expect(timeline).toContain("if (!readingTargets.size) {\n    currentId.value = ''")
  })

  it('uses the shared smaller control lift in research and works', () => {
    const research = readFileSync(resolve(process.cwd(), 'src/styles/research.css'), 'utf8')
    const works = readFileSync(resolve(process.cwd(), 'src/styles/works.css'), 'utf8')
    expect(research).toContain('translateY(var(--motion-control-lift))')
    expect(works).toContain('translateY(var(--motion-control-lift))')
    expect(research).toMatch(/\.method-toggle\s*\{[\s\S]*border-radius:\s*var\(--control-radius\)/)
    expect(research).toMatch(/\.method-toggle:hover\s*\{[\s\S]*box-shadow:\s*var\(--interactive-shadow\);[\s\S]*transform:\s*translateY\(var\(--motion-control-lift\)\)/)
    expect(research).not.toContain('translateY(-2px)')
    expect(works).not.toContain('translateY(-2px)')
  })
})

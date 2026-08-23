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
    expect(isPageKey('research')).toBe(true)
    expect(isPageKey('missing')).toBe(false)
  })
})

describe('shared button public contract', () => {
  it('keeps the documented variants and sizes available to callers', () => {
    const variants = ['primary', 'secondary', 'ghost', 'quiet', 'archive'] satisfies YanceButtonVariant[]
    const sizes = ['sm', 'md', 'lg', 'icon'] satisfies YanceButtonSize[]

    expect(variants).toHaveLength(5)
    expect(sizes).toHaveLength(4)
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
    expect(playwrightConfig).toContain("snapshotPathTemplate: '{testDir}/visual-snapshots/{projectName}/{testFilePath}/{arg}{ext}'")
    expect(playwrightConfig).not.toContain('{platform}')
    expect(visualSpec).toContain('toHaveScreenshot')
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

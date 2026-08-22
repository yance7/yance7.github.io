import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import puppeteer from 'puppeteer-core'
import { startFlow } from 'lighthouse'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const PORT = 4174
const BASE_URL = `http://127.0.0.1:${PORT}`
const INP_BUDGET = 200
const concertPosterSelector = '.concert-row:has(.carousel-controls)'

const scenarios = [
  {
    viewport: 'desktop',
    width: 1440,
    height: 900,
    routes: [
      {
        page: 'index.html',
        interactions: [
          { name: 'theme-toggle', selector: '.theme-orbit', run: (page) => page.click('.theme-orbit') }
        ]
      },
      {
        page: 'research.html',
        interactions: [
          {
            name: 'page-compass',
            selector: '.page-compass-link:last-child',
            run: (page) => page.click('.page-compass-link:last-child')
          }
        ]
      },
      {
        page: 'concerts.html',
        interactions: [
          {
            name: 'album-selection',
            selector: '.album-tile:nth-of-type(2)',
            run: (page) => page.click('.album-tile:nth-of-type(2)')
          },
          {
            name: 'carousel-next',
            selector: '.carousel-controls button[aria-label="下一张"]',
            prepare: warmConcertPoster,
            run: (page) => page.click('.carousel-controls button[aria-label="下一张"]')
          },
          {
            name: 'lightbox-open',
            selector: '.concert-row:has(.carousel-controls) .poster-open',
            prepare: warmLightbox,
            run: async (page) => {
              await page.click('.concert-row:has(.carousel-controls) .poster-open')
              await page.waitForSelector('.lightbox')
            }
          },
          {
            name: 'lightbox-next',
            selector: '.lb-next',
            run: (page) => page.click('.lb-next')
          },
          {
            name: 'lightbox-close',
            selector: '.lb-close',
            run: async (page) => {
              await page.click('.lb-close')
              await page.waitForSelector('.lightbox', { hidden: true })
            }
          }
        ]
      }
    ]
  },
  {
    viewport: 'mobile',
    width: 390,
    height: 844,
    routes: [
      {
        page: 'index.html',
        interactions: [
          { name: 'theme-toggle', selector: '.theme-orbit', run: (page) => page.click('.theme-orbit') },
          {
            name: 'mobile-menu',
            selector: '.menu-trigger',
            run: async (page) => {
              await page.click('.menu-trigger')
              await page.waitForSelector('.mobile-menu-overlay')
              await page.click('.mobile-menu-close')
              await page.waitForSelector('.mobile-menu-overlay', { hidden: true })
            }
          }
        ]
      },
      {
        page: 'research.html',
        interactions: [
          {
            name: 'page-compass',
            selector: '.page-compass-link:last-child',
            prepare: async (page) => {
              await page.evaluate(() => window.scrollTo(0, Math.max(320, document.body.scrollHeight * .35)))
              await delay(450)
            },
            run: (page) => page.click('.page-compass-link:last-child')
          }
        ]
      },
      {
        page: 'concerts.html',
        interactions: [
          {
            name: 'album-selection',
            selector: '.album-tile:nth-of-type(2)',
            run: (page) => page.click('.album-tile:nth-of-type(2)')
          },
          {
            name: 'carousel-next',
            selector: '.carousel-controls button[aria-label="下一张"]',
            prepare: warmConcertPoster,
            run: (page) => page.click('.carousel-controls button[aria-label="下一张"]')
          },
          {
            name: 'lightbox-open',
            selector: '.concert-row:has(.carousel-controls) .poster-open',
            prepare: warmLightbox,
            run: async (page) => {
              await page.click('.concert-row:has(.carousel-controls) .poster-open')
              await page.waitForSelector('.lightbox')
            }
          },
          {
            name: 'lightbox-next',
            selector: '.lb-next',
            run: (page) => page.click('.lb-next')
          },
          {
            name: 'lightbox-close',
            selector: '.lb-close',
            run: async (page) => {
              await page.click('.lb-close')
              await page.waitForSelector('.lightbox', { hidden: true })
            }
          }
        ]
      }
    ]
  }
]

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms))
}

async function waitForConcertPoster(page) {
  await page.waitForFunction((selector) => {
    const image = document.querySelector(`${selector} img`)
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0
  }, { timeout: 15000 }, concertPosterSelector)
}

async function warmConcertPoster(page) {
  await page.$eval(concertPosterSelector, (element) => element.scrollIntoView({ block: 'center' }))
  await page.hover(concertPosterSelector)
  await waitForConcertPoster(page)

  const nextButton = `${concertPosterSelector} .carousel-controls button[aria-label="下一张"]`
  const previousButton = `${concertPosterSelector} .carousel-controls button[aria-label="上一张"]`
  await page.click(nextButton)
  await waitForConcertPoster(page)
  await page.click(previousButton)
  await waitForConcertPoster(page)
  await delay(350)
}

async function warmLightbox(page) {
  await warmConcertPoster(page)
  const openButton = `${concertPosterSelector} .poster-open`
  await page.click(openButton)
  await page.waitForSelector('.lightbox')
  await page.waitForFunction(() => {
    const image = document.querySelector('.lightbox img')
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0
  }, { timeout: 15000 })
  await delay(350)
  await page.click('.lb-close')
  await page.waitForSelector('.lightbox', { hidden: true })
  await delay(350)
}

function chromeExecutable() {
  const windows = process.env.ProgramFiles
    ? [
        resolve(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe'),
        resolve(process.env.ProgramFiles, 'Microsoft/Edge/Application/msedge.exe')
      ]
    : []
  const candidates = [
    process.env.LIGHTHOUSE_CHROME_PATH,
    process.env.CHROME_PATH,
    chromium.executablePath(),
    process.env.PUPPETEER_EXECUTABLE_PATH,
    ...windows,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean)

  const exact = candidates.find((candidate) => existsSync(candidate))
  if (exact) return exact

  throw new Error('Chrome executable not found. Set CHROME_PATH before running Lighthouse interactions.')
}

function startPreview() {
  const isWindows = process.platform === 'win32'
  const command = isWindows ? (process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe') : 'npm'
  const args = isWindows
    ? ['/d', '/s', '/c', `npm run preview -- --host 127.0.0.1 --port ${PORT}`]
    : ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(PORT)]
  return spawn(command, args, {
    cwd: ROOT,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, BROWSER: 'none' }
  })
}

function stopPreview(preview) {
  if (!preview || preview.killed) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(preview.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
    return
  }
  preview.kill('SIGTERM')
}

async function waitForPreview(url, preview) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (preview.exitCode !== null) throw new Error(`Preview exited before becoming ready: ${preview.exitCode}`)
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The preview server is still starting.
    }
    await delay(250)
  }
  throw new Error(`Preview did not become ready at ${url}`)
}

function lighthouseConfig(scenario) {
  const mobile = scenario.viewport === 'mobile'
  return {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: ['performance'],
      throttlingMethod: 'provided',
      formFactor: mobile ? 'mobile' : 'desktop',
      screenEmulation: {
        mobile,
        width: scenario.width,
        height: scenario.height,
        deviceScaleFactor: mobile ? 2 : 1,
        disabled: false
      }
    }
  }
}

async function measureInteraction(flow, page, interaction) {
  await page.waitForSelector(interaction.selector)
  await interaction.prepare?.(page)
  await flow.startTimespan({ name: `interaction:${interaction.name}` })
  try {
    await interaction.run(page)
    await delay(500)
  } finally {
    await flow.endTimespan()
  }
}

async function runScenario(browser, scenario, route) {
  const page = await browser.newPage()
  await page.setViewport({
    width: scenario.width,
    height: scenario.height,
    deviceScaleFactor: scenario.viewport === 'mobile' ? 2 : 1,
    isMobile: scenario.viewport === 'mobile'
  })

  const flow = await startFlow(page, {
    name: `${scenario.viewport} ${route.page}`,
    config: lighthouseConfig(scenario),
    flags: { usePassiveGathering: false }
  })
  await flow.navigate(`${BASE_URL}/${route.page}`, { name: `navigate:${route.page}` })
  await page.evaluate(() => document.fonts?.ready)
  await delay(1000)
  for (const interaction of route.interactions) {
    await measureInteraction(flow, page, interaction)
  }

  const result = await flow.createFlowResult()
  const failures = []
  for (const step of result.steps.filter(({ name }) => name.startsWith('interaction:'))) {
    const audit = step.lhr.audits['interaction-to-next-paint']
    const value = audit?.numericValue
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      console.log(`[Lighthouse interaction] ${scenario.viewport} ${route.page} ${step.name}: not-applicable (${audit?.scoreDisplayMode ?? 'missing'})`)
      failures.push(`${scenario.viewport} ${route.page} ${step.name} did not produce a numeric INP`)
      continue
    }
    console.log(`[Lighthouse interaction] ${scenario.viewport} ${route.page} ${step.name}: ${value.toFixed(0)} ms`)
    if (value > INP_BUDGET) failures.push(`${scenario.viewport} ${route.page} ${step.name} exceeded ${INP_BUDGET} ms: ${value}`)
  }

  await page.close()
  return failures
}

async function main() {
  const preview = startPreview()
  let browser
  const failures = []
  try {
    await waitForPreview(`${BASE_URL}/index.html`, preview)
    browser = await puppeteer.launch({
      executablePath: chromeExecutable(),
      headless: true,
      userDataDir: mkdtempSync(resolve(tmpdir(), 'yance-lighthouse-interactions-')),
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    })

    for (const scenario of scenarios) {
      for (const route of scenario.routes) {
        failures.push(...await runScenario(browser, scenario, route))
      }
    }
  } finally {
    await browser?.close()
    stopPreview(preview)
  }

  if (failures.length) {
    throw new Error(`Lighthouse interaction budget failed:\n${failures.join('\n')}`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

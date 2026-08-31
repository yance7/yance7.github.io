import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { clampScrollProgress, getScrollProgress } from '../src/utils/scrollProgress'

const root = process.cwd()
const scrollProgressComponent = resolve(root, 'src/components/ScrollProgress.vue')
const legacyPaths = [
  resolve(root, 'src/components', `${['Page', 'Com', 'pass'].join('')}.vue`),
  resolve(root, 'src/composables', `use${['Page', 'Com', 'pass'].join('')}.ts`),
  resolve(root, 'src/composables', `use${['Page', 'Com', 'pass'].join('')}Disclosure.ts`),
  resolve(root, 'src/utils', `${['page', 'com', 'pass'].join('')}.ts`)
]

function collectTextFiles(path: string): string[] {
  if (statSync(path).isFile()) return [readFileSync(path, 'utf8')]

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(path, entry.name)
    return entry.isDirectory() ? collectTextFiles(child) : [readFileSync(child, 'utf8')]
  })
}

describe('scroll progress helpers', () => {
  it('clamps values to the public progress range', () => {
    expect(clampScrollProgress(-1)).toBe(0)
    expect(clampScrollProgress(.4)).toBe(.4)
    expect(clampScrollProgress(2)).toBe(1)
  })

  it('calculates bounded progress for missing, negative, and oversized scroll ranges', () => {
    expect(getScrollProgress(0, 800, 800)).toBe(0)
    expect(getScrollProgress(-40, 1600, 800)).toBe(0)
    expect(getScrollProgress(400, 1600, 800)).toBe(.5)
    expect(getScrollProgress(1800, 1600, 800)).toBe(1)
    expect(getScrollProgress(Number.NaN, Number.POSITIVE_INFINITY, 800)).toBe(0)
  })
})

describe('scroll progress component contract', () => {
  it('exposes one localized, transform-driven progressbar', () => {
    expect(existsSync(scrollProgressComponent)).toBe(true)
    const component = readFileSync(scrollProgressComponent, 'utf8')

    expect(component).toContain('role="progressbar"')
    expect(component).toContain('messages.accessibility.readingProgress')
    expect(component).toContain(':aria-valuenow="percent"')
    expect(component).toContain('transform: `scaleX(${progress})`')
  })
})

describe('legacy navigator removal contract', () => {
  it('removes the old navigator implementation and vocabulary', () => {
    expect(legacyPaths.every((path) => !existsSync(path))).toBe(true)

    const sourcePaths = [
      resolve(root, 'src'),
      resolve(root, 'tests'),
      resolve(root, 'scripts'),
      resolve(root, '.github'),
      resolve(root, 'playwright.config.ts')
    ]
    const source = sourcePaths
      .filter((path) => existsSync(path))
      .flatMap(collectTextFiles)
      .join('\n')

    for (const marker of [
      ['Page', 'Com', 'pass'].join(''),
      ['page', 'com', 'pass'].join('-'),
      ['page', 'com', 'pass'].join(''),
      `messages.${['com', 'pass'].join('')}`,
      `has-${['page', 'com', 'pass'].join('-')}`
    ]) {
      expect(source).not.toContain(marker)
    }
  })
})

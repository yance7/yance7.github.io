import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { collectMaintainedSourceFiles } from './helpers/maintainedSourceFiles'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return { ...actual, existsSync: vi.fn(actual.existsSync), lstatSync: vi.fn(actual.lstatSync) }
})

const fixturePrefix = 'yance-maintained-source-'
const fixtures: string[] = []

function createFixture(initializeGit = true): string {
  const root = mkdtempSync(join(tmpdir(), fixturePrefix))
  fixtures.push(root)
  if (initializeGit) execFileSync('git', ['init', '--quiet', root], { stdio: 'pipe' })
  return root
}

function writeFixture(root: string, path: string, content = 'export const value = true\n') {
  const target = join(root, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
}

function track(root: string, path: string) {
  execFileSync('git', ['-C', root, 'add', '--', path], { stdio: 'pipe' })
}

function relativeFiles(root: string): string[] {
  return collectMaintainedSourceFiles(root)
    .map((path) => relative(root, path).split(sep).join('/'))
    .sort()
}

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    const target = resolve(fixture)
    if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith(fixturePrefix)) {
      throw new Error('Unexpected fixture cleanup path')
    }
    rmSync(target, { recursive: true, force: true })
  }
})

describe('maintained source collection', () => {
  it('includes tracked and new source while excluding ignored evidence and existing test exclusions', () => {
    const root = createFixture()
    writeFixture(root, '.gitignore', '.superpowers/\ntest-results/\ndist/\nnode_modules/\n')
    writeFixture(root, 'config/tracked.ts')
    track(root, 'config/tracked.ts')
    writeFixture(root, 'src/new.vue')
    writeFixture(root, 'scripts/new.mjs')
    writeFixture(root, 'package.json', '{}')
    writeFixture(root, '.superpowers/phase4/report.json', '{"evidence":true}')
    writeFixture(root, 'test-results/run/report.json', '{"result":"failed"}')
    writeFixture(root, 'dist/generated.js')
    writeFixture(root, 'node_modules/package/index.js')
    writeFixture(root, 'tests/fixture.ts')

    expect(relativeFiles(root)).toEqual(['config/tracked.ts', 'package.json', 'scripts/new.mjs', 'src/new.vue'])
  })

  it('keeps tracked source even when a later ignore rule matches it', () => {
    const root = createFixture()
    writeFixture(root, 'config/tracked.ts')
    track(root, 'config/tracked.ts')
    writeFixture(root, '.gitignore', 'config/\n')

    expect(relativeFiles(root)).toEqual(['config/tracked.ts'])
  })

  it('excludes tracked files deleted from the current working tree', () => {
    const root = createFixture()
    writeFixture(root, 'src/deleted.ts')
    track(root, 'src/deleted.ts')
    rmSync(join(root, 'src/deleted.ts'))

    expect(relativeFiles(root)).toEqual([])
  })

  it('preserves Unicode and spaces without duplicate tracked paths', () => {
    const root = createFixture()
    writeFixture(root, 'src/中文 file.ts')
    track(root, 'src/中文 file.ts')
    writeFixture(root, 'src/new file.tsx')

    expect(relativeFiles(root)).toEqual(['src/new file.tsx', 'src/中文 file.ts'])
  })

  it('does not follow a directory link outside the repository', () => {
    const root = createFixture()
    const outside = createFixture(false)
    writeFixture(outside, 'nested.ts')
    symlinkSync(outside, join(root, 'linked.ts'), 'junction')

    expect(relativeFiles(root)).toEqual([])
  })

  it('fails closed when Git cannot identify the repository', () => {
    const root = createFixture(false)
    writeFixture(root, 'src/new.ts')

    expect(() => collectMaintainedSourceFiles(root)).toThrow()
  })

  it('propagates filesystem access errors instead of treating inaccessible source as deleted', async () => {
    const root = createFixture()
    writeFixture(root, 'src/new.ts')
    const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
    const denied = Object.assign(new Error('Controlled metadata access failure'), { code: 'EACCES' })
    vi.mocked(existsSync).mockReturnValue(false)
    vi.mocked(lstatSync).mockImplementation(() => { throw denied })

    try {
      expect(() => collectMaintainedSourceFiles(root)).toThrow(denied)
    } finally {
      vi.mocked(existsSync).mockImplementation(actual.existsSync)
      vi.mocked(lstatSync).mockImplementation(actual.lstatSync)
    }
  })

  it.each([
    { path: 'config/tracked.ts', source: "process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = '1'", tracked: true },
    { path: 'config/new.ts', source: "export default { configLoader: 'runner' }", tracked: false }
  ])('keeps $path visible to the original warning prohibitions', ({ path, source, tracked }) => {
    const root = createFixture()
    writeFixture(root, path, source)
    if (tracked) track(root, path)
    const collected = collectMaintainedSourceFiles(root)
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n')

    expect(() => {
      expect(collected).not.toContain('VITE_CONFIG_NATIVE_IGNORE_WARNING')
      expect(collected).not.toMatch(/configLoader\s*:\s*['"][^'"]+['"]/
      )
    }).toThrow()
  })
})

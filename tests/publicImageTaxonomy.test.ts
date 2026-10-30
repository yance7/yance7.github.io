import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const assetRoot = resolve(process.cwd(), 'public/assets')
const repositoryRoot = resolve(process.cwd())
const sourceDirectories = ['.github', 'config', 'html-src', 'public', 'scripts', 'src', 'tests']
const sourceDocuments = ['README.md', 'docs/asset-rights.md', 'docs/concert-poster-sources.md']
const imageRoots = [
  'images/home-hero/',
  'images/concerts/originals/',
  'images/concerts/thumbs/',
  'images/case-studies/',
  'images/social/',
  'images/brand/'
]
const imageExtensions = new Set(['.avif', '.bmp', '.gif', '.ico', '.jpeg', '.jpg', '.png', '.svg', '.tif', '.tiff', '.webp'])
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.py', '.svg', '.ts', '.txt', '.vue', '.webmanifest', '.xml', '.yaml', '.yml'])

function listFiles(directory: string): string[] {
  if (!existsSync(directory)) return []

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

describe('public image taxonomy', () => {
  it('keeps every public image under its semantic image directory', () => {
    const imagePaths = listFiles(assetRoot)
      .filter((path) => imageExtensions.has(path.slice(path.lastIndexOf('.')).toLowerCase()))
      .map((path) => relative(assetRoot, path).split(sep).join('/'))

    const misplacedImages = imagePaths.filter((path) => !imageRoots.some((root) => path.startsWith(root)))
    const missingImageRoots = imageRoots.filter((root) => !imagePaths.some((path) => path.startsWith(root)))

    expect(imagePaths.length).toBeGreaterThan(0)
    expect(misplacedImages).toEqual([])
    expect(missingImageRoots).toEqual([])
  })

  it('removes legacy public image URL prefixes from source and published documentation', () => {
    const sourceFiles = [
      ...sourceDirectories.flatMap((directory) => listFiles(resolve(repositoryRoot, directory))),
      ...sourceDocuments.map((document) => resolve(repositoryRoot, document))
    ].filter((path) => textExtensions.has(path.slice(path.lastIndexOf('.')).toLowerCase()))
    const legacySegments = ['home-hero/', 'concerts/', 'brand/', 'case/', 'og-']

    for (const path of sourceFiles) {
      const source = readFileSync(path, 'utf8').replace(/\\\//g, '/')
      for (const segment of legacySegments) {
        expect(source.includes(`/assets/${segment}`), `${relative(repositoryRoot, path)} must not use the legacy image prefix`).toBe(false)
      }
    }
  })

  it('keeps every image generator aligned with the published directories', () => {
    const contracts = [
      ['scripts/generate-home-hero-images.py', ["OUTPUT_DIR = ROOT / 'public' / 'assets' / 'images' / 'home-hero'", "f'/assets/images/home-hero/{filename}'"]],
      ['scripts/generate-concert-thumbnails.py', ["IMAGE_ROOT = ROOT / 'public' / 'assets' / 'images'", "SOURCE_DIR = IMAGE_ROOT / 'concerts' / 'originals'", "OUTPUT_DIR = IMAGE_ROOT / 'concerts' / 'thumbs'"]],
      ['scripts/process-concert-poster.py', ["DEFAULT_OUTPUT_DIR = ROOT / 'public' / 'assets' / 'images' / 'concerts' / 'originals'"]],
      ['scripts/generate-brand-assets.py', ["OUTPUT = ROOT / 'public' / 'assets' / 'images' / 'brand'"]],
      ['scripts/render-og-card.py', ["ASSET_ROOT = ROOT / 'public' / 'assets' / 'images'", "output = ASSET_ROOT / 'social' / f'og-{slug}.png'", "image='case-studies/fresheye-og-cover.png'"]]
    ] as const

    for (const [path, expected] of contracts) {
      const source = readFileSync(resolve(process.cwd(), path), 'utf8')
      for (const snippet of expected) expect(source).toContain(snippet)
    }
  })
})

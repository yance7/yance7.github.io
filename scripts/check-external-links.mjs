import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const scanRoots = ['src', 'html-src']
const extensions = new Set(['.html', '.js', '.mjs', '.ts', '.vue'])
const urlPattern = /https?:\/\/[^\s"'`<>)}\]]+/g
const timeoutMs = 15000

async function listFiles(directory) {
  const entries = await readdir(join(root, directory), { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await listFiles(path))
    else if (extensions.has(extname(entry.name))) files.push(path)
  }
  return files
}

function normalizeUrl(url) {
  return url.replace(/[.,;:!?]+$/g, '')
}

function shouldCheck(url) {
  const parsed = new URL(url)
  if (parsed.hostname === 'schema.org') return false
  return true
}

const files = (await Promise.all(scanRoots.map(listFiles))).flat()
const sources = await Promise.all(files.map(async (path) => ({
  path,
  text: await readFile(join(root, path), 'utf8')
})))
const references = new Map()
for (const { path, text } of sources) {
  for (const match of text.matchAll(urlPattern)) {
    const url = normalizeUrl(match[0])
    if (shouldCheck(url) && !references.has(url)) references.set(url, path)
  }
}

async function checkUrl(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal })
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal })
    }
    return response
  } finally {
    clearTimeout(timeout)
  }
}

const failures = []
for (const [url, source] of references) {
  try {
    const response = await checkUrl(url)
    if (!response.ok && ![301, 302, 303, 307, 308].includes(response.status)) {
      failures.push(`${url} → HTTP ${response.status}`)
      console.warn(`::warning file=${relative(root, source)}::External link returned HTTP ${response.status}: ${url}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push(`${url} → ${message}`)
    console.warn(`::warning file=${relative(root, source)}::External link check failed: ${url} (${message})`)
  }
}

console.log(`external-links: checked ${references.size} unique URLs`)
if (failures.length) {
  console.warn(`external-links: ${failures.length} URL(s) need attention`)
  process.exitCode = 1
}

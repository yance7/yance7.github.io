import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

export const requiredIgnoreEntries = [
  '.superpowers/',
  'docs/superpowers/',
  'docs/handoff/'
] as const

export const forbiddenTrackedPrefixes = requiredIgnoreEntries

const readmeRules = [
  {
    label: 'internal collaboration term',
    pattern: /\b(?:agent|codex|superpowers)\b/i
  },
  {
    label: 'internal prompt reference',
    pattern: /(?:internal\s+prompt|内部提示词)/i
  },
  {
    label: 'local absolute path',
    pattern: /(?:\b[A-Za-z]:[\\/]|\/(?:Users|home|tmp|workspace)\/|\\\\(?:Users|home)\\)/i
  },
  {
    label: 'temporary run id',
    pattern: /(?:\/actions\/runs\/\d+\b|\b(?:temporary|temp(?:orary)?)[ -]?run[ -]?id\b|\b(?:run|job)[ -]?id\s*[:=]\s*\w+)/i
  }
] as const

export interface RepositoryHygieneReport {
  trackedFiles: string[]
  forbiddenTrackedFiles: string[]
  missingIgnoreEntries: string[]
  readmeViolations: string[]
}

export function listTrackedFiles(root = repositoryRoot) {
  const output = execFileSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8' })
  return output.split('\0').filter(Boolean)
}

export function findForbiddenTrackedFiles(paths: readonly string[]) {
  return paths.filter((path) => forbiddenTrackedPrefixes.some((prefix) => (
    path === prefix.slice(0, -1) || path.startsWith(prefix)
  )))
}

export function findMissingIgnoreEntries(contents: string) {
  const entries = new Set(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
  )
  return requiredIgnoreEntries.filter((entry) => !entries.has(entry))
}

export function findReadmeViolations(contents: string) {
  return readmeRules
    .filter(({ pattern }) => pattern.test(contents))
    .map(({ label }) => label)
}

export function auditRepository(root = repositoryRoot): RepositoryHygieneReport {
  const trackedFiles = listTrackedFiles(root)
  const gitignore = readFileSync(join(root, '.gitignore'), 'utf8')
  const readme = readFileSync(join(root, 'README.md'), 'utf8')

  return {
    trackedFiles,
    forbiddenTrackedFiles: findForbiddenTrackedFiles(trackedFiles),
    missingIgnoreEntries: findMissingIgnoreEntries(gitignore),
    readmeViolations: findReadmeViolations(readme)
  }
}

function printReport(report: RepositoryHygieneReport) {
  console.log(`repository-hygiene: tracked=${report.trackedFiles.length}`)
  console.log(`repository-hygiene: forbidden-tracked=${report.forbiddenTrackedFiles.length}`)
  console.log(`repository-hygiene: missing-ignore=${report.missingIgnoreEntries.length}`)
  console.log(`repository-hygiene: readme-violations=${report.readmeViolations.length}`)

  for (const path of report.forbiddenTrackedFiles) console.error(`Forbidden tracked path: ${path}`)
  for (const entry of report.missingIgnoreEntries) console.error(`Missing ignore entry: ${entry}`)
  for (const violation of report.readmeViolations) console.error(`README violation: ${violation}`)
}

const invokedFile = process.argv[1] ? resolve(process.argv[1]) : ''
const currentFile = resolve(fileURLToPath(import.meta.url))
if (invokedFile.toLowerCase() === currentFile.toLowerCase()) {
  const report = auditRepository()
  printReport(report)
  if (report.forbiddenTrackedFiles.length || report.missingIgnoreEntries.length || report.readmeViolations.length) {
    process.exitCode = 1
  }
}

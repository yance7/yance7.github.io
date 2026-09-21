import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  auditRepository,
  findForbiddenTrackedFiles,
  findMissingIgnoreEntries,
  findReadmeViolations,
  forbiddenTrackedPrefixes,
  requiredIgnoreEntries
} from '../scripts/check-repository-hygiene'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

describe('repository hygiene', () => {
  it('keeps internal collaboration paths out of the tracked public tree', () => {
    const report = auditRepository()

    expect(forbiddenTrackedPrefixes).toEqual(['.superpowers/', 'docs/superpowers/', 'docs/handoff/'])
    expect(report.forbiddenTrackedFiles).toEqual([])
    expect(report.missingIgnoreEntries).toEqual([])
    expect(report.readmeViolations).toEqual([])
  })

  it('detects forbidden tracked paths and missing ignore rules', () => {
    expect(findForbiddenTrackedFiles([
      'src/main.ts',
      '.superpowers/notes.md',
      'docs/superpowers/plan.md',
      'docs/handoff/status.md'
    ])).toEqual([
      '.superpowers/notes.md',
      'docs/superpowers/plan.md',
      'docs/handoff/status.md'
    ])
    expect(findMissingIgnoreEntries('.superpowers/\ndocs/superpowers/\n')).toEqual(['docs/handoff/'])
    expect(requiredIgnoreEntries).toHaveLength(3)
  })

  it('detects internal terms, local paths, and temporary run identifiers in README text', () => {
    const violations = findReadmeViolations([
      'Codex agent notes',
      '内部提示词',
      'Y:\\Personal Website',
      'https://github.com/example/site/actions/runs/123'
    ].join('\n'))

    expect(violations).toEqual([
      'internal collaboration term',
      'internal prompt reference',
      'local absolute path',
      'temporary run id'
    ])
  })

  it('documents the actual source tree and declares the repository line-ending policy', () => {
    const readme = readFileSync(resolve(repositoryRoot, 'README.md'), 'utf8')
    const attributesPath = resolve(repositoryRoot, '.gitattributes')

    expect(existsSync(attributesPath)).toBe(true)
    expect(readme).toContain('src/directives/')
    expect(readme).toContain('src/data/locales/')
    expect(readme).toContain('src/i18n/')

    const attributes = readFileSync(attributesPath, 'utf8')
    expect(attributes).toContain('* text=auto eol=lf')
    expect(attributes).toContain('*.png binary')
    expect(attributes).toContain('*.jpg binary')
    expect(attributes).toContain('*.woff2 binary')
    expect(attributes).toContain('*.pdf binary')
  })
})

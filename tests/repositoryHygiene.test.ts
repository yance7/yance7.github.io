import { describe, expect, it } from 'vitest'
import {
  auditRepository,
  findForbiddenTrackedFiles,
  findMissingIgnoreEntries,
  findReadmeViolations,
  forbiddenTrackedPrefixes,
  requiredIgnoreEntries
} from '../scripts/check-repository-hygiene'

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
})

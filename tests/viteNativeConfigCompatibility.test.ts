import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

type ImportViolation = {
  file: string
  reason: 'directory index import' | 'extensionless import' | 'unresolved relative import'
  specifier: string
}

type ImportResolution = {
  file: string | null
  violation: ImportViolation | null
}

const root = process.cwd()

function collectTypeScriptFiles(directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'dist' || entry.name === 'node_modules' || entry.name === 'tests') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectTypeScriptFiles(path))
    } else if (entry.isFile() && ['.js', '.json', '.mjs', '.ts', '.tsx', '.vue'].includes(extname(entry.name))) {
      files.push(path)
    }
  }
  return files
}

function collectRelativeImports(source: string): string[] {
  const imports = new Set<string>()
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'"\n;]*?\sfrom\s+)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1]
      if (specifier?.startsWith('./') || specifier?.startsWith('../')) imports.add(specifier)
    }
  }
  return [...imports]
}

function resolveTypeScriptImport(file: string, specifier: string): ImportResolution {
  const target = resolve(dirname(file), specifier)
  if (target.endsWith('.ts') && existsSync(target)) return { file: target, violation: null }

  const extensionlessFile = `${target}.ts`
  if (existsSync(extensionlessFile)) {
    return {
      file: extensionlessFile,
      violation: {
        file: relative(root, file),
        reason: 'extensionless import',
        specifier
      }
    }
  }

  const directoryIndex = join(target, 'index.ts')
  if (existsSync(directoryIndex)) {
    return {
      file: directoryIndex,
      violation: {
        file: relative(root, file),
        reason: 'directory index import',
        specifier
      }
    }
  }

  return {
    file: null,
    violation: {
      file: relative(root, file),
      reason: 'unresolved relative import',
      specifier
    }
  }
}

function findConfigDependencyViolations(): ImportViolation[] {
  const entry = resolve(root, 'vite.config.ts')
  const queue = [entry]
  const visited = new Set<string>()
  const violations: ImportViolation[] = []

  while (queue.length > 0) {
    const file = queue.shift()
    if (!file || visited.has(file)) continue
    visited.add(file)

    for (const specifier of collectRelativeImports(readFileSync(file, 'utf8'))) {
      const resolved = resolveTypeScriptImport(file, specifier)
      if (resolved.violation) violations.push(resolved.violation)
      if (resolved.file) queue.push(resolved.file)
    }
  }

  return violations
}

describe('Vite native config compatibility', () => {
  it('recursively requires explicit TypeScript import paths from vite.config.ts', () => {
    const violations = findConfigDependencyViolations()
    const details = violations.map(({ file, reason, specifier }) => `${file}: ${specifier} (${reason})`).join('\n')

    expect(violations, details).toEqual([])
  })

  it('does not suppress Vite native loader warnings through configuration', () => {
    const source = collectTypeScriptFiles(root)
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n')

    expect(source).not.toContain('VITE_CONFIG_NATIVE_IGNORE_WARNING')
    expect(source).not.toMatch(/configLoader\s*:\s*['"][^'"]+['"]/
    )
  })

  it('loads the Vite config through Node native TypeScript support', () => {
    expect(() => execFileSync(
      process.execPath,
      ['--experimental-strip-types', '--input-type=module', '-e', "await import('./vite.config.ts')"],
      { cwd: root, stdio: 'pipe' }
    )).not.toThrow()
  })
})

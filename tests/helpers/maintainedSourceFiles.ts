import { execFileSync } from 'node:child_process'
import { lstatSync, type Stats } from 'node:fs'
import { extname, join } from 'node:path'

export function collectMaintainedSourceFiles(directory: string): string[] {
  // Include new maintenance files, but leave ignored evidence and caches outside this source contract.
  const output = execFileSync('git', ['-C', directory, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    encoding: 'utf8',
    stdio: 'pipe'
  })
  const excluded = new Set(['.git', 'dist', 'node_modules', 'tests'])
  const extensions = new Set(['.js', '.json', '.mjs', '.ts', '.tsx', '.vue'])

  return [...new Set(output.split('\0').filter(Boolean))]
    .filter((path) => !path.split('/').some((part) => excluded.has(part)) && extensions.has(extname(path)))
    .filter((relativePath) => {
      const parts = relativePath.split('/')
      let path = directory
      for (const [index, part] of parts.entries()) {
        path = join(path, part)
        let entry: Stats
        try {
          entry = lstatSync(path)
        } catch (error) {
          if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return false
          throw error
        }
        // Git on Windows can enumerate junction descendants; preserve the original no-link traversal.
        if (entry.isSymbolicLink()) return false
        if (index === parts.length - 1) return entry.isFile()
        if (!entry.isDirectory()) return false
      }
      return false
    })
    .map((path) => join(directory, path))
}

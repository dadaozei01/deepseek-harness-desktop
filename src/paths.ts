import { existsSync } from 'node:fs'
import { join } from 'node:path'

const DSH_ENTRY_SEGMENTS = ['node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'] as const

export function resolveDshCliEntry(appPath: string, resourcesPath: string, packaged: boolean): string {
  const candidates = packaged
    ? [join(resourcesPath, 'app.asar.unpacked', ...DSH_ENTRY_SEGMENTS)]
    : [join(appPath, ...DSH_ENTRY_SEGMENTS)]
  const found = candidates.find(candidate => existsSync(candidate))
  if (found === undefined) {
    throw new Error(`Unable to locate dsh CLI; checked: ${candidates.join(', ')}`)
  }
  return found
}

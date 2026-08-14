import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveDshCliEntry } from '../src/paths.js'

const temporaryDirectories: string[] = []

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-desktop-paths-'))
  temporaryDirectories.push(directory)
  return directory
}

async function createCliEntry(root: string): Promise<string> {
  const entry = join(root, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
  await mkdir(join(entry, '..'), { recursive: true })
  await writeFile(entry, 'export {}\n')
  return entry
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

describe('resolveDshCliEntry', () => {
  it('resolves the development dependency tree', async () => {
    const appPath = await temporaryDirectory()
    const expected = await createCliEntry(appPath)

    expect(resolveDshCliEntry(appPath, 'unused', false)).toBe(expected)
  })

  it('resolves the unpacked dependency tree in packaged applications', async () => {
    const resourcesPath = await temporaryDirectory()
    const unpackedRoot = join(resourcesPath, 'app.asar.unpacked')
    const expected = await createCliEntry(unpackedRoot)

    expect(resolveDshCliEntry('unused', resourcesPath, true)).toBe(expected)
  })

  it('reports every checked path when the CLI is missing', async () => {
    const appPath = await temporaryDirectory()
    const resourcesPath = await temporaryDirectory()

    expect(() => resolveDshCliEntry(appPath, resourcesPath, false)).toThrow(
      join(appPath, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
    )
  })
})

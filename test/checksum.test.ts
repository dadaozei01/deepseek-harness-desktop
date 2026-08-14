import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { writeChecksums } from '../scripts/checksum.mjs'

const temporaryDirectories: string[] = []

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-checksum-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

describe('writeChecksums', () => {
  it('writes deterministic lowercase SHA-256 lines sorted by basename', async () => {
    const directory = await temporaryDirectory()
    const first = join(directory, 'first.bin')
    const second = join(directory, 'second.bin')
    const destination = join(directory, 'SHA256SUMS.txt')
    await writeFile(first, 'first')
    await writeFile(second, 'second')

    await writeChecksums([second, first], destination)

    const lines = (await readFile(destination, 'utf8')).trim().split('\n')
    expect(lines.map(line => line.slice(66))).toEqual(['first.bin', 'second.bin'])
    expect(lines.every(line => /^[a-f0-9]{64}  [^/\\]+$/u.test(line))).toBe(true)
  })

  it('rejects duplicate basenames and missing files', async () => {
    const directory = await temporaryDirectory()
    const left = join(directory, 'left', 'asset.bin')
    const right = join(directory, 'right', 'asset.bin')
    await mkdir(join(directory, 'left'), { recursive: true })
    await mkdir(join(directory, 'right'), { recursive: true })
    await writeFile(left, 'left')
    await writeFile(right, 'right')

    await expect(writeChecksums([left, right], join(directory, 'duplicates.txt'))).rejects.toThrow('Duplicate filename')
    await expect(writeChecksums([join(directory, 'missing.bin')], join(directory, 'missing.txt'))).rejects.toThrow()
  })
})

import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'

interface Workflow {
  on?: Record<string, unknown>
  permissions?: Record<string, string>
  jobs?: Record<string, {
    permissions?: Record<string, string>
    strategy?: { matrix?: { include?: Array<Record<string, string>> } }
    steps?: Array<Record<string, unknown>>
  }>
}

async function workflow(path: string): Promise<Workflow> {
  return parse(await readFile(path, 'utf8')) as Workflow
}

describe('GitHub Actions workflows', () => {
  it('builds each supported native architecture with read-only CI permissions', async () => {
    const ci = await workflow('.github/workflows/ci.yml')
    const matrix = ci.jobs?.build?.strategy?.matrix?.include ?? []

    expect(ci.permissions).toEqual({ contents: 'read' })
    expect(matrix.map(entry => [entry.runner, entry.arch, entry.command])).toEqual([
      ['windows-latest', 'x64', 'pnpm run dist:win'],
      ['macos-15', 'arm64', 'pnpm run dist:mac:arm64'],
      ['macos-15-intel', 'x64', 'pnpm run dist:mac:x64'],
    ])
  })

  it('publishes only version tags and grants write access only to the release job', async () => {
    const releaseText = await readFile('.github/workflows/release.yml', 'utf8')
    const release = parse(releaseText) as Workflow
    const matrix = release.jobs?.build?.strategy?.matrix?.include ?? []
    const publishSteps = release.jobs?.release?.steps ?? []

    expect(release.on?.push).toMatchObject({ tags: ['v*'] })
    expect(release.permissions).toEqual({ contents: 'read' })
    expect(release.jobs?.release?.permissions).toEqual({ contents: 'write' })
    expect(matrix.map(entry => entry.runner)).toEqual(['windows-latest', 'macos-15', 'macos-15-intel'])
    expect(JSON.stringify(publishSteps)).toContain('scripts/checksum.mjs')
    expect(JSON.stringify(publishSteps)).toContain('softprops/action-gh-release')
    expect(releaseText).not.toMatch(/secrets\.(?!GITHUB_TOKEN)/u)
  })
})

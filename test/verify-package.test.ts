import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { verifyPackage } from '../scripts/verify-package.mjs'

const temporaryDirectories: string[] = []
const runtimePeers = [
  '@deepseek-ai/dsh-anonymous-user-id',
  '@deepseek-ai/dsh-atomic-write',
  '@deepseek-ai/dsh-fs',
  '@deepseek-ai/dsh-output-retention',
  '@deepseek-ai/dsh-sandbox',
  '@deepseek-ai/dsh-scope',
  '@deepseek-ai/dsh-session-telemetry',
  '@deepseek-ai/dsh-session-title-llm',
  '@deepseek-ai/dsh-shell',
  '@deepseek-ai/dsh-spill',
  '@deepseek-ai/dsh-subagent-in-process-driver',
  '@deepseek-ai/dsh-subprocess',
  '@deepseek-ai/dsh-timeout',
]

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-package-'))
  temporaryDirectories.push(root)
  const required = [
    'resources/app.asar.unpacked/node_modules/@deepseek-ai/dsh/lib/bin.js',
    'resources/app.asar.unpacked/node_modules/@deepseek-ai/cordis-plugin-group/package.json',
    'resources/app.asar.unpacked/node_modules/@deepseek-ai/dsh-web-frontend/package.json',
    'resources/app.asar.unpacked/node_modules/node-pty/build/Release/pty.node',
    'DeepSeek Harness Desktop.exe',
    ...runtimePeers.map(dependency => `resources/app.asar.unpacked/node_modules/${dependency}/package.json`),
  ]
  await Promise.all(required.map(async relative => {
    const target = join(root, relative)
    await mkdir(join(target, '..'), { recursive: true })
    await writeFile(target, 'safe fixture')
  }))
  return root
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('verifyPackage', () => {
  it('accepts a self-contained unpacked application', async () => {
    await expect(verifyPackage(await fixture())).resolves.toBeUndefined()
  })

  it('rejects missing runtime components', async () => {
    const root = await fixture()
    await rm(join(root, 'resources/app.asar.unpacked/node_modules/@deepseek-ai/dsh/lib/bin.js'))

    await expect(verifyPackage(root)).rejects.toThrow('Missing packaged dsh CLI')
  })

  it('rejects a package missing the Cordis group plugin required at runtime', async () => {
    const root = await fixture()
    await rm(join(root, 'resources/app.asar.unpacked/node_modules/@deepseek-ai/cordis-plugin-group/package.json'))

    await expect(verifyPackage(root)).rejects.toThrow('Missing packaged Cordis group plugin')
  })

  it('rejects a package missing an upstream runtime peer', async () => {
    const root = await fixture()
    await rm(join(root, 'resources/app.asar.unpacked/node_modules/@deepseek-ai/dsh-timeout/package.json'))

    await expect(verifyPackage(root)).rejects.toThrow('Missing packaged runtime peer: @deepseek-ai/dsh-timeout')
  })

  it('rejects development files and credential-shaped text', async () => {
    const root = await fixture()
    await mkdir(join(root, '.git'))
    await writeFile(join(root, 'unsafe.txt'), 'OPENAI_API_KEY=sk-example-secret')

    await expect(verifyPackage(root)).rejects.toThrow(/Forbidden packaged path|Credential-shaped content/)
  })
})

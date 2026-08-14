import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'

interface BuilderConfig {
  appId?: string
  productName?: string
  asar?: boolean
  asarUnpack?: string[]
  files?: string[]
  win?: { icon?: string; target?: Array<{ target: string; arch: string[] }> }
  mac?: { icon?: string; identity?: string | null; target?: Array<{ target: string; arch: string[] }> }
  nsis?: { perMachine?: boolean; oneClick?: boolean }
}

describe('electron-builder configuration', () => {
  it('passes architecture as a flag instead of a Windows target name', async () => {
    const manifest = JSON.parse(await readFile('package.json', 'utf8')) as {
      author?: string
      homepage?: string
      license?: string
      repository?: { type?: string; url?: string }
      dependencies?: Record<string, string>
      scripts?: Record<string, string>
    }

    expect(manifest.author).toBe('dadaozei01')
    expect(manifest.license).toBe('MIT')
    expect(manifest.homepage).toBe('https://github.com/dadaozei01/deepseek-harness-desktop')
    expect(manifest.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/dadaozei01/deepseek-harness-desktop.git',
    })
    expect(manifest.dependencies?.['@deepseek-ai/cordis-plugin-group']).toBe('1.0.1')
    expect(manifest.scripts?.['pack:dir']).toContain('--dir --win --x64')
    expect(manifest.scripts?.['pack:dir']).not.toContain('--win x64')
  })

  it('promotes upstream runtime peers so electron-builder retains them', async () => {
    const manifest = JSON.parse(await readFile('package.json', 'utf8')) as {
      dependencies?: Record<string, string>
    }
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

    for (const dependency of runtimePeers) {
      expect(manifest.dependencies?.[dependency], dependency).toBe('0.1.0-rc.6')
    }
  })

  it('defines self-contained Windows and macOS targets', async () => {
    const config = parse(await readFile('electron-builder.yml', 'utf8')) as BuilderConfig

    expect(config.appId).toBe('com.dadaozei01.deepseekharnessdesktop')
    expect(config.productName).toBe('DeepSeek Harness Desktop')
    expect(config.asar).toBe(true)
    expect(config.asarUnpack).toContain('node_modules/**')
    expect(config.files).toContain('node_modules/**')
    expect(config.win?.target).toEqual([{ target: 'nsis', arch: ['x64'] }])
    expect(config.mac?.target).toEqual([{ target: 'dmg', arch: ['arm64', 'x64'] }])
    expect(config.mac?.identity).toBeNull()
    expect(config.nsis).toMatchObject({ perMachine: false, oneClick: false })
  })

  it('uses the supplied DeepSeek logo assets', async () => {
    const config = parse(await readFile('electron-builder.yml', 'utf8')) as BuilderConfig

    expect(config.win?.icon).toBe('build/icon.ico')
    expect(config.mac?.icon).toBe('build/icon.png')
  })
})

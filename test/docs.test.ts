import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const upstream = 'https://github.com/deepseek-ai/deepseek-harness'

describe('user and maintainer documentation', () => {
  it('documents the unofficial wrapper, pinned Harness version, and local data', async () => {
    for (const readme of ['README.md', 'README.zh-CN.md']) {
      const text = await readFile(readme, 'utf8')
      expect(text).toContain(upstream)
      expect(text).toContain('0.1.0-rc.6')
      expect(text).toContain('.dsh')
      expect(text).toMatch(/unofficial|非官方/iu)
      expect(text).not.toMatch(/officially endorsed|官方授权/iu)
    }
  })

  it('names every installer and gives safe unsigned-app guidance', async () => {
    const windows = await readFile('docs/INSTALL_WINDOWS.md', 'utf8')
    const macos = await readFile('docs/INSTALL_MACOS.md', 'utf8')

    expect(windows).toContain('DeepSeek-Harness-Desktop-0.1.0-Windows-x64.exe')
    expect(windows).toContain('SmartScreen')
    expect(macos).toContain('DeepSeek-Harness-Desktop-0.1.0-macOS-arm64.dmg')
    expect(macos).toContain('DeepSeek-Harness-Desktop-0.1.0-macOS-x64.dmg')
    expect(macos).toMatch(/right-click|右键/iu)
    expect(macos).not.toContain('xattr -dr')
  })

  it('includes licensing, security, and release-maintainer policies', async () => {
    expect(await readFile('LICENSE', 'utf8')).toContain('MIT License')
    expect(await readFile('THIRD_PARTY_NOTICES.md', 'utf8')).toContain(upstream)
    expect(await readFile('SECURITY.md', 'utf8')).toContain('/security/advisories/new')
    const releasing = await readFile('docs/RELEASING.md', 'utf8')
    expect(releasing).toContain('pnpm test')
    expect(releasing).toContain('v0.1.0')
    expect(releasing).toContain('SHA256SUMS.txt')
  })
})

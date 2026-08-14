import { describe, expect, it } from 'vitest'
import { browserWindowOptions, isAllowedLocalNavigation, isExternalHttpUrl } from '../src/window.js'

describe('browserWindowOptions', () => {
  it('keeps the renderer isolated from Node.js', () => {
    expect(browserWindowOptions().webPreferences).toEqual({
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    })
  })

  it('starts hidden until the local page is ready', () => {
    expect(browserWindowOptions()).toMatchObject({
      show: false,
      autoHideMenuBar: true,
      minWidth: 800,
      minHeight: 600,
    })
  })
})

describe('navigation policy', () => {
  const origin = 'http://127.0.0.1:3080'

  it('allows only the active local origin inside the app', () => {
    expect(isAllowedLocalNavigation(`${origin}/sessions/1`, origin)).toBe(true)
    expect(isAllowedLocalNavigation('http://127.0.0.1:3081/', origin)).toBe(false)
    expect(isAllowedLocalNavigation('https://example.com/', origin)).toBe(false)
  })

  it('rejects non-HTTP navigation', () => {
    expect(isAllowedLocalNavigation('file:///tmp/a', origin)).toBe(false)
    expect(isAllowedLocalNavigation('javascript:alert(1)', origin)).toBe(false)
    expect(isExternalHttpUrl('javascript:alert(1)')).toBe(false)
  })

  it('classifies external HTTP links for the system browser', () => {
    expect(isExternalHttpUrl('https://github.com/deepseek-ai/deepseek-harness')).toBe(true)
    expect(isExternalHttpUrl('http://example.com/docs')).toBe(true)
  })
})

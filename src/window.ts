import type { BrowserWindowConstructorOptions } from 'electron'

export function browserWindowOptions(): BrowserWindowConstructorOptions {
  return {
    width: 1_400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'DeepSeek Harness Desktop',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  }
}

export function isAllowedLocalNavigation(url: string, expectedOrigin: string): boolean {
  try {
    const target = new URL(url)
    return (target.protocol === 'http:' || target.protocol === 'https:') && target.origin === expectedOrigin
  } catch {
    return false
  }
}

export function isExternalHttpUrl(url: string): boolean {
  try {
    const target = new URL(url)
    return target.protocol === 'http:' || target.protocol === 'https:'
  } catch {
    return false
  }
}

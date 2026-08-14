import { app, BrowserWindow, dialog, shell } from 'electron'
import { startHarnessProcess, type HarnessHandle } from './harness-process.js'
import { resolveDshCliEntry } from './paths.js'
import { findFreeLoopbackPort } from './port.js'
import { browserWindowOptions, isAllowedLocalNavigation, isExternalHttpUrl } from './window.js'

const LOOPBACK_HOST = '127.0.0.1'
const FIRST_PORT = 3_080
const LAST_PORT = 3_100
const STARTUP_TIMEOUT_MS = 120_000

let harness: HarnessHandle | undefined
let mainWindow: BrowserWindow | undefined
let quitting = false
let shutdownStarted = false

function createWindow(url: string): BrowserWindow {
  const expectedOrigin = new URL(url).origin
  const window = new BrowserWindow(browserWindowOptions())

  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (isAllowedLocalNavigation(targetUrl, expectedOrigin)) return
    event.preventDefault()
    if (isExternalHttpUrl(targetUrl)) void shell.openExternal(targetUrl)
  })

  window.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (isExternalHttpUrl(targetUrl) && !isAllowedLocalNavigation(targetUrl, expectedOrigin)) {
      void shell.openExternal(targetUrl)
    }
    return { action: 'deny' }
  })

  window.once('ready-to-show', () => window.show())
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = undefined
  })
  void window.loadURL(url)
  return window
}

async function bootstrap(): Promise<void> {
  const port = await findFreeLoopbackPort(FIRST_PORT, LAST_PORT)
  const cliEntry = resolveDshCliEntry(app.getAppPath(), process.resourcesPath, app.isPackaged)
  harness = await startHarnessProcess({
    executable: process.execPath,
    cliEntry,
    cwd: process.cwd(),
    host: LOOPBACK_HOST,
    port,
    timeoutMs: STARTUP_TIMEOUT_MS,
  })

  harness.child.once('exit', code => {
    if (quitting) return
    dialog.showErrorBox('DeepSeek Harness 已停止', `后台服务意外退出（代码 ${String(code)}）。`)
    app.quit()
  })
  mainWindow = createWindow(harness.url)
}

app.on('activate', () => {
  if (mainWindow === undefined && harness !== undefined) mainWindow = createWindow(harness.url)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', event => {
  quitting = true
  if (harness === undefined || shutdownStarted) return
  event.preventDefault()
  shutdownStarted = true
  void harness.stop().finally(() => app.exit(0))
})

void app.whenReady().then(bootstrap).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  dialog.showErrorBox('DeepSeek Harness 启动失败', message)
  app.exit(1)
})

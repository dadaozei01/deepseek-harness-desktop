import { spawn, spawnSync, type ChildProcess } from 'node:child_process'

const DIAGNOSTIC_LIMIT = 8_192
const POLL_INTERVAL_MS = 50
const STOP_TIMEOUT_MS = 2_000

export interface HarnessProcessOptions {
  executable: string
  cliEntry: string
  cwd: string
  host: string
  port: number
  timeoutMs: number
  env?: NodeJS.ProcessEnv
}

export interface HarnessHandle {
  url: string
  child: ChildProcess
  stop(): Promise<void>
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function appendBounded(current: string, chunk: unknown): string {
  const next = current + String(chunk)
  return next.length <= DIAGNOSTIC_LIMIT ? next : next.slice(-DIAGNOSTIC_LIMIT)
}

async function waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (child.exitCode !== null || child.signalCode !== null) return true

  return await new Promise<boolean>(resolve => {
    const timer = setTimeout(() => {
      child.off('exit', onExit)
      resolve(false)
    }, timeoutMs)
    const onExit = (): void => {
      clearTimeout(timer)
      resolve(true)
    }
    child.once('exit', onExit)
  })
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return

  if (process.platform !== 'win32' && child.pid !== undefined) {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      child.kill('SIGTERM')
    }
  } else {
    child.kill('SIGTERM')
  }

  if (await waitForExit(child, STOP_TIMEOUT_MS)) return

  if (process.platform === 'win32' && child.pid !== undefined) {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  } else if (child.pid !== undefined) {
    try {
      process.kill(-child.pid, 'SIGKILL')
    } catch {
      child.kill('SIGKILL')
    }
  }
  await waitForExit(child, STOP_TIMEOUT_MS)
}

export async function startHarnessProcess(options: HarnessProcessOptions): Promise<HarnessHandle> {
  const url = `http://${options.host}:${options.port}`
  let diagnostics = ''
  let stopped = false

  const child = spawn(options.executable, [
    options.cliEntry,
    '--profile', 'web',
    '--host', options.host,
    '--port', String(options.port),
  ], {
    cwd: options.cwd,
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      ...options.env,
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout?.on('data', chunk => {
    diagnostics = appendBounded(diagnostics, chunk)
  })
  child.stderr?.on('data', chunk => {
    diagnostics = appendBounded(diagnostics, chunk)
  })

  const stop = async (): Promise<void> => {
    if (stopped) return
    stopped = true
    await stopChild(child)
  }

  const deadline = Date.now() + options.timeoutMs
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      const code = child.exitCode === null ? child.signalCode : String(child.exitCode)
      const detail = diagnostics.trim()
      throw new Error(`DeepSeek Harness exited before readiness (code ${code})${detail === '' ? '' : `\n${detail}`}`)
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) })
      if (response.status < 500) {
        return { url, child, stop }
      }
    } catch {
      // The local service has not started accepting requests yet.
    }
    await delay(POLL_INTERVAL_MS)
  }

  await stop()
  throw new Error(`DeepSeek Harness did not become ready at ${url}`)
}

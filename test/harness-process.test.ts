import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { startHarnessProcess, type HarnessHandle, type HarnessProcessOptions } from '../src/harness-process.js'
import { findFreeLoopbackPort } from '../src/port.js'

const fixture = fileURLToPath(new URL('./fixtures/fake-harness.mjs', import.meta.url))
const handles: HarnessHandle[] = []

async function options(overrides: Partial<HarnessProcessOptions> = {}): Promise<HarnessProcessOptions> {
  const port = await findFreeLoopbackPort(43200, 43300)
  return {
    executable: process.execPath,
    cliEntry: fixture,
    cwd: process.cwd(),
    host: '127.0.0.1',
    port,
    timeoutMs: 5_000,
    ...overrides,
  }
}

afterEach(async () => {
  await Promise.all(handles.splice(0).map(handle => handle.stop()))
})

describe('startHarnessProcess', () => {
  it('starts the child and waits for HTTP readiness', async () => {
    const config = await options()
    const handle = await startHarnessProcess(config)
    handles.push(handle)

    expect(handle.url).toBe(`http://127.0.0.1:${config.port}`)
    await expect(fetch(handle.url).then(response => response.text())).resolves.toBe('1')
  })

  it('reports an early child exit with captured diagnostics', async () => {
    const config = await options({ env: { FAKE_HARNESS_EXIT: '1' } })

    await expect(startHarnessProcess(config)).rejects.toThrow(
      /DeepSeek Harness exited before readiness \(code 23\).*requested early exit/s,
    )
  })

  it('reports the target URL when readiness times out', async () => {
    const config = await options({
      timeoutMs: 150,
      env: { FAKE_HARNESS_NO_LISTEN: '1' },
    })

    await expect(startHarnessProcess(config)).rejects.toThrow(
      `DeepSeek Harness did not become ready at http://127.0.0.1:${config.port}`,
    )
  })

  it('stops the child process idempotently', async () => {
    const handle = await startHarnessProcess(await options())
    handles.push(handle)

    await handle.stop()
    await handle.stop()

    expect(handle.child.exitCode ?? handle.child.signalCode).not.toBeNull()
  })
})

import { createServer, type Server } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { findFreeLoopbackPort } from '../src/port.js'

const servers: Server[] = []

async function listen(port: number): Promise<Server> {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })
  servers.push(server)
  return server
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error === undefined ? resolve() : reject(error))
  })
}

afterEach(async () => {
  await Promise.all(servers.splice(0).filter(server => server.listening).map(close))
})

describe('findFreeLoopbackPort', () => {
  it('returns the first port when it is available', async () => {
    await expect(findFreeLoopbackPort(43180, 43180)).resolves.toBe(43180)
  })

  it('skips an occupied loopback port', async () => {
    await listen(43181)
    await expect(findFreeLoopbackPort(43181, 43182)).resolves.toBe(43182)
  })

  it('reports when the complete range is occupied', async () => {
    await listen(43183)
    await listen(43184)
    await expect(findFreeLoopbackPort(43183, 43184)).rejects.toThrow(
      'No free loopback port in range 43183-43184',
    )
  })

  it('rejects invalid ranges before probing', async () => {
    await expect(findFreeLoopbackPort(3100, 3080)).rejects.toThrow('Invalid port range 3100-3080')
  })
})

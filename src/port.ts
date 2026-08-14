import { createServer } from 'node:net'

const LOOPBACK_HOST = '127.0.0.1'

async function canBindLoopback(port: number): Promise<boolean> {
  return await new Promise<boolean>((resolve, reject) => {
    const server = createServer()

    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
        resolve(false)
        return
      }
      reject(error)
    })

    server.listen(port, LOOPBACK_HOST, () => {
      server.close(error => error === undefined ? resolve(true) : reject(error))
    })
  })
}

export async function findFreeLoopbackPort(start: number, end: number): Promise<number> {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 65_535 || start > end) {
    throw new RangeError(`Invalid port range ${start}-${end}`)
  }

  for (let port = start; port <= end; port += 1) {
    if (await canBindLoopback(port)) return port
  }

  throw new Error(`No free loopback port in range ${start}-${end}`)
}

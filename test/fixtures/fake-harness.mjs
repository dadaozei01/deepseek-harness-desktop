import { createServer } from 'node:http'

function argument(name) {
  const index = process.argv.indexOf(name)
  if (index < 0 || process.argv[index + 1] === undefined) {
    throw new Error(`Missing ${name}`)
  }
  return process.argv[index + 1]
}

if (process.env.FAKE_HARNESS_EXIT === '1') {
  process.stderr.write('requested early exit\n')
  process.exit(23)
}

if (process.env.FAKE_HARNESS_NO_LISTEN === '1') {
  setInterval(() => {}, 1_000)
} else {
  const host = argument('--host')
  const port = Number(argument('--port'))
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.end(process.env.ELECTRON_RUN_AS_NODE ?? 'missing')
  })

  server.listen(port, host)
  process.on('SIGTERM', () => server.close(() => process.exit(0)))
  process.on('SIGINT', () => server.close(() => process.exit(0)))
}

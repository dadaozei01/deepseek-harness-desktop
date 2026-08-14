import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { pathToFileURL } from 'node:url'

export async function sha256(file) {
  const hash = createHash('sha256')
  await pipeline(createReadStream(file), hash)
  return hash.digest('hex')
}

export async function writeChecksums(files, destination) {
  const entries = files.map(file => ({ file, name: basename(file) }))
    .sort((left, right) => left.name.localeCompare(right.name, 'en'))

  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index - 1].name === entries[index].name) {
      throw new Error(`Duplicate filename: ${entries[index].name}`)
    }
  }

  const lines = []
  for (const entry of entries) {
    lines.push(`${await sha256(entry.file)}  ${entry.name}`)
  }
  await writeFile(destination, `${lines.join('\n')}\n`, 'utf8')
}

if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const args = process.argv.slice(2).filter(argument => argument !== '--')
  const [destination, ...files] = args
  if (destination === undefined || files.length === 0) {
    process.stderr.write('Usage: node scripts/checksum.mjs <destination> <file...>\n')
    process.exitCode = 2
  } else {
    await writeChecksums(files, destination)
    process.stdout.write(`Wrote checksums for ${files.length} file(s): ${destination}\n`)
  }
}

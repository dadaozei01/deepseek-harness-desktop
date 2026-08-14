import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const TEXT_LIMIT = 1024 * 1024
const CREDENTIAL_PATTERN = /(?:OPENAI|DEEPSEEK|ANTHROPIC|GITHUB)_(?:API_KEY|TOKEN)\s*=|\bsk-[A-Za-z0-9_-]{12,}/u
const STATIC_DEEPSEEK_IMPORT_PATTERNS = [
  /\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"](@deepseek-ai\/[^/'"]+)(?:\/[^'"]*)?['"]/gu,
  /\bimport\s*\(\s*['"](@deepseek-ai\/[^/'"]+)(?:\/[^'"]*)?['"]\s*\)/gu,
  /\brequire\s*\(\s*['"](@deepseek-ai\/[^/'"]+)(?:\/[^'"]*)?['"]\s*\)/gu,
]
const REQUIRED_RUNTIME_PEERS = [
  '@deepseek-ai/dsh-anonymous-user-id',
  '@deepseek-ai/dsh-atomic-write',
  '@deepseek-ai/dsh-bash-local',
  '@deepseek-ai/dsh-code-runtime',
  '@deepseek-ai/dsh-compaction',
  '@deepseek-ai/dsh-fs',
  '@deepseek-ai/dsh-output-retention',
  '@deepseek-ai/dsh-sandbox',
  '@deepseek-ai/dsh-scope',
  '@deepseek-ai/dsh-session-telemetry',
  '@deepseek-ai/dsh-session-title-llm',
  '@deepseek-ai/dsh-shell',
  '@deepseek-ai/dsh-spill',
  '@deepseek-ai/dsh-subagent-in-process-driver',
  '@deepseek-ai/dsh-subprocess',
  '@deepseek-ai/dsh-timeout',
  '@deepseek-ai/dsh-workflow',
]

async function walk(root) {
  const output = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const full = join(root, entry.name)
    output.push(full)
    if (entry.isDirectory()) output.push(...await walk(full))
  }
  return output
}

function normalizedRelative(root, target) {
  return relative(root, target).split(sep).join('/')
}

function hasPath(paths, suffix) {
  return paths.some(path => path.endsWith(suffix))
}

export async function verifyPackage(root) {
  const rootStats = await stat(root)
  if (!rootStats.isDirectory()) throw new Error(`Package path is not a directory: ${root}`)

  const paths = await walk(root)
  const relativePaths = paths.map(path => normalizedRelative(root, path))

  if (!hasPath(relativePaths, 'resources/app.asar.unpacked/node_modules/@deepseek-ai/dsh/lib/bin.js')) {
    throw new Error('Missing packaged dsh CLI')
  }
  if (!hasPath(relativePaths, 'resources/app.asar.unpacked/node_modules/@deepseek-ai/cordis-plugin-group/package.json')) {
    throw new Error('Missing packaged Cordis group plugin')
  }
  for (const dependency of REQUIRED_RUNTIME_PEERS) {
    if (!hasPath(relativePaths, `resources/app.asar.unpacked/node_modules/${dependency}/package.json`)) {
      throw new Error(`Missing packaged runtime peer: ${dependency}`)
    }
  }

  const packagedModulePrefix = 'resources/app.asar.unpacked/node_modules/'
  for (const path of paths) {
    const rel = normalizedRelative(root, path)
    if (!rel.startsWith(packagedModulePrefix) || !/\.(?:c?js|mjs)$/u.test(rel)) continue
    if (!(await stat(path)).isFile()) continue
    const content = await readFile(path, 'utf8')
    for (const pattern of STATIC_DEEPSEEK_IMPORT_PATTERNS) {
      for (const match of content.matchAll(pattern)) {
        const dependency = match[1]
        if (!hasPath(relativePaths, `${packagedModulePrefix}${dependency}/package.json`)) {
          throw new Error(`Missing packaged static import: ${dependency} (imported by ${rel})`)
        }
      }
    }
  }
  if (!hasPath(relativePaths, 'resources/app.asar.unpacked/node_modules/@deepseek-ai/dsh-web-frontend/package.json')) {
    throw new Error('Missing packaged DeepSeek Harness Web UI')
  }
  if (!relativePaths.some(path => path.endsWith('.node'))) {
    throw new Error('Missing packaged native Node modules')
  }
  if (!relativePaths.some(path => /(?:\.exe$|\.app\/Contents\/MacOS\/[^/]+$)/u.test(path))) {
    throw new Error('Missing packaged application executable')
  }

  const forbidden = relativePaths.find(path => {
    const segments = path.split('/')
    if (segments.includes('.git')) return true
    if (segments[0] === 'test' || segments[0] === 'work' || segments[0] === 'outputs') return true
    return basename(path) === '.env'
  })
  if (forbidden !== undefined) throw new Error(`Forbidden packaged path: ${forbidden}`)

  for (const path of paths) {
    const rel = normalizedRelative(root, path)
    if (rel.includes('/node_modules/') || rel.startsWith('resources/app.asar.unpacked/node_modules/')) continue
    const fileStats = await stat(path)
    if (!fileStats.isFile() || fileStats.size > TEXT_LIMIT) continue
    const content = await readFile(path, 'utf8').catch(() => '')
    if (CREDENTIAL_PATTERN.test(content)) throw new Error(`Credential-shaped content found in ${rel}`)
  }
}

if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const target = process.argv.slice(2).find(argument => argument !== '--')
  if (target === undefined) {
    process.stderr.write('Usage: node scripts/verify-package.mjs <unpacked-directory>\n')
    process.exitCode = 2
  } else {
    await verifyPackage(target)
    process.stdout.write(`Verified package: ${target}\n`)
  }
}

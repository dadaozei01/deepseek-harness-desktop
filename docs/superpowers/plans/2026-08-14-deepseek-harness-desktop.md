# DeepSeek Harness Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish install-ready Windows x64, macOS arm64, and macOS x64 desktop distributions that bundle the official DeepSeek Harness runtime.

**Architecture:** A small Electron main process launches the pinned `@deepseek-ai/dsh` CLI as a child process with `ELECTRON_RUN_AS_NODE=1`, binds it to a loopback-only free port, waits for readiness, and displays the local Web UI in a hardened `BrowserWindow`. Electron Builder packages the app and production dependencies; GitHub Actions builds each architecture on a native runner and publishes checksummed assets from version tags.

**Tech Stack:** Node.js 22, TypeScript, Electron 35, `@deepseek-ai/dsh` 0.1.0-rc.6, Vitest, pnpm 11, electron-builder, GitHub Actions.

## Global Constraints

- The repository is `dadaozei01/deepseek-harness-desktop` and is public under MIT.
- The application is an unofficial desktop distribution and must link to `deepseek-ai/deepseek-harness`.
- Runtime HTTP binding is restricted to `127.0.0.1`.
- Port selection checks 3080 through 3100 inclusive.
- The renderer uses `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`.
- Installers bundle runtime dependencies and never run npm/pnpm installation on the user's computer.
- First release targets Windows x64, macOS arm64, and macOS x64 only.
- First release is unsigned and has no automatic updater.
- No API keys, GitHub tokens, or model credentials may be logged or committed.

---

### Task 1: Project foundation and deterministic port selection

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/port.ts`
- Create: `test/port.test.ts`

**Interfaces:**
- Produces: `findFreeLoopbackPort(start: number, end: number): Promise<number>`.
- Produces: package scripts `build`, `test`, `typecheck`, `pack:dir`, `dist:win`, `dist:mac:arm64`, and `dist:mac:x64`.

- [ ] **Step 1: Add the package manifest and pinned toolchain**

Create a private ESM package named `deepseek-harness-desktop` at version `0.1.0`. Pin `@deepseek-ai/dsh` to `0.1.0-rc.6`, Electron to the selected 35.x patch, and pnpm to 11.7.0. Add TypeScript, Vitest, Electron Builder, and Node type dependencies. Add `engines.node: ">=22"` and exact scripts listed in the interface.

Start from this manifest contract:

```json
{
  "name": "deepseek-harness-desktop",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/main.js",
  "packageManager": "pnpm@11.7.0",
  "engines": { "node": ">=22" },
  "dependencies": { "@deepseek-ai/dsh": "0.1.0-rc.6" },
  "devDependencies": {
    "@types/node": "22.20.0",
    "electron": "35.7.0",
    "electron-builder": "26.0.12",
    "typescript": "6.0.3",
    "vitest": "3.2.4",
    "yaml": "2.8.1"
  }
}
```

- [ ] **Step 2: Write failing port-selection tests**

Test that the function returns 3080 when free, skips an occupied 3080 and returns 3081, and rejects with `No free loopback port in range 3080-3100` when the full supplied range is occupied. Allocate real loopback test servers and close them in `finally` blocks.

```ts
it('skips an occupied loopback port', async () => {
  const occupied = await listenOn(3080)
  try {
    await expect(findFreeLoopbackPort(3080, 3081)).resolves.toBe(3081)
  } finally {
    await closeServer(occupied)
  }
})
```

- [ ] **Step 3: Run the focused test and confirm failure**

Run: `pnpm exec vitest run test/port.test.ts`

Expected: FAIL because `src/port.ts` does not export `findFreeLoopbackPort`.

- [ ] **Step 4: Implement deterministic loopback probing**

Use `node:net.createServer()`, bind explicitly to `127.0.0.1`, close each successful probe before returning, and retry only address-in-use failures. Reject invalid ranges before probing.

```ts
export async function findFreeLoopbackPort(start: number, end: number): Promise<number> {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 65535 || start > end) {
    throw new RangeError(`Invalid port range ${start}-${end}`)
  }
  for (let port = start; port <= end; port += 1) {
    if (await canBindLoopback(port)) return port
  }
  throw new Error(`No free loopback port in range ${start}-${end}`)
}
```

- [ ] **Step 5: Verify and commit**

Run: `pnpm exec vitest run test/port.test.ts && pnpm run typecheck`

Expected: all port tests pass and TypeScript exits zero.

Commit: `feat: add desktop project foundation`

---

### Task 2: Harness child-process lifecycle and readiness

**Files:**
- Create: `src/harness-process.ts`
- Create: `test/harness-process.test.ts`
- Create: `test/fixtures/fake-harness.mjs`

**Interfaces:**
- Produces: `HarnessProcessOptions` with `executable`, `cliEntry`, `cwd`, `host`, `port`, `timeoutMs`, and optional `env`.
- Produces: `startHarnessProcess(options): Promise<HarnessHandle>`.
- Produces: `HarnessHandle` with `url: string`, `child: ChildProcess`, and `stop(): Promise<void>`.

- [ ] **Step 1: Write a controllable fake Harness fixture**

The fixture accepts `--host` and `--port`, starts an HTTP server that returns 200, supports an environment flag that exits immediately with code 23, and shuts down on `SIGTERM`.

```js
if (process.env.FAKE_HARNESS_EXIT === '1') process.exit(23)
const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/plain' })
  response.end('ready')
})
server.listen(port, host)
process.on('SIGTERM', () => server.close(() => process.exit(0)))
```

- [ ] **Step 2: Write failing lifecycle tests**

Cover successful readiness, exact URL generation, child environment containing `ELECTRON_RUN_AS_NODE=1`, early child exit reporting `DeepSeek Harness exited before readiness (code 23)`, timeout reporting the target URL, and idempotent `stop()`.

```ts
const handle = await startHarnessProcess(fixtureOptions(port))
expect(handle.url).toBe(`http://127.0.0.1:${port}`)
await handle.stop()
await handle.stop()
expect(handle.child.exitCode).not.toBeNull()
```

- [ ] **Step 3: Run the focused test and confirm failure**

Run: `pnpm exec vitest run test/harness-process.test.ts`

Expected: FAIL because the lifecycle module does not exist.

- [ ] **Step 4: Implement child startup, polling, diagnostics, and shutdown**

Spawn `process.execPath` with the resolved CLI entry followed by `--profile web --host <host> --port <port>`. Set `ELECTRON_RUN_AS_NODE=1`. Capture bounded stdout/stderr tails for startup diagnostics without logging environment variables. Poll the loopback URL until an HTTP response below 500, the child exits, or timeout occurs. On Windows, use `taskkill /PID <pid> /T /F` only as a fallback after graceful termination fails; on macOS, terminate the process group created for the child.

```ts
const child = spawn(options.executable, [
  options.cliEntry,
  '--profile', 'web',
  '--host', options.host,
  '--port', String(options.port),
], {
  cwd: options.cwd,
  detached: process.platform !== 'win32',
  env: { ...process.env, ...options.env, ELECTRON_RUN_AS_NODE: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
```

- [ ] **Step 5: Verify and commit**

Run: `pnpm exec vitest run test/harness-process.test.ts && pnpm run typecheck`

Expected: all lifecycle tests pass and no child process remains after the suite.

Commit: `feat: manage bundled harness lifecycle`

---

### Task 3: Hardened Electron application shell

**Files:**
- Create: `src/paths.ts`
- Create: `src/window.ts`
- Create: `src/main.ts`
- Create: `test/paths.test.ts`
- Create: `test/window.test.ts`

**Interfaces:**
- Produces: `resolveDshCliEntry(appPath: string, resourcesPath: string, packaged: boolean): string`.
- Produces: `browserWindowOptions(): BrowserWindowConstructorOptions`.
- Produces: `isAllowedLocalNavigation(url: string, expectedOrigin: string): boolean`.

- [ ] **Step 1: Write failing path and security tests**

Test development and packaged CLI resolution, missing CLI errors, exact Electron security flags, and navigation policy that permits only the selected localhost origin. Test that external HTTPS links are classified for system-browser handling and `file:`, `javascript:`, and foreign localhost ports are denied.

```ts
expect(browserWindowOptions().webPreferences).toEqual({
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
})
expect(isAllowedLocalNavigation('http://127.0.0.1:3080/a', 'http://127.0.0.1:3080')).toBe(true)
expect(isAllowedLocalNavigation('http://127.0.0.1:3081/a', 'http://127.0.0.1:3080')).toBe(false)
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `pnpm exec vitest run test/paths.test.ts test/window.test.ts`

Expected: FAIL because the path and window modules do not exist.

- [ ] **Step 3: Implement packaged path resolution**

In development, resolve `node_modules/@deepseek-ai/dsh/lib/bin.js`. In a packaged app, resolve the same entry under `process.resourcesPath/app.asar.unpacked/node_modules`. Throw an error that includes every checked path when no CLI entry exists.

```ts
export function resolveDshCliEntry(appPath: string, resourcesPath: string, packaged: boolean): string {
  const candidates = packaged
    ? [join(resourcesPath, 'app.asar.unpacked', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')]
    : [join(appPath, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')]
  const found = candidates.find(existsSync)
  if (found === undefined) throw new Error(`Unable to locate dsh CLI; checked: ${candidates.join(', ')}`)
  return found
}
```

- [ ] **Step 4: Implement the BrowserWindow policy**

Return options with width 1400, height 900, minimum 800x600, hidden menu bar, `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`. Install `will-navigate` and `setWindowOpenHandler` guards: allow only the active local origin in-app and open allowed external HTTP/HTTPS URLs through `shell.openExternal`.

```ts
export function browserWindowOptions(): BrowserWindowConstructorOptions {
  return {
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  }
}
```

- [ ] **Step 5: Implement main-process orchestration**

On `app.whenReady()`, select a free port, start Harness, create the window only after readiness, and show a native error dialog on startup failure. On `before-quit`, stop the child once. On Windows and Linux, quit after all windows close; on macOS, recreate the window on activate only while the Harness process is healthy.

- [ ] **Step 6: Verify and commit**

Run: `pnpm test && pnpm run typecheck && pnpm run build`

Expected: all tests pass and `dist/main.js` plus supporting compiled modules exist.

Commit: `feat: add hardened electron shell`

---

### Task 4: Reproducible offline packaging

**Files:**
- Create: `electron-builder.yml`
- Create: `scripts/verify-package.mjs`
- Create: `test/package-config.test.ts`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: Electron Builder configuration for `nsis` and `dmg` targets.
- Produces: `pnpm run verify:package -- <artifact-or-unpacked-directory>`.

- [ ] **Step 1: Write failing packaging-policy tests**

Parse `electron-builder.yml` and assert the app ID is `com.dadaozei01.deepseekharnessdesktop`, product name is `DeepSeek Harness Desktop`, `asar` is enabled, native modules and the dsh package tree are unpacked, Windows targets x64 NSIS, and macOS targets arm64/x64 DMG with signing autodiscovery disabled.

```ts
const config = parse(await readFile('electron-builder.yml', 'utf8')) as BuilderConfig
expect(config.appId).toBe('com.dadaozei01.deepseekharnessdesktop')
expect(config.asar).toBe(true)
expect(config.mac?.identity).toBeNull()
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `pnpm exec vitest run test/package-config.test.ts`

Expected: FAIL because `electron-builder.yml` does not exist.

- [ ] **Step 3: Add Electron Builder configuration**

Package only compiled application files, production dependencies, licenses, and package metadata. Enable `asar`, unpack `.node` binaries plus the `@deepseek-ai/dsh` dependency closure needed by the CLI, disable automatic signing discovery, and use stable artifact names containing version, platform, and architecture. Configure NSIS per-user installation and DMG application layout.

```yaml
appId: com.dadaozei01.deepseekharnessdesktop
productName: DeepSeek Harness Desktop
asar: true
asarUnpack:
  - node_modules/**/*.node
  - node_modules/@deepseek-ai/**
files:
  - dist/**
  - node_modules/**
  - package.json
win:
  target: [{ target: nsis, arch: [x64] }]
  artifactName: DeepSeek-Harness-Desktop-${version}-Windows-${arch}.${ext}
mac:
  target: [{ target: dmg, arch: [arm64, x64] }]
  identity: null
  artifactName: DeepSeek-Harness-Desktop-${version}-macOS-${arch}.${ext}
```

- [ ] **Step 4: Add package verification**

The verification script must fail if the packaged CLI entry, Web UI package, Electron executable, or required native `.node` modules are missing. It must also fail if a package contains `.git`, tests, source maps, the development `work/` tree, or credentials matching `sk-` and common token variable names.

- [ ] **Step 5: Build and smoke-check the Windows unpacked app**

Run: `pnpm run pack:dir`

Run: `pnpm run verify:package -- release/win-unpacked`

Launch the unpacked executable with a temporary Harness home, wait for the loopback service, then close it and verify the process tree exits. Do not enter a model API key during this smoke test.

- [ ] **Step 6: Verify and commit**

Run: `pnpm test && pnpm run typecheck && pnpm run build && pnpm run pack:dir`

Expected: tests pass and a verified self-contained Windows unpacked directory is produced.

Commit: `build: add offline desktop packaging`

---

### Task 5: Cross-platform CI, checksums, and tagged releases

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`
- Create: `scripts/checksum.mjs`
- Create: `test/checksum.test.ts`

**Interfaces:**
- Produces: `writeChecksums(files: string[], destination: string): Promise<void>` with sorted SHA-256 lines in `<hash>  <filename>` format.
- Produces: CI artifacts for Windows x64, macOS arm64, and macOS x64.

- [ ] **Step 1: Write failing checksum tests**

Create two temporary fixture files, verify deterministic lexical ordering, lowercase 64-character hashes, filenames without absolute paths, and rejection when an input file is missing.

```ts
await writeChecksums([secondPath, firstPath], outputPath)
const lines = (await readFile(outputPath, 'utf8')).trim().split('\n')
expect(lines.map(line => line.slice(66))).toEqual(['first.bin', 'second.bin'])
expect(lines.every(line => /^[a-f0-9]{64}  [^/\\]+$/u.test(line))).toBe(true)
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `pnpm exec vitest run test/checksum.test.ts`

Expected: FAIL because `scripts/checksum.mjs` does not exist.

- [ ] **Step 3: Implement deterministic checksum generation**

Stream file contents through Node's SHA-256 hash, sort by basename, reject duplicate basenames, and write UTF-8 with LF line endings.

```js
export async function sha256(file) {
  const hash = createHash('sha256')
  await pipeline(createReadStream(file), hash)
  return hash.digest('hex')
}
```

- [ ] **Step 4: Add pull-request CI**

Use Node 22 and Corepack/pnpm 11.7.0. Run install with the frozen lockfile, tests, typecheck, and build on `windows-latest`, `macos-15`, and `macos-15-intel`. On each runner, build only its native architecture and upload the result as a workflow artifact. Print `process.arch` and fail if it does not match the expected matrix architecture.

```yaml
strategy:
  matrix:
    include:
      - runner: windows-latest
        arch: x64
        command: pnpm run dist:win
      - runner: macos-15
        arch: arm64
        command: pnpm run dist:mac:arm64
      - runner: macos-15-intel
        arch: x64
        command: pnpm run dist:mac:x64
```

- [ ] **Step 5: Add tag-triggered release workflow**

Trigger on `v*` tags. Build Windows x64 on `windows-latest`, macOS arm64 on `macos-15`, and macOS x64 on `macos-15-intel`. Download build artifacts into a clean release job, generate `SHA256SUMS.txt`, verify every expected asset exists exactly once, and publish with `softprops/action-gh-release` using the repository-scoped `GITHUB_TOKEN` and `contents: write` permission.

- [ ] **Step 6: Validate workflow syntax and commit**

Run the test suite and parse both workflow YAML files. Confirm permissions are minimal and no secrets other than `GITHUB_TOKEN` are referenced.

Commit: `ci: build and publish desktop installers`

---

### Task 6: User documentation, licensing, and release readiness

**Files:**
- Create: `README.md`
- Create: `README.zh-CN.md`
- Create: `LICENSE`
- Create: `THIRD_PARTY_NOTICES.md`
- Create: `SECURITY.md`
- Create: `docs/INSTALL_WINDOWS.md`
- Create: `docs/INSTALL_MACOS.md`
- Create: `docs/RELEASING.md`
- Create: `test/docs.test.ts`

**Interfaces:**
- Produces: complete end-user installation and unsigned-app guidance.
- Produces: maintainer release procedure using version tags.

- [ ] **Step 1: Write failing documentation checks**

Require both READMEs to state “Unofficial desktop distribution”, link the official upstream repository, state the bundled Harness version, document local data under `.dsh`, and avoid claiming official endorsement. Require platform guides to name all expected artifacts and explain Windows SmartScreen and macOS right-click Open without automated Gatekeeper bypass commands.

```ts
for (const readme of ['README.md', 'README.zh-CN.md']) {
  const text = await readFile(readme, 'utf8')
  expect(text).toContain('deepseek-ai/deepseek-harness')
  expect(text).toContain('0.1.0-rc.6')
  expect(text).toContain('.dsh')
}
expect(await readFile('docs/INSTALL_MACOS.md', 'utf8')).not.toContain('xattr -dr')
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `pnpm exec vitest run test/docs.test.ts`

Expected: FAIL because the documentation files do not exist.

- [ ] **Step 3: Write bilingual user documentation**

Document supported systems, installation, initial model configuration, workspace selection, data location, uninstall behavior, troubleshooting, checksum verification, and the unsigned first-release limitation. State that API keys remain in Harness-managed local configuration and are not handled by the wrapper.

- [ ] **Step 4: Add licensing and security policy**

Use the MIT license for wrapper code, preserve DeepSeek Harness attribution, summarize third-party licensing responsibilities, and direct vulnerability reports to GitHub private security advisories without publishing credentials.

- [ ] **Step 5: Add the release runbook**

Document version bumping, upstream dependency update, frozen-lockfile refresh, local Windows validation, tag creation, Actions monitoring, checksum verification, and Release download testing on a clean Windows machine and both Mac architectures when available.

- [ ] **Step 6: Run the full pre-publish gate and commit**

Run: `pnpm test && pnpm run typecheck && pnpm run build && pnpm run pack:dir && pnpm run verify:package -- release/win-unpacked`

Expected: every command exits zero.

Commit: `docs: add installation and release guidance`

---

### Task 7: Create the public GitHub repository and publish the first release candidate

**Files:**
- Modify: `package.json`
- Modify: lockfile if the final desktop version changes

**Interfaces:**
- Produces: public repository `dadaozei01/deepseek-harness-desktop`.
- Produces: remote `origin`, pushed `main`, and tag `v0.1.0`.
- Produces: GitHub Release with Windows x64, macOS arm64, macOS x64, and `SHA256SUMS.txt` assets.

- [ ] **Step 1: Restore GitHub CLI authentication**

Run: `gh auth status`

```powershell
gh auth status
```

Expected: authenticated as `dadaozei01`. If invalid, the user runs `gh auth login -h github.com`; never request, store, or print a token in chat or repository files.

- [ ] **Step 2: Inspect the exact publish scope**

Run: `git status -sb`, `git log --oneline --decorate -10`, and `git diff main...HEAD` when applicable. Confirm `work/`, `outputs/`, installers, API keys, caches, and local Harness data are not tracked.

```powershell
git status -sb
git log --oneline --decorate -10
git ls-files | rg '(^work/|^outputs/|\.dsh/|\.env$)'
```

- [ ] **Step 3: Create and push the public repository**

Run: `gh repo create dadaozei01/deepseek-harness-desktop --public --source . --remote origin --push`

```powershell
gh repo create dadaozei01/deepseek-harness-desktop --public --source . --remote origin --push
```

Expected: `main` is visible publicly and the remote URL points to the requested repository.

- [ ] **Step 4: Verify repository Actions settings**

Confirm Actions are enabled and workflow `GITHUB_TOKEN` can write repository contents for tagged releases. Keep all other permissions read-only.

- [ ] **Step 5: Tag the first release**

Run the full gate once more, create annotated tag `v0.1.0`, and push the tag. Do not create the tag when any required test or Windows package verification fails.

- [ ] **Step 6: Monitor builds and verify release assets**

Wait for Windows x64, macOS arm64, and macOS x64 jobs. Download or inspect all four expected assets, verify `SHA256SUMS.txt`, check published filenames and sizes, and confirm the Release notes state the bundled DeepSeek Harness version and unsigned-app limitation.

- [ ] **Step 7: Record final evidence**

Report repository URL, commit, tag, workflow run URL, Release URL, asset names, SHA-256 verification result, and any unsigned-launch steps still required for the home Mac.

Commit only if release verification produces a necessary documentation correction; otherwise leave `v0.1.0` pointing at the already verified commit.

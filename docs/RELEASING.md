# Release Runbook

This procedure publishes native Windows x64, macOS arm64, and macOS x64 installers from a version tag.

## 1. Prepare the version

1. Confirm the intended desktop version and pinned `@deepseek-ai/dsh` version.
2. Update `package.json`, the lockfile, READMEs, installation filenames, and Release notes together.
3. Review upstream license, native dependency, and breaking-change notes.
4. Confirm `git status --short` contains no `.env`, `.dsh`, `work/`, `outputs/`, local installers, or credentials.

For this hotfix release, the desktop tag is `v0.1.1` and the bundled Harness version is `0.1.0-rc.6`.

## 2. Install reproducibly

Use Node.js 22 and pnpm 11.7.0:

```bash
pnpm install --frozen-lockfile
```

Do not release after an unlocked dependency refresh unless the lockfile diff has been reviewed.

## 3. Run the local gate

```bash
pnpm test
pnpm run typecheck
pnpm run build
```

On Windows x64, also run:

```powershell
pnpm run pack:dir
pnpm run verify:package -- release\win-unpacked
```

Launch the unpacked EXE, confirm the Harness UI responds on `127.0.0.1`, then close it and confirm the process tree exits. Do not enter a real API key during release smoke tests.

## 4. Commit and tag

```bash
git status -sb
git log --oneline --decorate -10
gh auth status
git tag -a v0.1.1 -m "DeepSeek Harness Desktop v0.1.1"
git push origin main
git push origin v0.1.1
```

Never move or recreate a published version tag. If the gate fails, fix and retest before tagging.

## 5. Monitor native builds

The Release workflow must succeed on:

- `windows-latest` / x64
- `macos-15` / arm64
- `macos-15-intel` / x64

Use the GitHub Actions page or `gh run watch`. The final job must publish exactly three installers plus `SHA256SUMS.txt`.

## 6. Verify the published release

1. Download all Release assets into a clean directory.
2. Verify every line in `SHA256SUMS.txt`.
3. Confirm filenames, versions, architectures, and non-zero sizes.
4. Test Windows installation and SmartScreen guidance on a clean Windows machine.
5. Test each DMG on its matching Mac architecture, including the documented right-click Open flow.
6. Confirm install, first launch, workspace selection, graceful quit, relaunch, and uninstall behavior.

Record the commit SHA, tag, Actions run URL, Release URL, asset names, and checksum result in the release handoff.

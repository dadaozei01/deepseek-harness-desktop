<p align="center">
  <img src="build/deepseek-logo-source.png" alt="DeepSeek logo" width="240">
</p>

# DeepSeek Harness Desktop

[简体中文](README.zh-CN.md)

An unofficial desktop distribution of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) for Windows and macOS. It bundles DeepSeek Harness `0.1.0-rc.6` with Electron, so end users do not need to install Node.js, pnpm, or source-code dependencies.

This wrapper is maintained independently and is not an official DeepSeek product. DeepSeek Harness itself remains a developer preview and may introduce breaking changes.

## Downloads

Download the installer and `SHA256SUMS.txt` from [GitHub Releases](https://github.com/dadaozei01/deepseek-harness-desktop/releases):

- Windows 10/11 x64: `DeepSeek-Harness-Desktop-0.1.1-Windows-x64.exe`
- Apple Silicon Mac: `DeepSeek-Harness-Desktop-0.1.1-macOS-arm64.dmg`
- Intel Mac: `DeepSeek-Harness-Desktop-0.1.1-macOS-x64.dmg`

The release is unsigned. Follow the safe platform-specific steps in [Windows installation](docs/INSTALL_WINDOWS.md) or [macOS installation](docs/INSTALL_MACOS.md).

## What this repository adds

The [upstream repository](https://github.com/deepseek-ai/deepseek-harness) contains the official Harness CLI, Web UI, plugins, and development source. This repository adds only:

- a small hardened Electron window;
- automatic loopback-only startup on `127.0.0.1`;
- pinned, bundled runtime dependencies;
- Windows and macOS installers;
- native-architecture CI builds and SHA-256 checksums.

It does not fork or replace the upstream Harness business logic.

## First run

1. Install and launch the application.
2. Configure a supported model provider in the Harness settings UI.
3. Select or create a workspace and start a conversation.

Model credentials are stored by Harness in its local configuration. The Electron wrapper does not read, upload, or log API keys.

## Local data and privacy

Harness normally stores user configuration, credentials, sessions, and related state under `.dsh` in the user's home directory:

- Windows: `%USERPROFILE%\.dsh`
- macOS: `$HOME/.dsh`

Uninstalling the desktop application does not automatically delete this data. Back up or remove it separately when required. The local Web UI binds only to `127.0.0.1`; it is not exposed to the LAN.

## Build from source

Requirements: Node.js 22+, pnpm 11.7.0, and the native operating system for the target installer.

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run typecheck
pnpm run build
```

Build a native installer:

```bash
pnpm run dist:win
pnpm run dist:mac:arm64
pnpm run dist:mac:x64
```

macOS arm64 and x64 releases are built on native GitHub-hosted runners. See [RELEASING.md](docs/RELEASING.md) for the complete release gate.

## License and security

Wrapper code is available under the [MIT License](LICENSE). Bundled projects retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Report security issues through the private process in [SECURITY.md](SECURITY.md), never in a public issue with credentials attached.

# Security Policy

## Supported versions

Security fixes are provided for the latest `0.1.x` release of this desktop wrapper. The bundled Harness is a developer preview; upstream defects may require a dependency update.

## Report a vulnerability privately

Use a private GitHub security advisory:

https://github.com/dadaozei01/deepseek-harness-desktop/security/advisories/new

Include the affected version, operating system and architecture, reproduction steps, and impact. Remove API keys, access tokens, personal workspace content, and `.dsh` data before attaching logs or screenshots.

Do not open a public issue for an unpatched vulnerability. For a defect in the official Harness rather than this packaging wrapper, coordinate with the upstream project after avoiding premature public disclosure.

## Scope

Relevant reports include unintended non-loopback exposure, unsafe navigation from the local Web UI, credential leakage introduced by the wrapper, installer tampering, and process-lifecycle flaws. Provider availability, model output quality, and upstream feature requests are not wrapper security vulnerabilities.

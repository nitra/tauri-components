---
type: Rust Module
title: main.rs
resource: plugin-dev-cli/src/main.rs
docgen:
  crc: pending
---

## Огляд

CLI `nitra-plugin`: keygen (OS keychain), validate, package/sign, verify, install з `--tofu-accept`. Private keys у keychain service `nitra-plugin-dev`; public trust — у app-data.

## Поведінка

1. `keygen` створює Ed25519 пару і зберігає secret у OS keychain.
2. `package` пакує staging і пише companion `.pub`.
3. `install --tofu-accept` довіряє новий ключ і копіює payload у registry.

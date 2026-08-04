---
type: Rust Module
title: lib.rs
resource: plugin-package/src/lib.rs
docgen:
  crc: pending
---

## Огляд

Збирає zip `.n-plugin`, рахує checksums, підписує Ed25519, верифікує і встановлює в local registry з TOFU. Unsigned пакети дозволені лише з `allow_unsigned` (debug).

## Публічний API

- `pack_directory` — staging → signed/unsigned archive
- `verify_package` — layout + checksum + signature
- `install_package` — trust + compatibility + registry write
- `generate_keypair` / `sign_checksums` — crypto helpers

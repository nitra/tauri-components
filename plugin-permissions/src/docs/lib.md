---
type: Rust Module
title: lib.rs
resource: plugin-permissions/src/lib.rs
docgen:
  crc: pending
---

## Огляд

Локальний TOFU trust store для Ed25519 public keys publisher і grant store для capability+scope. Grants привʼязані до `plugin_id` і переживають version bump до escalation; uninstall робить purge.

## Публічний API

- `TrustStore` — trust / require_trusted / is_trusted
- `GrantStore` — grant / check / purge_plugin
- `Scope` — formal capability scope object

---
type: Rust Module
title: lib.rs
resource: plugin-manifest/src/lib.rs
docgen:
  crc: pending
---

## Огляд

Парсить і валідовує `plugin.toml` для пакетів `.n-plugin`: A2UI pin v1.0, SemVer ranges, capabilities і surfaces. Host відхиляє install при несумісності або MVP-заборонених scopes.

## Публічний API

- `PluginManifest::parse` / `from_path` — читання маніфесту
- `validate` — структурні інваріанти
- `check_compatibility` — SemVer проти host platform/domain versions

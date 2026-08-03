---
type: Rust Module
title: lib.rs
resource: plugin-runtime/src/lib.rs
docgen:
  crc: pending
---

## Огляд

Wasmtime runtime для nitra-плагінів: shared Engine, per-invocation Store, fuel/epoch/memory limits, concurrency cap, nested-invocation guard і circuit breaker. M2 — core Wasm з exports `activate`/`deactivate`/`ping` (див. `wit/plugin.wit`); Component Model — у M3.

## Публічний API

- `PluginRuntime::new` / `load_wat` / `load_wasm` / `activate` / `deactivate` / `ping` / `invoke`
- `ResourceLimits` — placeholders 32MiB / 50M fuel / 2s / 2 concurrent
- Benchmark constants `BENCHMARK_COLD_P95_MS` / `BENCHMARK_WARM_P95_MS`

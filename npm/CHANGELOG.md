# Changelog

## [0.6.0] - 2026-06-22

### Changed

- Додано пропс promptHint до AgentDialog.vue

## [0.5.0] - 2026-06-19

### Added

- testing subpath (mountQuasar/mountWithQuasar vitest helpers); omlx model listing (listOmlxModels/resolveModel) + a model dropdown in AgentDialog populated from the server

## [0.4.1] - 2026-06-19

### Fixed

- useOmlx no longer crashes when localStorage is unavailable (component tests / SSR) — guarded reads/writes

## [0.4.0] - 2026-06-19

### Added

- createDispatch preserves a backend error.kind on the io envelope; useAgent accepts a transport override (route some tools to JS/OPFS handlers)

## [0.3.0] - 2026-06-16

### Changed

- Винесено логіку відображення статусу в StatePill компонент

## [0.2.0] - 2026-06-16

### Changed

- journal/omlx commands now invoked as plugin:agent|* — apps must register tauri-plugin-agent and grant agent:default

## [0.1.1] - 2026-06-16

### Fixed

- npm provenance: add repository metadata so publish passes sigstore validation

## [0.1.0] - 2026-06-16

### Added

- LLM agent engine (createAgentKit, scoped tool surface) + Vue/Quasar UI (AgentDialog, AuditDialog) for Tauri apps
